import * as fs from 'fs';
import * as User from 'fabric-client/lib/User.js';

import { Logger } from '../../../logger';
import { FabricCaClientService } from './client.service';
import { EnrollAttribute } from './interfaces';
import { InvalidArgumentException } from './exceptions';
import { MspProvider } from '../../fabric/msp.service';

/**
 * CertificateEnrollService.
 */
export class CertificateEnrollService {
  private logger = Logger.getInstance('CERTIFICATE_ENROLL');

  constructor(
    private fabricCaClient: FabricCaClientService,
    private mspProvider: MspProvider,
    private mspid: string
  ) {
    if (!mspid) {
      throw new InvalidArgumentException('Invalid mspid');
    }
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

    const newUser = await this.fabricCaClient.getCaClient().createUser({
      username,
      mspid: this.mspid,
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
  async enrollFrom(
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

    const user = await this.mspProvider.loadFromStore(username);
    if (user && user.isEnrolled()) {
      return user;
    }

    this.logger.verbose('Enroll %s', username);

    const fabricCaClient = this.fabricCaClient.getCaClient();
    let enrollment = await fabricCaClient.enroll({
      enrollmentID: username,
      enrollmentSecret: password,
      attr_reqs: attrs
    });

    this.logger.verbose('Set enrollment for user %s', username);

    const fabricClient = this.fabricCaClient.getFabricClient().getClient();
    return await fabricClient.createUser({
      username,
      mspid: this.mspid,
      cryptoContent: {
        privateKeyPEM: enrollment.key.toBytes(),
        signedCertPEM: enrollment.certificate
      }
    });
  }
}
