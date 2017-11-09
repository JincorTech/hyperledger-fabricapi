import { FabricClientService } from '../client.service';
import { Logger } from '../../../logger';
import { TransactionBroadcasterException } from './exceptions';

/**
 * TransactionBroadcaster
 */
export class TransactionBroadcaster {
  private logger = Logger.getInstance('TRANSACTION_BROADCATER');

  constructor(private fabric: FabricClientService, private channelName: string) {
  }

  /**
   * Broadcast transaction by orderer
   * @param proposalResultResponses
   */
  async broadcastTransaction(proposalResultResponses: any): Promise<any> {
    const [proposalResponses, proposal] = proposalResultResponses;

    this.logger.verbose('Send transaction to orderer');

    const broadcastResult = await (await this.fabric.getChannel(this.channelName)).sendTransaction({
      proposalResponses,
      proposal
    });

    if (!broadcastResult || broadcastResult.status !== 'SUCCESS') {
      this.logger.error('Failed to broadcast a transaction by orderer', broadcastResult);
      throw new TransactionBroadcasterException('Broadcast failed');
    }

    return broadcastResult;
  }
}
