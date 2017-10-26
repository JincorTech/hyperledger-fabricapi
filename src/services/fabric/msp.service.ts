import * as User from 'fabric-client/lib/User.js';
import * as FabricClient from 'fabric-client/lib/Client.js';

import { Logger } from '../../logger';
import { MspProviderException } from './exceptions';
import { FabricClientService } from './client.service';

/**
 * MspProvider
 */
export class MspProvider {
  private logger = Logger.getInstance('MSP_PROVIDER');
  private isCredentialStoresInitialized = false;

  constructor(private fabric: FabricClientService) {
  }

  private async initCredStores() {
    if (this.isCredentialStoresInitialized) {
      return;
    }

    this.logger.verbose('Initiate credential stores');

    await this.fabric.getClient().initCredentialStores();
    this.isCredentialStoresInitialized = true;
  }

  /**
   * Load user msp from storage
   * @param username
   */
  async loadFromStore(username: string) {
    const client = this.fabric.getClient();
    this.logger.verbose('Get from store %s', username);
    await this.initCredStores();
    return await client.getUserContext(username, true);
  }

  /**
   * Set current user
   * @param userContext
   */
  setUserContext(userContext: User) {
    this.logger.verbose('Set user context');
    this.fabric.getClient()._userContext = userContext;
  }

  /**
   * Set stored user from storage
   * @param username
   */
  async setUserFromStorage(username: string) {
    this.logger.verbose('Set user from storage for %s', username);
    await this.initCredStores();
    const user = await this.loadFromStore(username);
    if (user === null) {
      throw new MspProviderException(username + ' not found!');
    }
    this.setUserContext(user);
    return user;
  }

  /**
   * Get admin user for current organization
   * @param username
   * @param mspId
   */
  async getAdminUser(username: string, mspId: string): User {
    this.logger.verbose('Get admin %s user for %s', username, mspId);
    const client = this.fabric.getClient();

    if (
      !client._adminSigningIdentity ||
      !client._adminSigningIdentity._certificate ||
      !client._adminSigningIdentity._signer ||
      !client._adminSigningIdentity._signer._key
    ) {
      return null;
    }

    const user = new User(username);
    await user.setEnrollment(
      client._adminSigningIdentity._signer._key,
      client._adminSigningIdentity._certificate,
      mspId
    );
    return user;
  }
}
