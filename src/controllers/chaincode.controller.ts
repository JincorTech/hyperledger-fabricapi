import { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { controller, httpDelete, httpPost } from 'inversify-express-utils';
import 'reflect-metadata';

import { responseAsUnbehaviorError } from '../helpers/responses';
import { ChaincodeApplicationType, ChaincodeApplication } from '../apps/chaincode.app';
import { FabricClientService } from '../services/fabric/client.service';

/**
 * ChaincodeController resource
 */
@injectable()
@controller(
  '/api/chaincodes',
  'AuthMiddleware'
)
export class ChaincodeController {
  constructor(
    @inject(ChaincodeApplicationType) private chaincodeService: ChaincodeApplication
  ) {
  }

  private setChaincodeServiceContext(req: AuthenticatedRequest) {
    this.chaincodeService.setContext(new FabricClientService(req.identification), req.identification);
  }

  @httpPost(
    '/actions/deploy',
    'ChannelDeployChaincodeRequestValidator'
  )
  async deployChaincode(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      this.setChaincodeServiceContext(req);

      const result = await this.chaincodeService.deployChaincode(
        req.body.id,
        req.body.path,
        req.body.peers
      );

      // @TODO: add more verbose information
      res.json({
        isDeployed: !!result
      });
    } catch (error) {
      responseAsUnbehaviorError(res, error);
    }
  }
}
