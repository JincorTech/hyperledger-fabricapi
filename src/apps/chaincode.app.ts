import { injectable, inject } from 'inversify';
import 'reflect-metadata';

import config from '../config';
import { Logger } from '../logger';
import { ChaincodePolicy } from '../services/fabric/chaincode/interfaces';
import { FabricClientService } from '../services/fabric/client.service';
import { InvalidArgumentException, InvalidEndorsementException } from './exceptions';
import { ChaincodeInstaller } from '../services/fabric/chaincode/installer.service';
import { TransactionBroadcaster } from '../services/fabric/transaction/broadcaster.service';
import { EventHub } from '../services/fabric/eventhub.service';
import { MspProvider } from '../services/fabric/msp.service';
import { ProposalTransaction } from '../services/fabric/transaction/proposal.service';
import { ChaincodeCall, ChaincodeInstall } from '../services/fabric/interfaces';
import { ChaincodeCommutator } from '../services/fabric/chaincode/commutator.service';
import { MessageQueue } from '../services/mq/interfaces';
import { MessageQueueType } from '../services/mq/natsmq.service';
import metrics from '../services/metrics';
import { MetricsService } from '../services/metrics/metrics.service';

// IoC
export const ChaincodeApplicationType = Symbol('ChaincodeApplicationType');

/**
 * Chaincode application.
 */
@injectable()
export class ChaincodeApplication {
  private logger = Logger.getInstance('CHAINCODE_APPLICATION');
  private fabric: FabricClientService;
  private identityData: IdentificationData;
  private metricsService: MetricsService = new MetricsService();

  constructor(
    @inject(MessageQueueType) private mq: MessageQueue
  ) {
  }

  /**
   * Set instance context.
   * @param fabric
   */
  setContext(fabric: FabricClientService, identityData: IdentificationData): ChaincodeApplication {
    this.fabric = fabric;
    this.identityData = identityData;
    this.fabric.setClientMsp(identityData.mspId);
    return this;
  }

  /**
   * @param channelName
   */
  private async getChannel(channelName) {
    return await this.fabric.getClient().getChannel(channelName);
  }

  /**
   * Parse chaincode id as chaincodeName:chaincodeVersion
   * @param chaincodeId
   */
  private parseChaincodeId(chaincodeId: string): Array<string> {
    const parts = chaincodeId.split(':');
    if (!parts[0]) {
      throw new InvalidArgumentException('Invalid chaincodeId');
    }
    return [parts[0], parts[1] || '0'];
  }

  /**
   * Wait transaction event or timeout
   * @param peerName
   * @param transaction
   */
  private async waitPeerTransactionEvent(peerName: string, transaction: any): Promise<any> {
    if (!peerName) {
      return false;
    }

    return await new Promise((resolve, reject) => {
      let result = false;
      const eventHub = new EventHub(this.fabric, peerName);
      const transSubs = eventHub.addForTransaction(transaction);

      const metricsCommonTags = {
        'peer': peerName
      };

      transSubs.onEvent((eventData) => {
        this.logger.verbose('Catch transaction event result', eventData.code, transaction.getTransactionID());
        resolve(eventData);

        this.metricsService.incCounter(metrics.C_TRANSACTION, { ...metricsCommonTags,
          'code': eventData.code,
          'status': '200'
        });

        return false;
      },
        () => {
          reject('Transaction event timeout ' + transaction.getTransactionID());

          this.metricsService.incCounter(metrics.C_TRANSACTION, { ...metricsCommonTags,
            'status': '408'
          });
        }
      );

      eventHub.wait().then(() => { resolve(result); });
    });
  }

