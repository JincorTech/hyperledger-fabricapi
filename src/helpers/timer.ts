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
      if (this.timeoutValue > 0) {
        this.handler = setTimeout(() => {
          this.handler = null;
          resolve('timeout');
        }, this.timeoutValue);
      }
    });
  }

  /**
   * Stop timer
   */
  stop() {
    if (this.handler) {
      clearTimeout(this.handler);
    }
  }

  /**
   * Reset timer
   */
  reset() {
    this.stop();
    return this.start();
  }
}
