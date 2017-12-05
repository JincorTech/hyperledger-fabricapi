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
  validateProposalResponses(channel: any, proposalResultResponses: any) {
    this.logger.verbose('Check proposal responses');

    const [proposalResponses, proposal] = proposalResultResponses;

    if (!proposalResponses.length) {
      this.logger.verbose('Empty proposal responses', proposalResponses);
      throw new EmptyProposalResponse('Empty proposal responses was received');
    }

    // @TODO: Add initialized mspmanager for channel
    // if (!channel.compareProposalResponseResults(proposalResponses)) {
    //   this.logger.warn('Received transaction proposals are differents');
    //   throw new ErrorProposalResponses('Received transaction proposals are differents');
    // }
    // proposalResponses.forEach((proposal) => {
    //   if (!channel.verifyProposalResponse(proposal)) {
    //     this.logger.warn('Invalid proposal received: %s', proposal);
    //     throw new ErrorProposalResponses('Invalid proposal received');
    //   }
    // });

    const notSatisfiedProposals = proposalResponses.filter(
      (item) => !item.response || item.response.status !== 200
    );

    if (notSatisfiedProposals.length > 0) {
      this.logger.warn('Not satisfied proposals: %s', notSatisfiedProposals);
      throw new ErrorProposalResponses(notSatisfiedProposals.join('; '));
    }
  }
}
