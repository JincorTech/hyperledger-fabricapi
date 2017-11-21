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

      transSubs.onEvent((eventData) => {
        this.logger.verbose('Catch transaction event result', eventData.code, transaction.getTransactionID());
        resolve(eventData);
        return false;
      },
        () => { reject('Transaction event timeout ' + transaction.getTransactionID()); }
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

    let waitTransactionPromise = waitTransaction ?
      this.waitPeerTransactionEvent(eventPeer || peers[0], transaction).then((result) => {
        this.mq.publish(`${config.mq.channelTransactions}${this.fabric.getMspId()}`, result);
        return result;
      }) :
      Promise.resolve({});

    const [broadCastResult, transactionResult] = await Promise.all([
      transactionBroadcaster.broadcastTransaction(resultOfProposal), waitTransactionPromise
    ]);

    return {
      transaction: transaction.getTransactionID(),
      result: this.getResultFromResponse(resultOfProposal),
      status: transactionResult && transactionResult.code
    };
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

    let resultOfProposal;
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

    this.checkResultOfProposal(proposalTransaction, resultOfProposal);

    return await this.broadcastTransaction(
      installRequest.channelName,
      installRequest.peers,
      installRequest.eventPeer,
      resultOfProposal,
      transaction,
      installRequest.waitTransaction
    );
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
      return await chaincodeCommutator.query(
        callRequest.peers,
        transaction,
        callRequest.method,
        callRequest.args,
        callRequest.transientMap
      );
    }

    const resultOfProposal = await chaincodeCommutator.invoke(
      callRequest.peers,
      transaction,
      callRequest.method,
      callRequest.args,
      callRequest.transientMap
    );

    this.checkResultOfProposal(proposalTransaction, resultOfProposal);

    if (callRequest.commitTransaction) {
      return await this.broadcastTransaction(
        callRequest.channelName,
        callRequest.peers,
        callRequest.eventPeer,
        resultOfProposal,
        transaction,
        callRequest.waitTransaction
      );
    }

    return this.getResultFromResponse(resultOfProposal);
  }

  /**
   * Check proposal result
   * @param proposalTransaction
   * @param resultOfProposal
   */
  private checkResultOfProposal(proposalTransaction: ProposalTransaction, resultOfProposal: any) {
    if (!resultOfProposal) {
      throw new InvalidEndorsementException('Result of proposal is empty');
    }

    proposalTransaction.validateProposalResponses(resultOfProposal);
  }
}
