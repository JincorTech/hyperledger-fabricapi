import { Container } from 'inversify';
import { interfaces, TYPE } from 'inversify-express-utils';
import * as express from 'express';

import * as commonMiddlewares from './middlewares/common';
import * as securityInterfaces from './services/security/interfaces';
import * as token from './services/security/token.service';
import * as mqInterfaces from './services/mq/interfaces';
import * as natsmq from './services/mq/natsmq.service';
import * as identification from './services/security/identification.service';
import * as authentication from './services/security/authentication.service';
import * as certauth from './apps/certauth.app';
import * as chaincode from './apps/chaincode.app';
import * as info from './apps/info.app';

import { AuthController } from './controllers/auth.controller';
import { ChannelController } from './controllers/channel.controller';
import { ChaincodeController } from './controllers/chaincode.controller';
import { CertAuthController } from './controllers/certauth.controller';
import * as validators from './middlewares/request.validators';

let container = new Container();

// services
container.bind<securityInterfaces.BearerTokenService>(token.BearerTokenServiceType)
  .to(token.JwtBearerTokenService).inSingletonScope();

container.bind<securityInterfaces.IdentificationService>(identification.IdentificationServiceType)
  .to(identification.FileIdentificationService).inSingletonScope();

container.bind<securityInterfaces.AuthenticationService>(authentication.AuthenticationServiceType)
  .to(authentication.StandardAuthenticationService).inSingletonScope();

container.bind<mqInterfaces.MessageQueue>(natsmq.MessageQueueType)
  .to(natsmq.NatsMQ).inSingletonScope();

container.bind<certauth.CertificateAuthorityApplication>(certauth.CertificateAuthorityApplicationType)
  .to(certauth.CertificateAuthorityApplication);

container.bind<chaincode.ChaincodeApplication>(chaincode.ChaincodeApplicationType)
  .to(chaincode.ChaincodeApplication);

container.bind<info.InfoApplication>(info.InfoApplicationType)
  .to(info.InfoApplication);

// middlewares
container.bind<commonMiddlewares.AuthMiddleware>(commonMiddlewares.AuthMiddlewareType)
  .to(commonMiddlewares.AuthMiddleware);

const authMiddleware = container
  .get<commonMiddlewares.AuthMiddleware>(commonMiddlewares.AuthMiddlewareType);

// request validators
container.bind<express.RequestHandler>('AuthLoginRequestValidator').toConstantValue(
  (req: any, res: any, next: any) => validators.authLoginRequest(req, res, next)
);
container.bind<express.RequestHandler>('CertAuthEnrollRequestValidator').toConstantValue(
  (req: any, res: any, next: any) => validators.certAuthEnrollRequestValidator(req, res, next)
);
container.bind<express.RequestHandler>('CertAuthEnrollFromExistsRequestValidator').toConstantValue(
  (req: any, res: any, next: any) => validators.certAuthEnrollFromExistsRequestValidator(req, res, next)
);
container.bind<express.RequestHandler>('CertAuthRegisterRequestValidator').toConstantValue(
  (req: any, res: any, next: any) => validators.certAuthRegisterRequestValidator(req, res, next)
);

container.bind<express.RequestHandler>('ChannelDeployChaincodeRequestValidator').toConstantValue(
  (req: any, res: any, next: any) => validators.channelDeployChaincodeRequest(req, res, next)
);
container.bind<express.RequestHandler>('ChannelInstallChaincodeRequestValidator').toConstantValue(
  (req: any, res: any, next: any) => validators.channelInstallChaincodeRequest(req, res, next)
);
container.bind<express.RequestHandler>('ChannelCallChaincodeRequestValidator').toConstantValue(
  (req: any, res: any, next: any) => validators.channelCallChaincodeRequest(req, res, next)
);

container.bind<express.RequestHandler>('ChannelQueryBlockRequestValidator').toConstantValue(
  (req: any, res: any, next: any) => validators.channelQueryBlockRequest(req, res, next)
);
container.bind<express.RequestHandler>('ChannelQueryTransactionRequestValidator').toConstantValue(
  (req: any, res: any, next: any) => validators.channelQueryTransactionRequest(req, res, next)
);

/* istanbul ignore next */
container.bind<express.RequestHandler>('AuthMiddleware').toConstantValue(
 (req: any, res: any, next: any) => authMiddleware.execute(req, res, next)
);

// controllers
container.bind<interfaces.Controller>(TYPE.Controller).to(AuthController).whenTargetNamed('AuthController');
container.bind<interfaces.Controller>(TYPE.Controller).to(CertAuthController).whenTargetNamed('CertAuthController');
container.bind<interfaces.Controller>(TYPE.Controller).to(ChannelController).whenTargetNamed('ChannelController');
container.bind<interfaces.Controller>(TYPE.Controller).to(ChaincodeController).whenTargetNamed('ChaincodeController');

export { container };
