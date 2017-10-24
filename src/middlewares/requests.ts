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
  username: Joi.string().min(1).required(),
  password: Joi.string().min(1).required()
});

export function authLoginRequest(req: Request, res: Response, next: NextFunction) {
  return commonFlowRequestMiddleware(jsonSchemeAuthLoginRequest, req, res, next);
}

const jsonSchemeCertAuthEnrollRequest = Joi.object().keys({
  username: Joi.string().min(1).required(),
  password: Joi.string().min(1).required()
});

const jsonSchemeCertAuthEnrollFromExistsRequest = Joi.object().keys({
  username: Joi.string().min(1).required(),
  privateKeyPath: Joi.string().min(1).required(),
  publicKeyPath: Joi.string().min(1).required()
});

const jsonSchemeCertAuthRegisterRequest = Joi.object().keys({
  registerarUsername: Joi.string().min(1).required(),
  username: Joi.string().min(1).required(),
  password: Joi.string().min(1).required(),
  role: Joi.string().min(1).required(),
  affiliation: Joi.string().min(1).required()
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
  id: Joi.string().min(1).required(),
  path: Joi.string().min(1).required(),
  peers: Joi.array().items(Joi.string()).required()
});

const jsonSchemeChannelInitiateChaincodeRequest = Joi.object().keys({
  args: Joi.array().required(),
  peers: Joi.array().items(Joi.string()).required(),
  policy: Joi.object()
});

const jsonSchemeChannelCallChaincodeRequest = Joi.object().keys({
  initiatorUsername: Joi.string().min(1).required(),
  method: Joi.string().min(1).required(),
  args: Joi.array().items(Joi.string()).required(),
  peers: Joi.array().items(Joi.string()).required(),
  transientMap: Joi.object(),
  commitTransaction: Joi.boolean()
});

export function channelDeployChaincodeRequest(req: Request, res: Response, next: NextFunction) {
  return commonFlowRequestMiddleware(jsonSchemeChannelDeployChaincodeRequest, req, res, next);
}

export function channelInitiateChaincodeRequest(req: Request, res: Response, next: NextFunction) {
  return commonFlowRequestMiddleware(jsonSchemeChannelInitiateChaincodeRequest, req, res, next);
}

export function channelCallChaincodeRequest(req: Request, res: Response, next: NextFunction) {
  return commonFlowRequestMiddleware(jsonSchemeChannelCallChaincodeRequest, req, res, next);
}
