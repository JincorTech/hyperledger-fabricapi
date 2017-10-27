import { Logger } from '../../../logger';
import { AbstractSubscription } from './subscription';
import { EventHub } from '../eventhub.service';

/**
 * Block subscription.
 */
export class BlockSubscription extends AbstractSubscription {
  private logger = Logger.getInstance('BLOCK_SUBSRIPTION');
  private eventHandler: any;

  constructor(private eventSub: EventHub, private eventHub: any, private timeout: number) {
    super();
  }

  /**
   * @inheritdoc
   */
  register() {
    this.logger.verbose('Register');
    this.createTimeoutTimer(this.timeout);

    this.eventHandler = this.eventHub.registerBlockEvent((block) => {
      this.logger.verbose('Event', block);
      this.processEvent(this.logger, block);
    }, (error) => {
      if (this.timer) {
        this.logger.error('Event error', error);
        this.unsubscribe();
      }
    });
  }

  /**
   * @inheritdoc
   */
  unsubscribe() {
    if (this.timer) {
      this.logger.verbose('Unsubscribe', this.eventHandler);
      this.removeTimeoutTimer();
      this.eventHub.unregisterChaincodeEvent(this.eventHandler);
      this.eventSub.removeSubscriber(this);
    }
  }
}
