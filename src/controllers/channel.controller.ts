import { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { controller, httpDelete, httpPost } from 'inversify-express-utils';
import 'reflect-metadata';

import { FabricClientService } from '../services/fabric.service';
import { ChaincodeServiceType, ChaincodeService } from '../services/chaincode.service';
import { responseAsUnbehaviorError } from '../helpers/responses';

/**
 * ChannelController resource
 */
@injectable()
@controller(
  '/api/channels/:channelname',
  'AuthMiddleware'
)
export class ChannelController {
  constructor(
    @inject(ChaincodeServiceType) private chaincodeService: ChaincodeService
  ) {
  }

  private setChaincodeServiceContext(req: Request) {
    this.chaincodeService.setContext(FabricClientService.createFromRequest(req), req['identification']);
  }

  @httpPost(
    '/chaincodes/:chaincodeid/actions/initiate',
    'ChannelInitiateChaincodeRequestValidator'
  )
  async initiateChaincode(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      this.setChaincodeServiceContext(req);

      const result = await this.chaincodeService.initiateChaincode(
        req.params.channelname,
        req.params.chaincodeid,
        req.body.args,
        req.body.peers,
        req.body.policy
      );

      // @TODO: add more verbose information
      res.json(result);
    } catch (error) {
      responseAsUnbehaviorError(res, error);
    }
  }

  private async callChaincode(req: Request, res: Response, isQuery: boolean) {
    try {
      this.setChaincodeServiceContext(req);

      const result = await this.chaincodeService.callChaincode({
        channelName: req.params.channelname,
        isQuery,
        initiatorUsername: req.body.username,
        chaincodeId: req.params.chaincodeid,
        method: req.body.method,
        args: req.body.args,
        transientMap: req.body.transientMap,
        peers: req.body.peers,
        commitTransaction: req.body.commitTransaction
      });

      // @TODO: add more verbose information
      if (isQuery) {
        res.json(result);
      } else {
        res.json({
          isInvoked: !!result
        });
      }
    } catch (error) {
      responseAsUnbehaviorError(res, error);
    }
  }

  @httpPost(
    '/chaincodes/:chaincodeid/actions/invoke',
    'ChannelCallChaincodeRequestValidator'
  )
  async invokeChaincode(
    req: Request,
    res: Response
  ): Promise<void> {
    await this.callChaincode(req, res, false);
  }

  @httpPost(
    '/chaincodes/:chaincodeid/actions/query',
    'ChannelCallChaincodeRequestValidator'
  )
  async queryChaincode(
    req: Request,
    res: Response
  ): Promise<void> {
    await this.callChaincode(req, res, true);
  }

}
