import { Response, Request, NextFunction, Application } from 'express';
import { inject, injectable } from 'inversify';
import * as expressBearerToken from 'express-bearer-token';

import {
    AuthenticationException,
    AuthenticationService,
    AuthenticationServiceType,
    BearerTokenService,
    BearerTokenServiceType,
    IdentificationData,
    IdentificationService,
    IdentificationServiceType,
} from '../services/identify.service';
import { responseWithError } from '../helpers/responses';
import { INTERNAL_SERVER_ERROR, UNAUTHORIZED } from 'http-status';

// IoC
export const AuthMiddlewareType = Symbol('AuthMiddlewareType');

// Exceptions
class NotAuthorizedException extends Error { }

// Authentication Request Interface
interface AuthRequest extends Request {
  token: string;
  tokenDecoded: any;
  identification: IdentificationData;
}

/**
 * Authentication middleware.
 */
@injectable()
export class AuthMiddleware {
  private expressBearer;
  constructor(
    @inject(AuthenticationServiceType) private authenticationService: AuthenticationService,
    @inject(BearerTokenServiceType) private bearerTokenService: BearerTokenService,
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
  async execute(req: AuthRequest, res: Response, next: NextFunction) {
    this.expressBearer(req, res, async() => {
      try {
        if (!await this.authenticationService.validate(req.token)) {
          return responseWithError(res, UNAUTHORIZED, { error: 'Not Authorized' });
        }
        req.tokenDecoded = this.bearerTokenService.decode(req.token);
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
