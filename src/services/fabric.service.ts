import { IdentificationData } from './identify.service';
import { Request } from 'express';
import * as FabricClient from 'fabric-client/lib/Client.js';

import config from '../config';

// Exceptions
export class FabricClientException extends Error { }
export class InvalidArgumentException extends FabricClientException { }

/**
 * Service Wrapper for Fabric Client SDK.
 */
export class FabricClientService {
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
  }

  /**
   * Initiate from request
   * @param req
   */
  static createFromRequest(req: Request): FabricClientService {
    const decoded: IdentificationData = req['identification'];
    if (!decoded) {
      throw new InvalidArgumentException('There is no identification in the request');
    }

    return new FabricClientService(decoded);
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
}
