import { Logger } from '../../../logger';
import { AbstractSubscription } from './subscription';
import { EventHub } from '../eventhub.service';

/**
 * Transaction subscription.
 */
export class TransactionSubscription extends AbstractSubscription {
  private logger = Logger.getInstance('TRANSACTION_SUBSRIPTION');

  constructor(
    private eventSub: EventHub,
    private eventHub: any,
    private transaction: any,
    private timeout: number
  ) {
    super();
  }

  /**
   * @inheritdoc
   */
  register() {
    this.logger.verbose('Register', this.transaction);
    this.createTimeoutTimer(this.timeout);

    this.eventHub.registerTxEvent(this.transaction.getTransactionID(), (transactionId, code) => {
      this.logger.verbose('Event', transactionId, code);
      this.processEvent(this.logger, {transactionId, code});
    }, (error) => {
      if (this.timer) {
        this.logger.error('Event error', this.transaction, error);
        this.unsubscribe();
      }
    });
  }

  /**
   * @inheritdoc
   */
  unsubscribe() {
    if (this.timer) {
      this.logger.verbose('Unsubscribe', this.transaction);
      this.removeTimeoutTimer();
      this.eventHub.unregisterTxEvent(this.transaction);
      this.eventSub.removeSubscriber(this);
    }
  }
}
