import { injectable } from 'inversify';
import { TlsOptions } from 'tls';
import * as NATS from 'nats';
import 'reflect-metadata';

import allConfigs from '../../config';
import { Logger } from '../../logger';
import { MessageQueue, ConsumerMQMethod } from './interfaces';

const config = allConfigs.mq;

// IoC
export const MessageQueueType = Symbol('MessageQueueType');

/**
 * Nats client as MQ implementation
 */
@injectable()
export class NatsMQ implements MessageQueue {
  protected logger = Logger.getInstance('MQ-NATS');

  protected nats: NATS.Client;
  protected links: number = 0;

  /**
   * Constructor
   */
  constructor() {
    let servers = config.natsServers.split(',');

    this.logger.verbose('Try connect to:', servers);

    this.nats = NATS.connect({
      servers: servers.map(server => `nats://${server}`),
      user: config.natsUser,
      pass: config.natsPassword,
      tls: config.natsTls && {
        rejectUnauthorized: false,
        key: config.natsTlsPrivKey,
        cert: config.natsTlsPubKey,
        ca: config.natsTlsCa
      }
    });
  }

  /**
   * @inheritdoc
   */
  subscribe(channel: string, consumer: ConsumerMQMethod): () => void {
    this.logger.verbose('Subscribe on:', channel);

    let sid = this.nats.subscribe(channel, consumer);
    return () => this.nats.unsubscribe(sid);
  }

  /**
   * @inheritdoc
   */
  publish(channel: string, data: string|Object): Promise<void> {
    this.logger.verbose('Publish to:', channel);
    this.logger.debug('Publish data:', data);

    data = JSON.stringify(data);
    this.nats.publish(channel, data as string);
    return Promise.resolve();
  }
}
