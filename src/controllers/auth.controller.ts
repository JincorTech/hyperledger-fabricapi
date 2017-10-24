import { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { controller, httpDelete, httpPost } from 'inversify-express-utils';
import { INTERNAL_SERVER_ERROR, UNAUTHORIZED } from 'http-status';
import 'reflect-metadata';

import { AuthenticationService, AuthenticationServiceType } from '../services/identify.service';
import { responseAsUnbehaviorError } from '../helpers/responses';

interface AuthenticateAdminRequest extends Request {
  params: {
    username: string;
    password: string;
  };
}

/**
 * AuthController resource
 */
@injectable()
@controller(
  '/api/auth'
)
export class AuthController {
  constructor(
    @inject(AuthenticationServiceType) private auth: AuthenticationService
  ) {
  }

  @httpPost(
    '/login',
    'AuthLoginRequestValidator'
  )
  async authernicate(req: AuthenticateAdminRequest, res: Response): Promise<void> {
    try {
      const token = await this.auth.authenicate(req.body.username, req.body.password);
      if (!token) {
        res.status(UNAUTHORIZED).json({
          message: 'Not authorized'
        });
      } else {
        res.json({
          token
        });
      }
    } catch (error) {
      responseAsUnbehaviorError(res, error);
    }
  }
}
