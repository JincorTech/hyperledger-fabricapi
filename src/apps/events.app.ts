import { Cache } from 'lru-cache';

import { TimeoutPromise } from '../helpers/timer';
import { MspProvider } from '../services/fabric/msp.service';
import config from '../config';
import { Logger } from '../logger';
import { EventHub } from '../services/fabric/eventhub.service';
import { MessageQueue } from '../services/mq/interfaces';
import { MessageQueueType } from '../services/mq/natsmq.service';
import { FabricClientService } from '../services/fabric/client.service';
import { IdentificationService } from '../services/security/interfaces';
import { IdentificationServiceType } from '../services/security/identification.service';
import metrics from '../services/metrics';
import { MetricsService } from '../services/metrics/metrics.service';
import * as lru from 'lru-cache';

export class EventsFabricApplication {
  private logger = Logger.getInstance('EVENTS-FABRIC');
  private fabricEvents: EventHub[][] = [[], []];
  private metricsService = new MetricsService();
  private groupSwitcher: number = 0;
  private deduplicateCache: lru;

  constructor(
    private identService: IdentificationService,
    private mqService: MessageQueue,
    private interval: number = config.events.resetHubInterval
  ) {
    this.deduplicateCache = lru<string, number>({
      maxAge: 10000, // only for blink switch interval
      max: 1 << 16
    });
  }

  /**
   * This is dirty trick to get fresh events hub.
   */
  runInBlinkMode() {
    this.logger.verbose('Run in blink mode');
    const blinkMethod = async() => {
      try {
        this.groupSwitcher = ~~!this.groupSwitcher;
        await this.startListenEvents(this.groupSwitcher);
        await new TimeoutPromise(1000); // wait a second to ensure
        this.stopListenEvents(~~!this.groupSwitcher);
      } catch (err) {
        this.logger.error('Error occured when blink events app:', err);
      }

      setTimeout(async() => {
        blinkMethod();
      }, this.interval);
    };
    blinkMethod();
  }

  /**
   * @param groupSwitcher
   */
  private async startListenEvents(groupSwitcher: number = 0) {
    const usernames = (config.events.usernames || '').split(',');

    this.logger.verbose('Prepare event hubs', config.events.usernames);

    await Promise.all(usernames.map(async(username) => {
      this.logger.verbose('Events for', username);
      const identData = await this.identService.getByUsername(username);
      if (!identData || !identData.username) {
        this.logger.warn('User not found:', username);
        return;
      }

      const client = new FabricClientService(identData);
      const msp = new MspProvider(client);
      const user = await msp.getAdminUser(identData.username, identData.mspId);
      msp.setUserContext(user);

      identData.events.forEach(events => {
        const eventCCHub = new EventHub(client, events.peer);

        this.fabricEvents[groupSwitcher].push(eventCCHub);

        this.logger.verbose('Add chaincode events');
        events.chaincodes.forEach(chaincodeEvent => {
          this.logger.verbose('Event for', chaincodeEvent);
          eventCCHub.addForChaincode(chaincodeEvent[0], chaincodeEvent[1], this.interval * 2).onEvent((data) => {
            const deduplicateCacheKey = `evm${data.tx_id}${data.payload.toString('base64')}`;
            if (this.deduplicateCache.has(deduplicateCacheKey)) {
              return true;
            }
            this.deduplicateCache.set(deduplicateCacheKey, 1);

            this.logger.debug('Catch chaincode event', client.getMspId(), chaincodeEvent[0], chaincodeEvent[1]);

            const metricsCommonTags = {
              'peer': events.peer,
              'chaincode': chaincodeEvent[0]
            };

            try {
              const jsonData = {
                transactionId: data.tx_id,
                payload: data.payload.toString('utf8')
              };
              this.mqService.publish(`${config.mq.channelChaincodes}${client.getMspId()}/${chaincodeEvent[0]}/${chaincodeEvent[1]}`, jsonData);

              this.metricsService.incCounter(metrics.C_CHAINCODE_EVENT, { ...metricsCommonTags,
                'status': '200'
              });
            } catch (error) {
              this.logger.error('Error was occurred when process chaincode event', error);

              this.metricsService.incCounter(metrics.C_CHAINCODE_EVENT, { ...metricsCommonTags,
                'status': '500'
              });
            }
            return true;
          });
        });

        const eventBlockHub = new EventHub(client, events.peer);

        this.fabricEvents[groupSwitcher].push(eventBlockHub);

        this.logger.verbose('Add block events');
        eventBlockHub.addForBlock(this.interval * 2).onEvent((block: any) => {
          const deduplicateCacheKey = 'block' + block.header.previous_hash;
          if (this.deduplicateCache.has(deduplicateCacheKey)) {
            return true;
          }
          this.deduplicateCache.set(deduplicateCacheKey, 1);

          this.logger.debug('Catch block event', client.getMspId());

          const metricsCommonTags = {
            'peer': events.peer
          };

          try {
            const jsonData = {
              header: block.header
              // @TODO: maybe need payload: block.data.data
            };
            this.mqService.publish(`${config.mq.channelBlocks}${client.getMspId()}`, jsonData);

            this.metricsService.setGauge(metrics.G_BLOCK, +block.header.number, { ...metricsCommonTags,
              'status': '200'
            });

            this.metricsService.setGauge(metrics.G_TRANSACTIONS_IN_BLOCK, +block.data.data.length, metricsCommonTags);
          } catch (error) {
            this.logger.error('Error was occurred when process block event', error);

            this.metricsService.setGauge(metrics.G_BLOCK, +block.header.number, { ...metricsCommonTags,
              'status': '500'
            });
          }
          return true;
        });

      });
    }));

    this.logger.verbose('Start');
    this.fabricEvents[groupSwitcher].forEach(events => events.wait());
  }

  /**
   * @param groupSwitcher
   */
  private stopListenEvents(groupSwitcher: number = 0) {
    this.logger.verbose('Stop', this.fabricEvents[groupSwitcher].length);
    this.fabricEvents[groupSwitcher].forEach(events => events.stop());
    this.fabricEvents[groupSwitcher].length = 0;
  }
}
