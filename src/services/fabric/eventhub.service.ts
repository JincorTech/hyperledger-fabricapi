import { setTimeout } from 'timers';
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

  constructor(protected fabric: FabricClientService, protected peerName: string) {
    this.eventHub = this.getEventHub(peerName);
  }

  private getEventHub(peerName: string): any {
    return this.fabric.getClient().getEventHub(peerName);
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
    this.logger.verbose('Remove subscriber', this.subscribers.length);
    this.subscribers.splice(this.subscribers.indexOf(subscription), 1);
    if (!this.subscribers.length && !this.isShutdown) {
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
    this.isShutdown = false;
    this.eventHub.connect();
    this.deferred = new Deferred<void>();

    this.logger.verbose('Wait EventHub disconnect');
    return this.deferred.promise();
  }

  /**
   * Unsubscribe and disconnect
   */
  stop() {
    this.logger.verbose('Stop event hub', this.subscribers.length);
    let subscriber: AbstractSubscription;
    while (true) {
      subscriber = this.subscribers.pop();
      if (!subscriber) {
        return;
      }
      subscriber.unsubscribe();
    }
  }

  /**
   * Reconnect
   */
  reconnect(): boolean {
    if (this.subscribers.length && !this.isShutdown) {
      this.logger.verbose('Reconnecting...');
      this.eventHub.disconnect();
      // @TODO: Fix growing up options of eventHub._ev.options
      this.eventHub = this.getEventHub(this.peerName);
      this.subscribers.forEach((s) => s.register());
      this.eventHub.connect();
      return true;
    }
    return false;
  }

  /**
   * Get associated fabric client
   */
  getClient(): FabricClientService {
    return this.fabric;
  }
}
