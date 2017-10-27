import { injectable, inject } from 'inversify';
import 'reflect-metadata';

import config from '../../config';
import { Logger } from '../../logger';
import { AuthenticationService, BearerTokenService, IdentificationService } from './interfaces';
import { BearerTokenServiceType } from './token.service';
import { IdentificationServiceType } from './identification.service';

// IoC
export const AuthenticationServiceType = Symbol('AuthenticationServiceType');

/**
 * StandardAuthenticateionService
 */
@injectable()
export class StandardAuthenticationService implements AuthenticationService {
  private logger = Logger.getInstance('STANDARD_AUTHENTICATION');

  constructor(
    @inject(IdentificationServiceType) private identifyService: IdentificationService,
    @inject(BearerTokenServiceType) private tokenService: BearerTokenService
  ) {
  }

  /**
   * @inheritdoc
   */
  async authenicate(username: string, password: string): Promise<string> {
    this.logger.verbose('Authenticate user %s', username);
    const identify = await this.identifyService.identify(username, password);
    if (identify === null) {
      return '';
    }

    this.logger.verbose('Generate and send a new token for user %s', username);

    return await this.tokenService.generate({
      mspId: identify.mspId,
      username: identify.username,
      role: identify.role
    });
  }

  /**
   * @inheritdoc
   */
  async validate(token: string): Promise<object|null> {
    this.logger.verbose('Validate token %s', token);
    if (!token || !await this.tokenService.validate(token)) {
      this.logger.verbose('Token is invalid %s', token);
      return null;
    }
    this.logger.verbose('Token is valid %s', token);
    return this.tokenService.decode(token);
  }
}
