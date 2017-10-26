/**
 * Simple deferred object implementation.
 */
export class Deferred<T> {
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
