import { responseWithError } from '../helpers/responses';
import * as Joi from 'joi';
import { Response, Request, NextFunction } from 'express';
import { UNPROCESSABLE_ENTITY } from 'http-status';

const options = {
  allowUnknown: true
};

function commonFlowRequestMiddleware(scheme: Joi.Schema, req: Request, res: Response, next: NextFunction) {
  const result = Joi.validate(req.body || {}, scheme, options);

  if (result.error) {
    return responseWithError(res, UNPROCESSABLE_ENTITY, {
      'error': result.error,
      'details': result.value
    });
  } else {
    return next();
  }
}

const jsonSchemeAuthLoginRequest = Joi.object().keys({
  username: Joi.string().empty().required(),
  password: Joi.string().empty().required()
});

export function authLoginRequest(req: Request, res: Response, next: NextFunction) {
  return commonFlowRequestMiddleware(jsonSchemeAuthLoginRequest, req, res, next);
}

const jsonSchemeCertAuthEnrollRequest = Joi.object().keys({
  username: Joi.string().empty().required(),
  password: Joi.string().empty().required()
});

const jsonSchemeCertAuthEnrollFromExistsRequest = Joi.object().keys({
  username: Joi.string().empty().required(),
  privateKeyPath: Joi.string().empty().required(),
  publicKeyPath: Joi.string().empty().required()
});

const jsonSchemeCertAuthRegisterRequest = Joi.object().keys({
  registrarUsername: Joi.string().empty().required(),
  username: Joi.string().empty().required(),
  password: Joi.string().empty().required(),
  role: Joi.string().empty().required(), // @TODO .tags(['admin', 'user', ...])
  affiliation: Joi.string().empty().required()
});

export function certAuthEnrollRequestValidator(req: Request, res: Response, next: NextFunction) {
  return commonFlowRequestMiddleware(jsonSchemeCertAuthEnrollRequest, req, res, next);
}

export function certAuthEnrollFromExistsRequestValidator(req: Request, res: Response, next: NextFunction) {
  return commonFlowRequestMiddleware(jsonSchemeCertAuthEnrollFromExistsRequest, req, res, next);
}

export function certAuthRegisterRequestValidator(req: Request, res: Response, next: NextFunction) {
  return commonFlowRequestMiddleware(jsonSchemeCertAuthRegisterRequest, req, res, next);
}

const jsonSchemeChannelDeployChaincodeRequest = Joi.object().keys({
  id: Joi.string().empty().required(),
  path: Joi.string().empty().required(),
  peers: Joi.array().items(Joi.string()).min(1).unique().required()
});

const jsonRecursiveSchemeChannelPolicy = Joi.object().pattern(
  /^/,
  Joi.alternatives().try(
    Joi.number(),
    Joi.array().items(Joi.lazy(() => jsonRecursiveSchemeChannelPolicy))
  )
).required();

const jsonSchemeChannelInstallChaincodeRequest = Joi.object().keys({
  args: Joi.array().required(),
  peers: Joi.array().items(Joi.string()).min(1).unique().required(),
  eventPeer: Joi.string().empty().optional(),
  policy: Joi.object().keys({
    identities: Joi.array().items(
      Joi.object().keys({
        role: Joi.object().keys({
          name: Joi.string().empty().required(),
          mspId: Joi.string().empty().required()
        }).required()
      })
    ).required(),
    policy: jsonRecursiveSchemeChannelPolicy
  })
});

const jsonSchemeChannelCallChaincodeRequest = Joi.object().keys({
  initiatorUsername: Joi.string().empty().required(),
  method: Joi.string().empty().required(),
  args: Joi.array().items(Joi.string()).required(),
  peers: Joi.array().items(Joi.string()).min(1).unique().required(),
  eventPeer: Joi.string().empty().optional(),
  transientMap: Joi.object().pattern(/^/, Joi.string()),
  commitTransaction: Joi.boolean()
});

export function channelDeployChaincodeRequest(req: Request, res: Response, next: NextFunction) {
  return commonFlowRequestMiddleware(jsonSchemeChannelDeployChaincodeRequest, req, res, next);
}

export function channelInstallChaincodeRequest(req: Request, res: Response, next: NextFunction) {
  return commonFlowRequestMiddleware(jsonSchemeChannelInstallChaincodeRequest, req, res, next);
}

export function channelCallChaincodeRequest(req: Request, res: Response, next: NextFunction) {
  return commonFlowRequestMiddleware(jsonSchemeChannelCallChaincodeRequest, req, res, next);
}

const jsonSchemeChannelQueryBlockRequest = Joi.object().keys({
  block: Joi.string().regex(/^0x[\da-fA-F]+$|^[\d]+$/).empty().required(),
  peers: Joi.array().items(Joi.string()).min(1).unique().required()
});

const jsonSchemeChannelQueryTransactionRequest = Joi.object().keys({
  transaction: Joi.string().regex(/^[\da-fA-F]+$/).empty().required(),
  peers: Joi.array().items(Joi.string()).min(1).unique().required()
});

export function channelQueryBlockRequest(req: Request, res: Response, next: NextFunction) {
  return commonFlowRequestMiddleware(jsonSchemeChannelQueryBlockRequest, req, res, next);
}

export function channelQueryTransactionRequest(req: Request, res: Response, next: NextFunction) {
  return commonFlowRequestMiddleware(jsonSchemeChannelQueryTransactionRequest, req, res, next);
}
