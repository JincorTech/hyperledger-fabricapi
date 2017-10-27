import * as winston from 'winston';

import config from './config';

export const newConsoleTransport = (name?: string) => new (winston.transports.Console)({
  label: name || '',
  timestamp: true,
  json: config.logging.format === 'json',
  colorize: config.logging.colorize
});

/**
 * Logger
 */
export class Logger extends winston.Logger {
  private static loggers: any = {};

  /**
   * Get logger with name prefixed
   * @param name
   */
  public static getInstance(name: string): Logger {
    name = name || '';
    if (this.loggers[name]) {
      return this.loggers[name];
    }

    return this.loggers[name] = new Logger(name);
  }

  private constructor(private name: string) {
    super({
      level: config.logging.level,
      transports: [newConsoleTransport(name)]
    });
  }
}