  /**
   * Broadcast and wait the event or timeout.
   */
  private async broadcastTransaction(
    channelName: string,
    peers: Array<string>,
    eventPeer: string,
    resultOfProposal: any,
    transaction: any,
    waitTransaction: boolean = false
  ): Promise<any> {
    const transactionBroadcaster = new TransactionBroadcaster(this.fabric, channelName);

    const transactionPromise = this.waitPeerTransactionEvent(eventPeer || peers[0], transaction).then((result) => {
        this.mq.publish(`${config.mq.channelTransactions}${this.fabric.getMspId()}`, result);
        return result;
      });

    const waitTransactionPromise = waitTransaction ? transactionPromise : Promise.resolve({});

    const metricsCommonTags = {
      'channelName': channelName
    };

    try {
      const [broadCastResult, transactionResult] = await Promise.all([
        transactionBroadcaster.broadcastTransaction(resultOfProposal), waitTransactionPromise
      ]);

      this.metricsService.incCounter(metrics.C_TRANSACTION_BROADCASTED, { ...metricsCommonTags,
        'status': '200'
      });

      return {
        transaction: transaction.getTransactionID(),
        result: this.getResultFromResponse(resultOfProposal),
        status: transactionResult && transactionResult.code
      };
    } catch (error) {

      this.metricsService.incCounter(metrics.C_TRANSACTION_BROADCASTED, { ...metricsCommonTags,
        'status': '500'
      });

      throw error;
    }
  }

  /**
   * Extract status, data from response
   *
   * @param resultOfProposal
   */
  private getResultFromResponse(resultOfProposal: any): any {
    if (!resultOfProposal.length) {
      throw new InvalidEndorsementException('Response not contains data');
    }
    return resultOfProposal[0].map((res) => ({version: res.version, timestamp: res.timestamp, response: res.response}));
  }

  /**
   * @param chaincodeId
   * @param chaincodePath
   * @param peers
   */
  async deployChaincode(chaincodeId: string, chaincodePath: string, peers: Array<string>): Promise<any> {
    this.logger.verbose('Deploy chaincode', chaincodeId, peers);

    if (!this.fabric.canUseAdmin()) {
      throw new InvalidArgumentException('The identified user is not administrator');
    }
    if (!chaincodePath) {
      throw new InvalidArgumentException('Invalid chaincodePath');
    }

    const [ chaincodeName, chaincodeVersion ] = this.parseChaincodeId(chaincodeId);

    return await (new ChaincodeInstaller(this.fabric, chaincodeName))
      .deploy(peers, chaincodePath, chaincodeVersion);
  }

  /**
   * @param isUpgrade
   * @param channelName
   * @param chaincodeId
   * @param args
   * @param peers
   * @param policy
   */
  async installChaincode(
    installRequest: ChaincodeInstall
  ): Promise<any> {
    this.logger.verbose('Upgrade chaincode', arguments);

    if (!this.fabric.canUseAdmin()) {
      throw new InvalidArgumentException('The identified user is not administrator');
    }

    const [ chaincodeName, chaincodeVersion ] = this.parseChaincodeId(installRequest.chaincodeId);
    const mspProvider = new MspProvider(this.fabric);
    mspProvider.setUserContext(
      await mspProvider.getAdminUser(this.identityData.username, this.identityData.mspId)
    );
    const proposalTransaction = new ProposalTransaction(this.fabric);
    const transaction = proposalTransaction.newTransaction(true);
    const chaincodeInstaller = new ChaincodeInstaller(this.fabric, chaincodeName);

    const metricsCommonTags = {
      'channel': installRequest.channelName,
      'chaincode': installRequest.chaincodeId,
      'action': installRequest.isUpgrade ? 'upgrade' : 'install'
    };

    let resultOfProposal;
    try {
      if (!installRequest.isUpgrade) {
        resultOfProposal = await chaincodeInstaller.initiate(
          installRequest.peers,
          installRequest.channelName,
          transaction,
          chaincodeVersion,
          installRequest.args,
          installRequest.policy
        );
      } else {
        resultOfProposal = await chaincodeInstaller.upgrade(
          installRequest.peers,
          installRequest.channelName,
          transaction,
          chaincodeVersion,
          installRequest.args,
          installRequest.policy
        );
      }

      this.checkResultOfProposal((await this.fabric.getChannel(installRequest.channelName)), proposalTransaction, resultOfProposal);

      const result = await this.broadcastTransaction(
        installRequest.channelName,
        installRequest.peers,
        installRequest.eventPeer,
        resultOfProposal,
        transaction,
        installRequest.waitTransaction
      );

      this.metricsService.incCounter(metrics.C_CHAINCODE_INSTALL, { ...metricsCommonTags,
        'status': '200'
      });

      return result;
    } catch (error) {
      this.metricsService.incCounter(metrics.C_CHAINCODE_INSTALL, { ...metricsCommonTags,
        'status': '500'
      });

      throw error;
    }
  }

