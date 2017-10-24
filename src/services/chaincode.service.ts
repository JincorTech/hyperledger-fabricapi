import * as fs from 'fs';
import * as User from 'fabric-client/lib/User.js';
import * as path from 'path';
import * as FabricClient from 'fabric-client/lib/Client.js';
import { injectable, inject } from 'inversify';

import config from '../config';
import { Logger } from '../logger';
import { FabricClientService } from './fabric.service';
import { IdentificationData } from './identify.service';

// IoC
export const ChaincodeServiceType = Symbol('ChaincodeServiceType');

// Exceptions
export class ChaincodeServiceException extends Error {}
export class NotFoundException extends ChaincodeServiceException { }
export class InvalidArgumentException extends ChaincodeServiceException { }
export class InvalidEndorsementException extends ChaincodeServiceException { }
export class BroadcastingException extends ChaincodeServiceException { }

// types
export interface TransientMap {
  [key: string]: string;
}

export interface ChaincodePolicyIdentity {
  role: {
    name: string;
    mspId: string;
  };
}

export interface ChaincodePolicySignedBy {
  [key: string]: Array<ChaincodePolicySignedBy>|number;
}

export interface ChaincodePolicy {
  identities: Array<ChaincodePolicyIdentity>;
  policy: ChaincodePolicySignedBy;
}

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
  private fabricService: FabricClientService;
  private identityData: IdentificationData;

  /**
   * Set instance context.
   * @param fabricService
   */
  setContext(fabricService: FabricClientService, identityData: IdentificationData): ChaincodeService {
    this.fabricService = fabricService;
    this.identityData = identityData;
    this.fabricService.setClientMsp(identityData.mspId);
    return this;
  }

  private parseChaincodeId(chaincodeId: string): Array<string> {
    const parts = chaincodeId.split(':');
    if (!parts[0]) {
      throw new InvalidArgumentException('Invalid chaincodeId');
    }
    return parts;
  }

  /**
   * @param chaincodeId
   * @param chaincodePath
   * @param chaincodeVersion
   * @param peers
   */
  async deployChaincode(chaincodeId: string, chaincodePath: string, peers: Array<string>): Promise<any> {
    this.logger.verbose('Deploy chaincode', arguments);

    process.env.GOPATH = config.chaincode.goSrcPath;

    if (!this.fabricService.canUseAdmin()) {
      throw new InvalidArgumentException('The identified user is not administrator');
    }

    if (!chaincodePath) {
      throw new InvalidArgumentException('Invalid chaincodePath');
    }

    const [ chaincodeName, chaincodeVersion ] = this.parseChaincodeId(chaincodeId);

    return await this.fabricService.getClient().installChaincode({
      targets: peers,
      chaincodeId: chaincodeName,
      chaincodePath,
      chaincodeVersion: chaincodeVersion || '0'
    });
  }

  /**
   * @param channelName
   * @param chaincodeId
   * @param chaincodeVersion
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

    if (!this.fabricService.canUseAdmin()) {
      throw new InvalidArgumentException('The identified user is not administrator');
    }

    const [ chaincodeName, chaincodeVersion ] = this.parseChaincodeId(chaincodeId);
    const client = this.fabricService.getClient();
    client._userContext = await this.getAdminUser();

    const transactionId = client.newTransactionID(true);
    const channel = client.getChannel(channelName);

    await channel.initialize();

    this.logger.verbose('Send transaction proposal');
    const resultOfProposal = await channel.sendInstantiateProposal({
      chaincodeId: chaincodeName,
      chaincodeVersion: chaincodeVersion || '0',
      args: args || [],
      txId: transactionId,
      targets: peers,
      'endorsement-policy': policy
    });

    const [proposalResponses, proposal] = resultOfProposal;

    this.checkEndorsementPolicyOfResponse(proposalResponses);

    await this.broadcastTransaction(channelName, proposalResponses, proposal);
  }

  /**
   * @param channelName
   */
  private async getChannel(channelName) {
    return await this.fabricService.getClient().getChannel(channelName);
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

    const client = this.fabricService.getClient();
    await client.initCredentialStores();
    const user = await client.getUserContext(callRequest.initiatorUsername, true);
    await client.setUserContext(user);

    const [ chaincodeName, chaincodeVersion ] = this.parseChaincodeId(callRequest.chaincodeId);
    const transactionId = this.fabricService.getClient().newTransactionID();
    const channel = await this.getChannel(callRequest.channelName);

    const requstData = {
      chaincodeId: chaincodeName,
      chaincodeVersion: chaincodeVersion || '0',
      fcn: callRequest.method,
      args: callRequest.args,
      transientMap: callRequest.transientMap,
      txId: transactionId
    };

    if (callRequest.isQuery) {
      this.logger.verbose('Query', callRequest.channelName, chaincodeName, callRequest.method, transactionId);
      return await channel.queryByChaincode(requstData, callRequest.peers);
    }
    this.logger.verbose('Invoke', callRequest.channelName, chaincodeName, callRequest.method, transactionId);
    const resultOfProposal = await channel.sendTransactionProposal({
      ...requstData,
      targets: callRequest.peers
    });

    if (!resultOfProposal) {
      throw new InvalidEndorsementException('Result of proposal is empty');
    }

    const [proposalResponses, proposal] = resultOfProposal;

    this.checkEndorsementPolicyOfResponse(proposalResponses);

    if (callRequest.commitTransaction) {
      await this.broadcastTransaction(callRequest.channelName, proposalResponses, proposal);
    }

    return proposal;
  }

  /**
   * @param proposalResponses
   */
  checkEndorsementPolicyOfResponse(proposalResponses: any) {
    let endorsementSatisfied = true;

    this.logger.verbose('Check endorsement policy in the response');

    for (let i in proposalResponses) {
      let result = false;
      if (
        proposalResponses &&
        proposalResponses[i].response &&
        proposalResponses[i].response.status === 200
      ) {
        result = true;
      }
      endorsementSatisfied = endorsementSatisfied && result;
    }

    if (!endorsementSatisfied) {
      this.logger.error('Endorsement policy is not satisfied');
      throw new InvalidEndorsementException('Chaincode call failed');
    }
  }

  /**
   * @param channelName
   * @param proposalResponses
   * @param proposal
   */
  async broadcastTransaction(channelName: string, proposalResponses: any, proposal: any) {
    this.logger.verbose('Send transaction to orderer');

    const channel = await this.getChannel(channelName);

    const broadcastResult = await channel.sendTransaction({
      proposalResponses,
      proposal
    });

    if (!broadcastResult || broadcastResult.status !== 'SUCCESS') {
      this.logger.error('Failed to broadcast a transaction by orderer');
      throw new BroadcastingException('Broadcast failed');
    }
  }

  private async getAdminUser(): User {
    const client = this.fabricService.getClient();
    if (
      !client._adminSigningIdentity ||
      !client._adminSigningIdentity._certificate ||
      !client._adminSigningIdentity._signer ||
      !client._adminSigningIdentity._signer.key
    ) {
      throw new NotFoundException('Administrator not found');
    }

    const user = new User(this.identityData.username);
    await user.setEnrollment(
      client._adminSigningIdentity._signer._key,
      client._adminSigningIdentity._certificate,
      this.identityData.mspId
    );
    return user;
  }
}
