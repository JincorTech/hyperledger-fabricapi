import * as User from 'fabric-client/lib/User.js';
import * as FabricClient from 'fabric-client/lib/Client.js';

import { Logger } from '../../logger';

// Exceptions
export class FabricClientException extends Error { }
export class InvalidArgumentException extends FabricClientException { }

/**
 * Service Wrapper for Fabric Client SDK.
 */
export class FabricClientService {
  private logger = Logger.getInstance('FABRIC_CLIENT');
  private client;
  private isAdmin;
  private mspId;

  /**
   * Initiate user identification
   * @param username
   * @param role
   * @param mspId
   */
  constructor(identityData: IdentificationData) {
    this.isAdmin = identityData.role === 'admin';
    this.mspId = identityData.mspId;
    this.client = FabricClient.loadFromConfig(identityData.networkConfigFile);
    FabricClient.setLogger(this.logger);
  }

  /**
   * Set client organization
   * @param mspId
   */
  setClientMsp(mspId: string) {
    if (this.client._network_config.hasClient()) {
      this.client._network_config._network_config.client.organization = mspId;
      this.client._setAdminFromConfig();
    }
  }

  /**
   * Get admin status
   */
  canUseAdmin() {
    return this.isAdmin;
  }

  /**
   * Get native fabric client SDK
   */
  getClient(): any {
    return this.client;
  }

  /**
   * Get and query channel
   * @param channelName
   */
  async getChannel(channelName: string): Promise<any> {
    this.logger.verbose('Get %s channel', channelName);
    const channel = await this.getClient().getChannel(channelName);
    // await channel.initialize();
    return channel;
  }
}

/**
 * MspProvider
 */
export class MspProvider {
  private logger = Logger.getInstance('MSP_PROVIDER');

  constructor(private fabric: FabricClientService) {
  }

  private async initCredStores() {
    await this.fabric.getClient().initCredentialStores();
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
    const user = await this.fabric.getClient().getUserContext(username, true);
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
