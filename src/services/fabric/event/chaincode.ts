import { Logger } from '../../../logger';
import { AbstractSubscription } from './subscription';
import { EventHub } from '../eventhub.service';

/**
 * Chaincode subscription.
 */
export class ChaincodeSubscription extends AbstractSubscription {
  private logger = Logger.getInstance('CHAINCODE_SUBSRIPTION');
  private eventHandler: any;

  constructor(
    private eventSub: EventHub,
    private eventHub: any,
    private chaincodeId: string,
    private eventName: string,
    private timeout: number
  ) {
    super();
  }

  /**
   * @inheritdoc
   */
  register() {
    this.logger.verbose('Register', this.chaincodeId, this.eventName);
    this.createTimeoutTimer(this.timeout);

    this.eventHandler = this.eventHub.registerChaincodeEvent(this.chaincodeId, this.eventName, (chaincodeEvent) => {
      this.logger.verbose('Event', this.chaincodeId);
      this.processEvent(this.logger, chaincodeEvent);
    }, (error) => {
      if (this.timer) {
        this.logger.error('Event error', this.chaincodeId, this.eventName, error);
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
