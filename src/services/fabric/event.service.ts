import { Logger } from '../../logger';
import { FabricClientService } from './index';

type CallbackMethod<T, R> = (arg: T) => R;

/**
 * Simple deferred object implementation.
 */
class Deferred<T> {
  protected _resolve;
  protected _reject;
  protected _promise: Promise<T> = new Promise<T>((resolve, reject) => {
    this._resolve = resolve;
    this._reject = reject;
  });

  promise() {
    return this._promise;
  }

  resolve(arg?: T) {
    this._resolve(arg);
  }

  reject(arg?: T) {
    return this._reject(arg);
  }
}

/**
 * Timeout for events
 */
class EventTimeoutHandler {
  private handler = null;

  constructor(private timeoutValue: number) {
  }

  /**
   * Start timer
   */
  start() {
    return new Promise((resolve, reject) => {
      this.handler = setTimeout(() => {
        resolve('timeout');
      }, this.timeoutValue);
    });
  }

  /**
   * Stop timer
   */
  stop() {
    clearTimeout(this.handler);
  }

  /**
   * Reset timer
   */
  reset() {
    this.stop();
    return this.start();
  }
}

const DEFAULT_TIMEOUT = 45000;

/**
 * Register subscription
 */
interface RegisterSubscription {
  /**
   * Subscribe on event
   */
  register();
}

/**
 * AbstractSubscription subscription
 */
export abstract class AbstractSubscription {
  protected callback: CallbackMethod<any, boolean> = null;
  protected timeoutCallback: CallbackMethod<void, void> = null;
  protected timer: EventTimeoutHandler;

  /**
   * Register event listener
   * @param callback
   */
  onEvent(callback: CallbackMethod<any, boolean>, timeoutCallback: CallbackMethod<void, void> = null) {
    this.callback = callback;
    this.timeoutCallback = timeoutCallback;
  }

  /**
   * Notify listener
   * @param arg
   */
  protected notify(arg: any): boolean {
    if (!this.callback) {
      return false;
    }
    return this.callback(arg);
  }

  /**
   * Notify timeout listener
   */
  protected notifyTimeout() {
    if (this.notifyTimeout) {
      this.notifyTimeout();
    }
  }

  /**
   * Process event
   * @param logger
   * @param eventData
   */
  protected processEvent(logger: Logger, eventData: any) {
    try {
      if (this.notify(eventData) === false) {
        this.unsubscribe();
      } else {
        this.timer.reset();
      }
    } catch (error) {
      logger.error('Error was occurred', error);
      this.unsubscribe();
    }
  }

  /**
   * Start timeout timer
   * @param timeout
   */
  protected createTimeoutTimer(timeout: number) {
    this.timer = new EventTimeoutHandler(timeout);
    this.timer.start().then(() => { this.unsubscribe(); this.notifyTimeout(); });
  }

  /**
   * Stop timeout timer
   */
  protected removeTimeoutTimer() {
    if (this.timer) {
      this.timer.stop();
    }
    this.timer = null;
  }

  /**
   * Remove subscription
   */
  abstract unsubscribe();
}

/**
 * Transaction subscription.
 */
class TransactionSubscription extends AbstractSubscription implements RegisterSubscription {
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

/**
 * Chaincode subscription.
 */
class ChaincodeSubscription extends AbstractSubscription implements RegisterSubscription {
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
      this.logger.verbose('Event', this.chaincodeId, chaincodeEvent);
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

/**
 * Block subscription.
 */
class BlockSubscription extends AbstractSubscription implements RegisterSubscription {
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

/**
 * Event hub.
 */
export class EventHub {
  private logger = Logger.getInstance('EVENT_HUB');
  protected eventHub: any;
  protected subscribers: Array<AbstractSubscription & RegisterSubscription> = [];
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
  removeSubscriber(subscription: AbstractSubscription & RegisterSubscription) {
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
