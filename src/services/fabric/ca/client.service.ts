import * as FabricCaClient from 'fabric-ca-client/lib/FabricCAClientImpl.js';

import { Logger } from '../../../logger';
import { FabricClientService } from '../../fabric/client.service';
import { MspProvider } from '../../fabric/msp.service';
import { NotFoundException } from './exceptions';

/**
 * CertificateAuthorityClientService.
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

  getFabricClient(): FabricClientService {
    return this.fabricService;
  }

  async getCaClient(): FabricCaClient {
    const caClient = this.fabricService.getClient().getCertificateAuthority();
    if (!caClient) {
      this.logger.error('CA not found');
      throw new NotFoundException('CA not found');
    }

    return caClient;
  }
}
