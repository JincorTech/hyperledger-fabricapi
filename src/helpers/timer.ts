/**
 * Timeout helper
 */
export class TimeoutPromise {
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
