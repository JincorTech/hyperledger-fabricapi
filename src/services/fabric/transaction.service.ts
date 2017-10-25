import { FabricClientService } from './';
import { Logger } from '../../logger';

// Exceptions
export class TransactionBroadcasterException extends Error { }

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
  newTransactionId(isAdminInitiator: boolean = false) {
    return this.fabric.getClient().newTransactionID(isAdminInitiator);
  }

  /**
   * Check endorsements policy
   * @param proposalResultResponses
   */
  checkEndorsementPolicyOfResponse(proposalResultResponses: any) {
    this.logger.verbose('Check endorsement policy in the response');

    const [proposalResponses, proposal] = proposalResultResponses;

    if (Array.isArray(proposalResponses)) {
      return false;
    }

    const notSatisfiedEndorsments = proposalResponses.filter(
      (item) => item.response && item.response.status === 200
    );

    if (notSatisfiedEndorsments.length > 0) {
      this.logger.verbose('Not satisfied endorsments:', notSatisfiedEndorsments);
      return false;
    }

    return true;
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

    const broadcastResult = (await this.fabric.getChannel(this.channelName)).sendTransaction({
      proposalResponses,
      proposal
    });

    if (!broadcastResult || broadcastResult.status !== 'SUCCESS') {
      this.logger.error('Failed to broadcast a transaction by orderer');
      throw new TransactionBroadcasterException('Broadcast failed');
    }
  }
}
