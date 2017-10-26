import config from '../../../config';
import { Logger } from '../../../logger';
import { FabricClientService } from '../client.service';
import { TransientMap } from './interfaces';

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

  /**
   * Invoke method by send a proposal transaction
   * @param peers
   * @param transaction
   * @param method
   * @param args
   * @param transientMap
   */
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

  /**
   * Query chaincode method
   * @param peers
   * @param transaction
   * @param method
   * @param args
   * @param transientMap
   */
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
