import { injectable } from 'inversify';
import 'reflect-metadata';

import { Logger } from '../logger';
import { InvalidArgumentException } from './exceptions';
import { ChaincodePolicy } from '../services/fabric/chaincode/interfaces';
import { FabricClientService } from '../services/fabric/client.service';
import { TransactionQuery } from '../services/fabric/transaction/query.service';
import { BlockQuery } from '../services/fabric/block/query.service';
import { MspProvider } from '../services/fabric/msp.service';

// IoC
export const InfoApplicationType = Symbol('InfoApplicationType');

/**
 * Info application.
 */
@injectable()
export class InfoApplication {
  private logger = Logger.getInstance('INFO_APPLICATION');
  private fabric: FabricClientService;
  private identityData: IdentificationData;

  /**
   * Set instance context.
   * @param fabric
   */
  setContext(fabric: FabricClientService, identityData: IdentificationData): InfoApplication {
    this.fabric = fabric;
    this.identityData = identityData;
    this.fabric.setClientMsp(identityData.mspId);
    return this;
  }

  /**
   * @param indexOrHash format like 0x[0-9a-f]+ - hash, without index
   * @param peers
   */
  async queryBlockBy(channelName: string, indexOrHash: string, peers: Array<string>): Promise<any> {
    this.logger.verbose('Query block', indexOrHash);

    const mspProvider = new MspProvider(this.fabric);
    mspProvider.setUserContext(
      await mspProvider.getAdminUser(this.identityData.username, this.identityData.mspId)
    );

    if (/^0x[\da-fA-F]+$/.test(indexOrHash)) {
      return await (new BlockQuery(this.fabric, channelName))
        .queryByHash(peers, Uint8Array.from(Buffer.from(indexOrHash.slice(2), 'hex')));
    }

    if (!/^\d+$/.test(indexOrHash)) {
      throw new InvalidArgumentException('Invalid index or hash format');
    }

    return await (new BlockQuery(this.fabric, channelName))
      .queryByIndex(peers, +indexOrHash);
  }

  /**
   * @param hash format like 0x[0-9a-f]+
   * @param peers
   */
  async queryTransaction(channelName: string, hash: string, peers: Array<string>): Promise<any> {
    this.logger.verbose('Query transaction', hash);

    const mspProvider = new MspProvider(this.fabric);
    mspProvider.setUserContext(
      await mspProvider.getAdminUser(this.identityData.username, this.identityData.mspId)
    );

    if (!/^[\da-fA-F]+$/.test(hash)) {
      throw new InvalidArgumentException('Invalid transaction hash format');
    }

    return await (new TransactionQuery(this.fabric, channelName))
      .queryByHash(peers, hash);
  }
}
