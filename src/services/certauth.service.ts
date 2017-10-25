import * as fs from 'fs';
import * as User from 'fabric-client/lib/User.js';
import { injectable, inject } from 'inversify';

import { Logger } from '../logger';
import { FabricClientService } from './fabric';

// IoC
export const CertificateAuthorityServiceType = Symbol(
  'CertificateAuthorityServiceType'
);

// Exceptions
export class CertificateAuthorityException extends Error {}
export class InvalidArgumentException extends CertificateAuthorityException {}
export class NotFoundException extends CertificateAuthorityException {}

// Types
/**
 * Attribute passed to the certificate as OID 1.2.3.4.5.6.7.8.1
 */
export interface EnrollAttribute {
  name: string;
  value: string;
  required?: boolean;
}

/**
 * CertificateAuthorityService to work with certificate enrollment.
 */
@injectable()
export class CertificateAuthorityService {
  private logger = Logger.getInstance('CERTIFICATE_AUTHORITY');
  private isCredentialStoresInitialized: boolean = false;
  private fabricService: FabricClientService;
  private identityData: IdentificationData;

  /**
   * Set instance context.
   * @param fabricService
   */
  setContext(
    fabricService: FabricClientService,
    identityData: IdentificationData
  ): CertificateAuthorityService {
    this.fabricService = fabricService;
    this.identityData = identityData;
    this.fabricService.setClientMsp(identityData.mspId);
    return this;
  }

  private async initCredentialsStores(): Promise<void> {
    if (this.isCredentialStoresInitialized) {
      return;
    }

    this.logger.verbose('Initiate credential stores');

    await this.fabricService.getClient().initCredentialStores();
    this.isCredentialStoresInitialized = true;
  }

  private getCa() {
    const caClient = this.fabricService.getClient().getCertificateAuthority();
    if (!caClient) {
      this.logger.error('CA not found');
      throw new NotFoundException('CA not found');
    }
    return caClient;
  }

  private async loadFromStore(username: string) {
    const client = this.fabricService.getClient();
    this.logger.verbose('Get from store %s', username);
    client._userContext = null;
    return await client.getUserContext(username, true);
  }

  /**
   * Enroll new certificate from the existing keys pair.
   *
   * @param username
   * @param mspid
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

    // @TODO: Validate args
    if (!username) {
      throw new InvalidArgumentException('Invalid username');
    }
    if (!privateKeyPath) {
      throw new InvalidArgumentException('Invalid privateKeyPath');
    }
    if (!signedCertPath) {
      throw new InvalidArgumentException('Invalid signedCertPath');
    }

    const newUser = await this.fabricService.getClient().createUser({
      username,
      mspid: this.identityData.mspId,
      cryptoContent: {
        privateKeyPath: fs.readFileSync(privateKeyPath, { encoding: 'utf8' }),
        signedCertPath: fs.readFileSync(signedCertPath, { encoding: 'utf8' })
      }
    });

    return newUser;
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

    if (!username) {
      throw new InvalidArgumentException('Invalid username');
    }
    if (!password) {
      throw new InvalidArgumentException('Invalid password');
    }

    const caClient = await this.getCa();
    const client = this.fabricService.getClient();

    await this.initCredentialsStores();

    const user = await this.loadFromStore(username);
    if (user && user.isEnrolled()) {
      return user;
    }

    this.logger.verbose('Enroll %s', username);
    let enrollment = await caClient.enroll({
      enrollmentID: username,
      enrollmentSecret: password,
      attr_reqs: attrs
    });

    this.logger.verbose('Set enrollment for user %s', username);

    return await client.createUser({
      username,
      mspid: this.identityData.mspId,
      cryptoContent: {
        privateKeyPEM: enrollment.key.toBytes(),
        signedCertPEM: enrollment.certificate
      }
    });
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

    if (!registrarUsername) {
      throw new InvalidArgumentException('Invalid registrarUsername');
    }
    if (!role) {
      throw new InvalidArgumentException('Invalid role');
    }
    if (!username) {
      throw new InvalidArgumentException('Invalid username');
    }
    if (!password) {
      throw new InvalidArgumentException('Invalid password');
    }
    if (!affiliation) {
      throw new InvalidArgumentException('Invalid affiliation');
    }

    await this.initCredentialsStores();

    const caClient = await this.getCa();
    const client = this.fabricService.getClient();

    const user = await this.loadFromStore(registrarUsername);
    if (!user || !user.isEnrolled()) {
      throw new NotFoundException('Registrar user not found in the storage');
    }

    this.logger.verbose('Call to register %s', username);
    const userSecret = await caClient.register(
      {
        enrollmentID: username,
        enrollmentSecret: password || undefined,
        role,
        affiliation,
        attrs: attrs
      },
      user
    );

    return userSecret || password;
  }
}
