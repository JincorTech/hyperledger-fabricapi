import * as process from 'process';

import { FabricClientService } from './';
import config from '../../config';
import { Logger } from '../../logger';

// Exceptions

// Types
/**
 * TransientMap
 */
export interface TransientMap {
  [key: string]: string;
}

/**
 * ChaincodePolicyIdentity
 */
export interface ChaincodePolicyIdentity {
  role: {
    name: string;
    mspId: string;
  };
}

/**
 * ChaincodePolicySignedBy
 */
export interface ChaincodePolicySignedBy {
  [key: string]: Array<ChaincodePolicySignedBy>|number;
}

/**
 * ChaincodePolicy
 */
export interface ChaincodePolicy {
  identities: Array<ChaincodePolicyIdentity>;
  policy: ChaincodePolicySignedBy;
}

/**
 * ChaincodeInitiator
 */
export class ChaincodeInitiator {
  private logger = Logger.getInstance('CHAINCODE_INITIATOR');

  constructor(private fabric: FabricClientService, private chaincodeName: string) {
  }

  async deploy(
    peers: Array<string>,
    chaincodePath: string,
    chaincodeVersion: string
  ) {
    this.logger.verbose('Deploy', chaincodePath, chaincodeVersion);
    process.env.GOPATH = config.chaincode.goSrcPath;
    return await this.fabric.getClient().installChaincode({
      targets: peers,
      chaincodeId: this.chaincodeName,
      chaincodePath,
      chaincodeVersion
    });
  }

  async initiate(
    peers: Array<string>,
    channelName: string,
    transaction: any,
    chaincodeVersion: string,
    args: Array<string>,
    policy?: ChaincodePolicy
  ) {
    this.logger.verbose('Initiate', channelName, this.chaincodeName, chaincodeVersion);
    return (await this.fabric.getChannel(channelName)).sendInstantiateProposal({
      chaincodeId: this.chaincodeName,
      chaincodeVersion: chaincodeVersion,
      args: args || [],
      txId: transaction,
      targets: peers,
      'endorsement-policy': policy
    });
  }
}

/**
 * ChaincodeCommutator
 */
export class ChaincodeCommutator {
  private logger = Logger.getInstance('CHAINCODE_COMMUTATOR');

  constructor(
    private fabric: FabricClientService,
    private channelName: string,
    private chaincodeName: string,
    private chaincodeVersion: string) {
  }

  async invoke(
    peers: Array<string>,
    transaction: any,
    method: string,
    args: Array<string>,
    transientMap: TransientMap
  ) {
    this.logger.verbose('Invoke', this.channelName, this.chaincodeName, method, transaction);
    return (await this.fabric.getChannel(this.channelName)).sendTransactionProposal({
      chaincodeId: this.chaincodeName,
      chaincodeVersion: this.chaincodeVersion,
      fcn: method,
      args: args,
      transientMap: transientMap,
      txId: transaction
    }, peers);
  }

  async query(
    peers: Array<string>,
    transaction: any,
    method: string,
    args: Array<string>,
    transientMap: TransientMap
  ) {
    this.logger.verbose('Query', this.channelName, this.chaincodeName, method, transaction);
    return (await this.fabric.getChannel(this.channelName)).queryByChaincode({
      chaincodeId: this.chaincodeName,
      chaincodeVersion: this.chaincodeVersion,
      fcn: method,
      args: args,
      transientMap: transientMap,
      txId: transaction
    }, peers);
  }
}
