import { Logger } from '../../../logger';
import { FabricClientService } from '../client.service';
import { TransactionBroadcasterException, ErrorProposalResponses, EmptyProposalResponse } from './exceptions';

/**
 * ProposalTransaction
 */
export class ProposalTransaction {
  private logger = Logger.getInstance('PROPOSAL_TRANSACTION');

  constructor(private fabric: FabricClientService) {
  }

  /**
   * Create new transaction id
   * @param isAdminInitiator
   */
  newTransaction(isAdminInitiator: boolean = false) {
    return this.fabric.getClient().newTransactionID(isAdminInitiator);
  }

  /**
   * Check proposal responses
   * @param proposalResultResponses
   */
  validateProposalResponses(proposalResultResponses: any) {
    this.logger.verbose('Check proposal responses');

    const [proposalResponses, proposal] = proposalResultResponses;

    if (!proposalResponses.length) {
      this.logger.verbose('Empty proposal responses', proposalResponses);
      throw new EmptyProposalResponse('Empty proposal responses was received');
    }

    const notSatisfiedProposals = proposalResponses.filter(
      (item) => !item.response || item.response.status !== 200
    );

    if (notSatisfiedProposals.length > 0) {
      this.logger.verbose('Not satisfied proposals: %s', notSatisfiedProposals);
      throw new ErrorProposalResponses(notSatisfiedProposals.join('; '));
    }
  }
}

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
  async broadcastTransaction(proposalResultResponses: any) {
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
  }
}
