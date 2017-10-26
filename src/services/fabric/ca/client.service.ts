import * as FabricCaClient from 'fabric-ca-client/lib/FabricCAClientImpl.js';

import { Logger } from '../../../logger';
import { FabricClientService } from '../../fabric/client.service';
import { MspProvider } from '../../fabric/msp.service';
import { NotFoundException } from './exceptions';

/**
 * FabricCaClientService.
 */
export class FabricCaClientService {
  protected logger = Logger.getInstance('CERTIFICATE_AUTHORITY_CLIENT');
  protected isCredentialStoresInitialized: boolean = false;

  constructor(
    protected fabricService: FabricClientService,
    identityData: IdentificationData
  ) {
    fabricService.setClientMsp(identityData.mspId);
  }

  /**
   * Get fabric wrapper service.
   */
  getFabricClient(): FabricClientService {
    return this.fabricService;
  }

  /**
   * Get native FabricCA client.
   */
  getCaClient(): FabricCaClient {
    const caClient = this.fabricService.getClient().getCertificateAuthority();
    if (!caClient) {
      throw new NotFoundException('CA not found in network configuration');
    }

    return caClient;
  }
}
