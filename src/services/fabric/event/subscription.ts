import { TimeoutPromise } from '../../../helpers/timer';
import { Logger } from '../../../logger';

type CallbackMethod<T, R> = (arg: T) => R;

/**
 * AbstractSubscription subscription
 */
export abstract class AbstractSubscription {
  protected callback: CallbackMethod<any, boolean> = null;
  protected timeoutCallback: CallbackMethod<void, void> = null;
  protected timer: TimeoutPromise;

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
    this.timer = new TimeoutPromise(timeout);
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

  /**
   * Subscribe on event
   */
  abstract register();
}
