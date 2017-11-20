import config from '../../../config';
import { Logger } from '../../../logger';
import { FabricClientService } from '../client.service';

/**
 * BlockQuery
 */
export class BlockQuery {
  private logger = Logger.getInstance('BLOCK_QUERY');

  constructor(
    private fabric: FabricClientService,
    private channelName: string
  ) {
  }

  /**
   * Query by block index
   * @param peers
   * @param blockIndex
   */
  async queryByIndex(
    peers: Array<string>,
    blockIndex: number
  ): Promise<any> {
    this.logger.verbose('Query by index', this.channelName, blockIndex);

    // @TODO: Add ability to consistently querying of peers
    return (await this.fabric.getChannel(this.channelName)).queryBlock(blockIndex, peers[0]);
  }

  /**
   * Query by block hash
   * @param peers
   * @param blockIndex
   */
  async queryByHash(
    peers: Array<string>,
    blockHash: Uint8Array
  ): Promise<any> {
    this.logger.verbose('Query by hash', this.channelName, blockHash);

    // @TODO: Add ability to consistently querying of peers
    return (await this.fabric.getChannel(this.channelName)).queryBlockByHash(blockHash, peers[0]);
  }
}
