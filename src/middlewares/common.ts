import { Response, Request, NextFunction, Application } from 'express';
import { inject, injectable } from 'inversify';
import * as expressBearerToken from 'express-bearer-token';

import {
    AuthenticationException,
    AuthenticationService,
    AuthenticationServiceType,
    BearerTokenService,
    BearerTokenServiceType,
    IdentificationService,
    IdentificationServiceType
} from '../services/identify.service';
import { responseWithError } from '../helpers/responses';
import { INTERNAL_SERVER_ERROR, UNAUTHORIZED } from 'http-status';

// IoC
export const AuthMiddlewareType = Symbol('AuthMiddlewareType');

// Exceptions
class NotAuthorizedException extends Error { }

/**
 * Authentication middleware.
 */
@injectable()
export class AuthMiddleware {
  private expressBearer;
  constructor(
    @inject(AuthenticationServiceType) private authenticationService: AuthenticationService,
    @inject(IdentificationServiceType) private identService: IdentificationService
  ) {
    this.expressBearer = expressBearerToken();
  }

  /**
   * Execute authentication
   *
   * @param req Request
   * @param res Response
   * @param next NextFunction
   */
  async execute(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    this.expressBearer(req, res, async() => {
      try {
        req.tokenDecoded = await this.authenticationService.validate(req.token);
        if (req.tokenDecoded === null) {
          return responseWithError(res, UNAUTHORIZED, { error: 'Not Authorized' });
        }
        req.identification = await this.identService.getByUsername(req.tokenDecoded.username);
        next();
      } catch (error) {
        if (error instanceof AuthenticationException) {
          return responseWithError(res, INTERNAL_SERVER_ERROR, { error: error.message });
        }
        return responseWithError(res, INTERNAL_SERVER_ERROR, { error });
      }
    });
  }
}
