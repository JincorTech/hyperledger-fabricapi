import { Logger } from '../../logger';
import { GetAddressException } from './exceptions';

import config from '../../config';
import * as request from 'web-request';

/**
 *
 */
export class GetAddressService {
  private logger = Logger.getInstance('GET_ADDRESS_SERVICE');

  private url = config.cert2addr.url;
  private username = config.cert2addr.username;
  private password = config.cert2addr.password;
  private timeout = config.cert2addr.timeout;

  async getByCertificatePem(pem: string): Promise<string> {
    this.logger.verbose('Call service');

    const response = await request.json<{data: {address: string}, error?: string}>(this.url, {
      auth: {
        username: this.username,
        password: this.password
      },
      method: 'post',
      body: {
        pem
      },
      throwResponseError: false,
      timeout: this.timeout
    });

    if (!response.data || !response.data.address) {
      throw new GetAddressException(response.error || 'Can\'t get address');
    }

    return response.data.address;
  }
}
