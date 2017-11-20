import { MspProvider } from '../services/fabric/msp.service';
import config from '../config';
import { Logger } from '../logger';
import { EventHub } from '../services/fabric/eventhub.service';
import { MessageQueue } from '../services/mq/interfaces';
import { MessageQueueType } from '../services/mq/natsmq.service';
import { FabricClientService } from '../services/fabric/client.service';
import { IdentificationService } from '../services/security/interfaces';
import { IdentificationServiceType } from '../services/security/identification.service';

export class EventsFabricApplication {
  private logger = Logger.getInstance('EVENTS-FABRIC');
  private fabricEvents: Array<EventHub> = [];

  constructor(
    private identService: IdentificationService,
    private mqService: MessageQueue
  ) {
  }

  async startListenEvents() {
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
        const eventHub = new EventHub(client, events.peer);

        this.fabricEvents.push(eventHub);

        this.logger.verbose('Add chaincode events');
        events.chaincodes.forEach(chaincodeEvent => {
          this.logger.verbose('Event for', chaincodeEvent);
          eventHub.addForChaincode(chaincodeEvent[0], chaincodeEvent[1]).onEvent((data) => {
            this.logger.debug('Catch chaincode event', client.getMspId(), chaincodeEvent[0], chaincodeEvent[1]);
            const jsonData = {
              transactionId: data.tx_id,
              payload: data.payload.toString('utf8')
            };
            this.mqService.publish(`${config.mq.channelChaincodes}${client.getMspId()}/${chaincodeEvent[0]}/${chaincodeEvent[1]}`, jsonData);
            return true;
          });
        });
      });
    }));

    this.logger.verbose('Start');
    this.fabricEvents.forEach(events => events.wait());
  }

  stopListenEvents() {
    this.logger.verbose('Stop');
    this.fabricEvents.forEach(events => events.stop());
  }
}
