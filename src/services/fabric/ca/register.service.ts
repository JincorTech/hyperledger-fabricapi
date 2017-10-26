import { Logger } from '../../../logger';
import { MspProvider } from '../../fabric/msp.service';
import { EnrollAttribute } from './interfaces';
import { InvalidArgumentException, NotFoundException } from './exceptions';
import { FabricCaClientService } from './client.service';
import * as User from 'fabric-client/lib/User.js';

// IoC
export const CertificateAuthorityServiceType = Symbol(
  'CertificateAuthorityServiceType'
);

/**
 * UserRegistrarService in Fabric-CA.
 */
export class UserRegistrarService {
  private logger = Logger.getInstance('USER REGISTRAR');
  private registrarUser: User;

  constructor(
    private fabricCaClient: FabricCaClientService,
    private mspProvider: MspProvider,
    private registrarUsername: string
  ) {
    if (!registrarUsername) {
      throw new InvalidArgumentException('Invalid registrarUsername');
    }
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
    role: string,
    username: string,
    password: string,
    affiliation: string,
    attrs?: Array<EnrollAttribute>
  ): Promise<string> {
    this.logger.verbose('Register new user %s', username);

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

    if (!this.registrarUser) {
      this.registrarUser = await this.mspProvider.loadFromStore(this.registrarUsername);
      if (!this.registrarUser || !this.registrarUser.isEnrolled()) {
        throw new NotFoundException('Registrar user not found in the storage');
      }
    }

    this.logger.verbose('Call to register', role, username, affiliation);
    const userSecret = await this.fabricCaClient.getCaClient().register(
      {
        enrollmentID: username,
        enrollmentSecret: password || undefined,
        role,
        affiliation,
        attrs: attrs
      },
      this.registrarUser
    );

    return userSecret || password;
  }
}
