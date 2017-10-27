export class TransactionBroadcasterException extends Error { }

export class ProposalTransactionException extends Error { }
export class EmptyProposalResponse extends ProposalTransactionException { }
export class ErrorProposalResponses extends ProposalTransactionException { }
