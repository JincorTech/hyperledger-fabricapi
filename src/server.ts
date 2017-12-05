import { MessageQueueType } from './services/mq/natsmq.service';
import { EventsFabricApplication } from './apps/events.app';
import * as express from 'express';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import { Response, Request, NextFunction, Application } from 'express';
import * as bodyParser from 'body-parser';
import { InversifyExpressServer } from 'inversify-express-utils';
import * as winston from 'winston';
import * as expressWinston from 'express-winston';
import { NOT_ACCEPTABLE } from 'http-status';

import config from './config';
import { Logger, newConsoleTransport } from './logger';
import { container } from './ioc.container';
import { IdentificationService } from './services/security/interfaces';
import { MessageQueue } from './services/mq/interfaces';
import { IdentificationServiceType } from './services/security/identification.service';

winston.configure({
  level: config.logging.level,
  transports: [newConsoleTransport()]
});

const serverLogger = Logger.getInstance('SERVER');
serverLogger.verbose('Configurating...');

const app: Application = express();

app.disable('x-powered-by');
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.url.indexOf('/metrics/') === 0) {
    return next();
  }

  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }
  const acceptHeader = req.header('Accept') || '';

  if (acceptHeader !== 'application/json' && acceptHeader.indexOf('application/vnd.jincor+json;') !== 0) {
    return res.status(NOT_ACCEPTABLE).json({
      error: 'Unsupported "Accept" header'
    });
  }

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'deny');
  res.setHeader('Content-Security-Policy', 'default-src \'none\'');

  return next();
});
app.all('*', (req: Request, res: Response, next: NextFunction) => {
  if (req.url.indexOf('/metrics/') === 0) {
    return next();
  }

  if (req.header('Content-Type') !== 'application/json') {
    return res.status(NOT_ACCEPTABLE).json({
      error: 'Unsupported "Content-Type"'
    });
  }

  return next();
});

const defaultExpressLoggerConfig = {
  transports: [newConsoleTransport()],
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}}',
  expressFormat: true,
  colorize: true,
  ignoreRoute: (req, res) => false
};

app.use(expressWinston.logger(defaultExpressLoggerConfig));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

let server = (new InversifyExpressServer(container, null, null, app)).build();

app.use(expressWinston.errorLogger(defaultExpressLoggerConfig));

if (!config.server.http && !config.server.https) {
  serverLogger.error('There is no configured HTTP(S) server');
  throw new Error('No servers configured');
}

/**
 * Run global fabric event listener
 */
const eventApp = new EventsFabricApplication(
  container.get<IdentificationService>(IdentificationServiceType),
  container.get<MessageQueue>(MessageQueueType)
);

serverLogger.info('Start listener in blink mode');
eventApp.runInBlinkMode();

/**
 * Create HTTP server.
 */
if (config.server.http) {
  serverLogger.verbose('Create HTTP server...');
  const httpServer = http.createServer(server);
  httpServer.listen(config.server.httpPort, config.server.httpIp);
  serverLogger.info('Listen HTTP on %s:%s', config.server.httpIp, config.server.httpPort);
}

/**
 * Create HTTPS server.
 */
if (config.server.https) {
  winston.log('verbose', 'Create HTTPS server...');
  const httpsOptions = {
    // crl: '',
    requestCert: config.server.httpsRequestClientCert,
    ca: fs.readFileSync(config.server.httpsCa),
    key: fs.readFileSync(config.server.httpsPrivKey),
    cert: fs.readFileSync(config.server.httpsPubKey)
  };
  const httpsServer = https.createServer(httpsOptions, server);
  httpsServer.listen(config.server.httpsPort, config.server.httpsIp);
  winston.log('info', 'Listen HTTPS on %s:%s', config.server.httpsIp, config.server.httpsPort);
}
