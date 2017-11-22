import config from '../../../config';
import { Logger } from '../../../logger';
import { FabricClientService } from '../client.service';

/**
 * TransactionQuery
 */
export class TransactionQuery {
  private logger = Logger.getInstance('TRANSACTION_QUERY');

  constructor(
    private fabric: FabricClientService,
    private channelName: string
  ) {
  }

  /**
   * Query by transaction hash
   * @param peers
   * @param transactionIndex
   */
  async queryByHash(
    peers: Array<string>,
    transactionHash: string
  ): Promise<any> {
    this.logger.verbose('Query by hash', this.channelName, transactionHash);

    // @TODO: Add ability to consistently querying of peers
    return (await this.fabric.getChannel(this.channelName)).queryTransaction(transactionHash, peers[0]);
  }
}
