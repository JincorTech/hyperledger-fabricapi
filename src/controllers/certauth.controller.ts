import { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { controller, httpDelete, httpPost } from 'inversify-express-utils';
import 'reflect-metadata';

import { responseAsUnbehaviorError } from '../helpers/responses';
import { CertificateAuthorityApplicationType, CertificateAuthorityApplication } from '../apps/certauth.app';
import { FabricClientService } from '../services/fabric/client.service';

/**
 * CertAuthController resource
 */
@injectable()
@controller(
  '/api/cert-auths',
  'AuthMiddleware'
)
export class CertAuthController {
  constructor(
    @inject(CertificateAuthorityApplicationType) private certAuthService: CertificateAuthorityApplication
  ) {
  }

  private setCertAuthServiceContext(req: AuthenticatedRequest) {
    this.certAuthService.setContext(new FabricClientService(req.identification), req.identification);
  }

  @httpPost(
    '/users/actions/enroll-from',
    'CertAuthEnrollFromExistsRequestValidator'
  )
  async enrollExisting(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      this.setCertAuthServiceContext(req);

      const enrollResult = await this.certAuthService.enrollFromExistingKeys(
        req.body.username,
        req.body.privateKeyPath,
        req.body.publicKeyPath
      );

      // @TODO: add more verbose information
      res.json({
        username: req.body.username,
        isEnrolled: !!enrollResult
      });
    } catch (error) {
      responseAsUnbehaviorError(res, error);
    }
  }

  @httpPost(
    '/users/actions/enroll',
    'CertAuthEnrollRequestValidator'
  )
  async enroll(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      this.setCertAuthServiceContext(req);

      const enrollResult = await this.certAuthService.enroll(
        req.body.username,
        req.body.password
      );

      // @TODO: add more verbose information
      res.json({
        username: req.body.username,
        isEnrolled: !!enrollResult
      });
    } catch (error) {
      responseAsUnbehaviorError(res, error);
    }
  }

  @httpPost(
    '/users/actions/register',
    'CertAuthRegisterRequestValidator'
  )
  async register(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      this.setCertAuthServiceContext(req);

      const registerResult = await this.certAuthService.register(
        req.body.registrarUsername,
        req.body.role,
        req.body.username,
        req.body.password,
        req.body.affiliation
      );

      // @TODO: add more verbose information
      res.json({
        username: req.body.username,
        isRegistered: !!registerResult
      });
    } catch (error) {
      responseAsUnbehaviorError(res, error);
    }
  }
}
