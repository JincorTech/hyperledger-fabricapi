import { injectable } from 'inversify';
import * as jwt from 'jsonwebtoken';
import 'reflect-metadata';

import config from '../../config';
import { Logger } from '../../logger';
import { BearerTokenService } from './interfaces';
import { BearerTokenException } from './exceptions';

// IoC
export const BearerTokenServiceType = Symbol('BearerTokenServiceType');

/**
 * Jwt Token
 */
@injectable()
export class JwtBearerTokenService implements BearerTokenService {
  private logger = Logger.getInstance('JWT_BEARER_TOKEN');
  private secret: string;
  private algorithm: string;
  private expiresIn: string;

  /**
   * Creates jwt service instance
   */
  constructor() {
    this.secret = config.jwt.secret;
    if (!this.secret) {
      throw new BearerTokenException('No JWT secret was passed');
    }
    this.algorithm = config.jwt.algorithm;
    this.expiresIn = config.jwt.expires;
  }

  /**
   * @inheritdoc
   */
  async validate(jwtToken: string): Promise<boolean> {
    this.logger.verbose('validate token');
    try {
      jwt.verify(jwtToken, config.jwt.secret, {algorithms: [this.algorithm]});
      this.logger.verbose('success');
      return true;
    } catch (error) {
      this.logger.verbose('error', error);
      return false;
    }
  }

  /**
   * @inheritdoc
   */
  decode(jwtToken: string): any {
    return jwt.decode(jwtToken);
  }

  /**
   * @inheritdoc
   */
  async generate(payload: any): Promise<string> {
    this.logger.verbose('Generate new token', payload);
    const token = jwt.sign(payload, config.jwt.secret, {algorithm: this.algorithm, expiresIn: this.expiresIn});
    return token;
  }
}
