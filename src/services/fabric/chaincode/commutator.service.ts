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
    private chaincodeName: string
  ) {
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
  ): Promise<any> {
    this.logger.verbose('Invoke', this.channelName, this.chaincodeName, method, transaction);
    return (await this.fabric.getChannel(this.channelName)).sendTransactionProposal({
      chaincodeId: this.chaincodeName,
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
  ): Promise<any> {
    this.logger.verbose('Query', this.channelName, this.chaincodeName, method, transaction);
    const channel = await this.fabric.getChannel(this.channelName);
    const responses = await channel.queryByChaincode({
      chaincodeId: this.chaincodeName,
      fcn: method,
      args: args,
      transientMap: transientMap,
      txId: transaction
    }, peers);

    return responses.map(element => {
      if (element instanceof Buffer) {
        return element.toString();
      }
      return element;
    });
  }
}
