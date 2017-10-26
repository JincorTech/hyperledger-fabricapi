import * as User from 'fabric-client/lib/User.js';
import { injectable } from 'inversify';
import 'reflect-metadata';

import { Logger } from '../logger';
import { UserRegistrarService } from '../services/fabric/ca/register.service';
import { EnrollAttribute } from '../services/fabric/ca/interfaces';
import { FabricClientService } from '../services/fabric/client.service';
import { CertificateEnrollService } from '../services/fabric/ca/enroll.service';
import { FabricCaClientService } from '../services/fabric/ca/client.service';
import { MspProvider } from '../services/fabric/msp.service';

// IoC
export const CertificateAuthorityApplicationType = Symbol(
  'CertificateAuthorityApplicationType'
);

/**
 * Certificate authority application.
 */
@injectable()
export class CertificateAuthorityApplication {
  private logger = Logger.getInstance('CERTIFICATE_AUTHORITY_APPLICATION');
  private fabricCaService: FabricCaClientService;
  private identityData: IdentificationData;

  /**
   * Set instance context.
   *
   * @param fabricService
   * @param identityData
   */
  setContext(
    fabricService: FabricClientService,
    identityData: IdentificationData
  ) {
    this.identityData = identityData;
    fabricService.setClientMsp(identityData.mspId);
    this.fabricCaService = new FabricCaClientService(fabricService, identityData);
  }

  /**
   * Enroll new certificate from the existing keys pair.
   *
   * @param username
   * @param privateKeyPath
   * @param signedCertPath
   */
  async enrollFromExistingKeys(
    username: string,
    privateKeyPath: string,
    signedCertPath: string
  ): Promise<User> {
    this.logger.verbose(
      'Enroll certificate from exisiting keys for %s',
      username
    );

    const caEnroll = new CertificateEnrollService(
      this.fabricCaService,
      new MspProvider(this.fabricCaService.getFabricClient()),
      this.identityData.mspId
    );

    return await caEnroll.enrollFromExistingKeys(username, privateKeyPath, signedCertPath);
  }

  /**
   * Get keys pair for the user.
   *
   * @param username
   * @param password
   * @param attrs
   */
  async enroll(
    username: string,
    password: string,
    attrs?: Array<EnrollAttribute>
  ): Promise<User> {
    this.logger.verbose('Enroll certificate for %s', username);

    const caEnroll = new CertificateEnrollService(
      this.fabricCaService,
      new MspProvider(this.fabricCaService.getFabricClient()),
      this.identityData.mspId
    );

    this.logger.verbose('Enroll %s', username);

    return await caEnroll.enrollFrom(username, password, attrs);
  }

  /**
   * Register a new user in the CA for subsequence cert. enroll.
   *
   * @param registrarUsername
   * @param role
   * @param username
   * @param password
   * @param affiliation
   * @param attrs
   */
  async register(
    registrarUsername: string,
    role: string,
    username: string,
    password: string,
    affiliation: string,
    attrs?: Array<EnrollAttribute>
  ): Promise<string> {
    this.logger.verbose('Register new user %s', username);

    const caRegistrar = new UserRegistrarService(
      this.fabricCaService,
      new MspProvider(this.fabricCaService.getFabricClient()),
      registrarUsername
    );

    this.logger.verbose('Register new user %s', username);

    return caRegistrar.register(role, username, password, affiliation, attrs);
  }
}
