import { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { controller, httpDelete, httpPost } from 'inversify-express-utils';
import 'reflect-metadata';

import { FabricClientService } from '../services/fabric';
import { ChaincodeServiceType, ChaincodeService } from '../services/chaincode.service';
import { responseAsUnbehaviorError } from '../helpers/responses';

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
    @inject(ChaincodeServiceType) private chaincodeService: ChaincodeService
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
