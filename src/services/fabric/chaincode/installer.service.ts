import * as process from 'process';

import config from '../../../config';
import { Logger } from '../../../logger';
import { FabricClientService } from '../client.service';
import { ChaincodePolicy } from './interfaces';

/**
 * ChaincodeInstaller
 */
export class ChaincodeInstaller {
  private logger = Logger.getInstance('CHAINCODE_INSTALLER');

  constructor(private fabric: FabricClientService, private chaincodeName: string) {
  }

  /**
   * Upload chaincode sources and deploy
   * @param peers
   * @param chaincodePath
   * @param chaincodeVersion
   */
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

  /**
   * Initiate chaincode on a channel
   * @param peers
   * @param channelName
   * @param transaction
   * @param chaincodeVersion
   * @param args
   * @param policy
   */
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

  /**
   * Upgrade chaincode on a channel
   * @param peers
   * @param channelName
   * @param transaction
   * @param chaincodeVersion
   * @param args
   * @param policy
   */
  async upgrade(
    peers: Array<string>,
    channelName: string,
    transaction: any,
    chaincodeVersion: string,
    args: Array<string>,
    policy?: ChaincodePolicy
  ) {
    this.logger.verbose('Upgrade', channelName, this.chaincodeName, chaincodeVersion);
    return (await this.fabric.getChannel(channelName)).sendUpgradeProposal({
      chaincodeId: this.chaincodeName,
      chaincodeVersion: chaincodeVersion,
      args: args || [],
      txId: transaction,
      targets: peers,
      'endorsement-policy': policy
    });
  }
}