  /**
   * @param callRequest
   */
  async callChaincode(
    callRequest: ChaincodeCall
  ): Promise<any> {
    this.logger.verbose('Call chaincode', arguments);

    if (!callRequest.method) {
      throw new InvalidArgumentException('Invalid method');
    }

    const [ chaincodeName, chaincodeVersion ] = this.parseChaincodeId(callRequest.chaincodeId);
    const mspProvider = new MspProvider(this.fabric);
    await mspProvider.setUserFromStorage(callRequest.initiatorUsername);
    const proposalTransaction = new ProposalTransaction(this.fabric);
    const transaction = proposalTransaction.newTransaction();
    const chaincodeCommutator = new ChaincodeCommutator(
      this.fabric, callRequest.channelName, chaincodeName
    );

    if (callRequest.isQuery) {
      const metricsCommonTags = {
        'channel': callRequest.channelName,
        'chaincode': callRequest.chaincodeId,
        'action': 'query'
      };

      const doneInvokeGauge = this.metricsService.startGauge(metrics.G_CHAINCODE_INVOKE_TIME);

      try {
        const result = await chaincodeCommutator.query(
          callRequest.peers,
          transaction,
          callRequest.method,
          callRequest.args,
          callRequest.transientMap
        );

        this.metricsService.incCounter(metrics.C_CHAINCODE_INVOKE, { ...metricsCommonTags,
          'status': '200'
        });

        return result;
      } catch (error) {
        this.metricsService.incCounter(metrics.C_CHAINCODE_INVOKE, { ...metricsCommonTags,
          'status': '500'
        });

        throw error;
      } finally {
        doneInvokeGauge(metricsCommonTags);
      }
    }

    const metricsCommonTags = {
      'channel': callRequest.channelName,
      'chaincode': callRequest.chaincodeId,
      'commit': callRequest.commitTransaction ? '1' : '0',
      'action': 'invoke'
    };

    const doneInvokeGauge = this.metricsService.startGauge(metrics.G_CHAINCODE_INVOKE_TIME);

    try {
      const resultOfProposal = await chaincodeCommutator.invoke(
        callRequest.peers,
        transaction,
        callRequest.method,
        callRequest.args,
        callRequest.transientMap
      );

      this.checkResultOfProposal((await this.fabric.getChannel(callRequest.channelName)), proposalTransaction, resultOfProposal);

      if (callRequest.commitTransaction) {
        const result = await this.broadcastTransaction(
          callRequest.channelName,
          callRequest.peers,
          callRequest.eventPeer,
          resultOfProposal,
          transaction,
          callRequest.waitTransaction
        );

        this.metricsService.incCounter(metrics.C_CHAINCODE_INVOKE, { ...metricsCommonTags,
          'status': '200'
        });

        return result;
      }

      const result = this.getResultFromResponse(resultOfProposal);

      this.metricsService.incCounter(metrics.C_CHAINCODE_INVOKE, { ...metricsCommonTags,
        'status': '200'
      });

      return result;
    } catch (error) {
      this.metricsService.incCounter(metrics.C_CHAINCODE_INVOKE, { ...metricsCommonTags,
        'status': '500'
      });

      throw error;
    } finally {
      doneInvokeGauge(metricsCommonTags);
    }
  }

  /**
   * Check proposal result
   * @param proposalTransaction
   * @param resultOfProposal
   */
  private checkResultOfProposal(channel: any, proposalTransaction: ProposalTransaction, resultOfProposal: any) {
    if (!resultOfProposal) {
      throw new InvalidEndorsementException('Result of proposal is empty');
    }

    proposalTransaction.validateProposalResponses(channel, resultOfProposal);
  }
}
