import { Logger } from '../../logger';
import { FabricClientService } from './client.service';
import { AbstractSubscription } from './event/subscription';
import { TransactionSubscription } from './event/transaction';
import { ChaincodeSubscription } from './event/chaincode';
import { BlockSubscription } from './event/block';
import { Deferred } from '../../helpers/deferred';

type CallbackMethod<T, R> = (arg: T) => R;

const DEFAULT_TIMEOUT = 45000;

/**
 * Event hub.
 */
export class EventHub {
  protected logger = Logger.getInstance('EVENT_HUB');
  protected eventHub: any;
  protected subscribers: Array<AbstractSubscription> = [];
  protected isShutdown = false;
  protected deferred: Deferred<void>;

  constructor(fabric: FabricClientService, peerName: string) {
    this.eventHub = fabric.getClient().getEventHub(peerName);
  }

  /**
   * Add subscriber for transaction events.
   * @param transaction
   * @param timeout
   */
  addForTransaction(transaction: any, timeout: number = DEFAULT_TIMEOUT): AbstractSubscription {
    const subscription = new TransactionSubscription(this, this.eventHub, transaction, timeout);
    this.subscribers.push(subscription);
    return subscription;
  }

  /**
   * Add subscriber for chaincode events.
   * @param chaincodeId
   * @param eventName
   * @param timeout
   */
  addForChaincode(chaincodeId: string, eventName: string, timeout: number = DEFAULT_TIMEOUT): AbstractSubscription {
    const subscription = new ChaincodeSubscription(this, this.eventHub, chaincodeId, eventName, timeout);
    this.subscribers.push(subscription);
    return subscription;
  }

  /**
   * Add subscriber for block events.
   * @param timeout
   */
  addForBlock(timeout: number = DEFAULT_TIMEOUT): AbstractSubscription {
    const subscription = new BlockSubscription(this, this.eventHub, timeout);
    this.subscribers.push(subscription);
    return subscription;
  }

  /**
   * Remove subscriber and disconnect from peer if no subscribers.
   * @param subscription
   */
  removeSubscriber(subscription: AbstractSubscription) {
    this.logger.verbose('Removed subscriber', this.subscribers.length);
    this.subscribers.splice(this.subscribers.indexOf(subscription), 1);
    if (!this.subscribers.length && !this.isShutdown) {
      this.logger.verbose('Disconnect');
      this.isShutdown = true;
      this.eventHub.disconnect();
      this.deferred.resolve();
    }
  }

  /**
   * Wait until disconnect from hub
   */
  wait(): Promise<void> {
    this.logger.verbose('Register subscribers', this.subscribers.length);
    this.subscribers.forEach((s) => s.register());

    this.logger.verbose('Connect');
    this.eventHub.connect();
    this.deferred = new Deferred<void>();

    this.logger.verbose('Wait EventHub disconnect');
    return this.deferred.promise();
  }

  /**
   * Unsubscribe and disconnect
   */
  stop() {
    this.logger.verbose('Stop event hub', this.subscribers);
    for (let subscriber = this.subscribers.pop(); subscriber ; ) {
      subscriber.unsubscribe();
    }
  }
}
