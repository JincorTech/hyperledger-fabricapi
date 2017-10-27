import * as fs from 'fs';
import * as crypto from 'crypto';
import { injectable } from 'inversify';
import 'reflect-metadata';

import config from '../../config';
import { Logger } from '../../logger';
import { IdentificationService } from './interfaces';

// IoC
export const IdentificationServiceType = Symbol('IdentificationServiceType');

/**
 * FileIdentificationService
 */
@injectable()
export class FileIdentificationService implements IdentificationService {
  private logger = Logger.getInstance('FILE_IDENTIFICATION');
  private credentials = {};
  private lastModifiedTime = '';
  private jsonFilePath: string;
  private fileSecret: string;

  constructor() {
    this.jsonFilePath = config.identify.filePath;
    this.fileSecret = config.identify.fileSecret;
  }

  /**
   * @inheritdoc
   */
  async identify(username: string, password: string): Promise<IdentificationData|null> {
    this.logger.verbose('Try to identify %s', username);

    const identData = await this.getByUsername(username);

    password = crypto.createHmac('sha256', this.fileSecret + username)
      .update(password || '')
      .digest('hex');

    if (!identData || identData.password !== password) {
      this.logger.verbose('Identification for %s not found or password is wrong', username);
      return null;
    }

    this.logger.verbose('Identification for %s found', username);

    return {
      password: '***',
      mspId: identData.mspId,
      networkConfigFile: identData.networkConfigFile,
      username,
      role: identData.role
    };
  }

  /**
   * Get record by username
   * @param username
   */
  async getByUsername(username: string): Promise<IdentificationData|null> {
    this.logger.verbose('Find user by username %s', username);
    await this.loadData();
    return { ...this.credentials[username], username };
  }

  /**
   * Load data from a json file and reload, if it's changed.
   */
  private loadData() {
    return (new Promise((resolve, reject) => {
      fs.stat(this.jsonFilePath, function(err, stats) {
        if (err) {
          return reject(err);
        }
        resolve(stats.mtime.toString());
      });
    })).then((modifyTime: string) => {
      if (modifyTime !== this.lastModifiedTime) {
        this.lastModifiedTime = modifyTime;
        this.logger.verbose('Was modified or first reading of credential file');
        return this.loadJsonFile();
      }
    });
  }

  private loadJsonFile(): Promise<void> {
    return (new Promise((resolve, reject) => {
      this.logger.verbose('Read file %s', this.jsonFilePath);
      fs.readFile(this.jsonFilePath, (err, data) => {
        if (err) {
          return reject(err);
        }
        resolve(data.toString());
      });
    })).then((data: string) => {
      this.logger.verbose('Parse and setup in-memory hashmap');
      this.credentials = JSON.parse(data);
    });
  }
}
