import { next } from 'inversify-express-utils/dts/decorators';
import { error } from 'util';
import { Response, Request, NextFunction, Application } from 'express';
import { inject, injectable } from 'inversify';
import * as expressBearerToken from 'express-bearer-token';
import { INTERNAL_SERVER_ERROR, UNAUTHORIZED } from 'http-status';

import { responseWithError } from '../helpers/responses';
import { AuthenticationException } from '../services/security/exceptions';
import { AuthenticationServiceType } from '../services/security/authentication.service';
import { AuthenticationService, IdentificationService } from '../services/security/interfaces';
import { IdentificationServiceType } from '../services/security/identification.service';
import { MetricsService } from '../services/metrics/metrics.service';
import metrics from '../services/metrics';

// IoC
export const AuthMiddlewareType = Symbol('AuthMiddlewareType');

/**
 * Authentication middleware.
 */
@injectable()
export class AuthMiddleware {
  private expressBearer;
  private metricsService = new MetricsService();

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

          this.metricsService.incCounter(metrics.C_AUTH_FAILED, {
            'status': '401'
          });

          return responseWithError(res, INTERNAL_SERVER_ERROR, { error: error.message });
        }

        this.metricsService.incCounter(metrics.C_AUTH_FAILED, {
          'status': '500'
        });

        return responseWithError(res, INTERNAL_SERVER_ERROR, { error });
      }
    });
  }
}
