import * as fs from 'fs';
import * as path from 'path';
import * as User from 'fabric-client/lib/User.js';
import * as FabricClient from 'fabric-client/lib/Client.js';
import { injectable, inject } from 'inversify';

import config from '../config';
import { Logger } from '../logger';
import {
  FabricClientService,
  MspProvider
} from './fabric';
import {
  ChaincodeCommutator,
  ChaincodeInitiator,
  TransientMap,
  ChaincodePolicy
} from './fabric/chaincode.service';
import {
  TransactionBroadcaster,
  ProposalTransaction
} from './fabric/transaction.service';

// IoC
export const ChaincodeServiceType = Symbol('ChaincodeServiceType');

// Exceptions
export class ChaincodeServiceException extends Error {}
export class NotFoundException extends ChaincodeServiceException { }
export class InvalidArgumentException extends ChaincodeServiceException { }
export class InvalidEndorsementException extends ChaincodeServiceException { }
export class BroadcastingException extends ChaincodeServiceException { }

// Types
export interface ChaincodeCall {
  isQuery: boolean;
  initiatorUsername: string;
  channelName: string;
  chaincodeId: string;
  method: string;
  args: Array<string>;
  peers: Array<string>;
  transientMap?: TransientMap;
  commitTransaction?: boolean;
}

/**
 * ChaincodeService
 */
@injectable()
export class ChaincodeService {
  private logger = Logger.getInstance('CHAINCODE_SERVICE');
  private fabric: FabricClientService;
  private identityData: IdentificationData;

  /**
   * Set instance context.
   * @param fabric
   */
  setContext(fabric: FabricClientService, identityData: IdentificationData): ChaincodeService {
    this.fabric = fabric;
    this.identityData = identityData;
    this.fabric.setClientMsp(identityData.mspId);
    return this;
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

    return await (new ChaincodeInitiator(this.fabric, chaincodeName))
      .deploy(peers, chaincodePath, chaincodeVersion);
  }

  /**
   * @param channelName
   * @param chaincodeId
   * @param args
   * @param peers
   * @param policy
   */
  async initiateChaincode(
    channelName: string,
    chaincodeId: string,
    args: Array<string>,
    peers: Array<string>,
    policy: ChaincodePolicy|null = null
  ): Promise<any> {
    this.logger.verbose('Initiate chaincode', arguments);

    if (!this.fabric.canUseAdmin()) {
      throw new InvalidArgumentException('The identified user is not administrator');
    }

    const [ chaincodeName, chaincodeVersion ] = this.parseChaincodeId(chaincodeId);
    const mspProvider = new MspProvider(this.fabric);
    mspProvider.setUserContext(
      await mspProvider.getAdminUser(this.identityData.username, this.identityData.mspId)
    );
    const proposalTransaction = new ProposalTransaction(this.fabric);
    const transactionId = proposalTransaction.newTransactionId(true);

    const resultOfProposal = await (new ChaincodeInitiator(this.fabric, chaincodeName))
      .initiate(peers, channelName, transactionId, chaincodeVersion, args, policy);

    this.checkResultOfProposal(proposalTransaction, resultOfProposal);

    const transactionBroadcaster = new TransactionBroadcaster(this.fabric, channelName);
    return await transactionBroadcaster.broadcastTransaction(resultOfProposal);
  }

  /**
   * @param channelName
   */
  private async getChannel(channelName) {
    return await this.fabric.getClient().getChannel(channelName);
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
    const transactionId = proposalTransaction.newTransactionId(true);
    const chaincodeCommutator = new ChaincodeCommutator(
      this.fabric, callRequest.channelName, chaincodeName, chaincodeVersion
    );

    if (callRequest.isQuery) {
      return await chaincodeCommutator.query(
        callRequest.peers,
        transactionId,
        callRequest.method,
        callRequest.args,
        callRequest.transientMap
      );
    }

    const resultOfProposal = await chaincodeCommutator.invoke(
      callRequest.peers,
      transactionId,
      callRequest.method,
      callRequest.args,
      callRequest.transientMap
    );

    this.checkResultOfProposal(proposalTransaction, resultOfProposal);

    if (callRequest.commitTransaction) {
      const transactionBroadcaster = new TransactionBroadcaster(this.fabric, callRequest.channelName);
      await transactionBroadcaster.broadcastTransaction(resultOfProposal);
    }

    return resultOfProposal[1];
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
    if (!proposalTransaction.checkEndorsementPolicyOfResponse(resultOfProposal)) {
      throw new InvalidEndorsementException('Endorsement policy is not satisfied');
    }
  }
}
