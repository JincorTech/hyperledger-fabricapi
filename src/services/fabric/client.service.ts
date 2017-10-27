import * as User from 'fabric-client/lib/User.js';
import * as FabricClient from 'fabric-client/lib/Client.js';

import { Logger } from '../../logger';

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
