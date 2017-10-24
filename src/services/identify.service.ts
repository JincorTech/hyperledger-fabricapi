import * as fs from 'fs';
import * as crypto from 'crypto';
import { Response, Request, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import * as request from 'request';
import 'reflect-metadata';
import * as jwt from 'jsonwebtoken';

import config from '../config';
import { Logger } from '../logger';

// IoC
export const BearerTokenServiceType = Symbol('BearerTokenServiceType');
export const IdentificationServiceType = Symbol('IdentificationServiceType');
export const AuthenticationServiceType = Symbol('AuthenticationServiceType');

// Exceptions
export class BearerTokenException extends Error { }
export class AuthenticationException extends Error { }
export class IdentificationException extends Error { }

/**
 * JwtService interface
 */
export interface BearerTokenService {
  /**
   * Generate a token
   */
  generate(payload: any): Promise<string>;

  /**
   * Validate a token
   */
  validate(token: string): Promise<boolean>;

  /**
   * Decode a token
   */
  decode(token: string): any;
}

/**
 * IdentificationData
 */
export interface IdentificationData {
  password: string;
  mspId: string;
  username: string;
  role: string;
  networkConfigFile: string;
}

/**
 * Identify User by credentials
 */
export interface IdentificationService {

  /**
   * Identify msp user.
   */
  identify(username: string, password: string): Promise<IdentificationData|null>;

  /**
   * Get user identification data by username.
   */
  getByUsername(username: string): Promise<IdentificationData|null>;
}

/**
 * JwtService interface
 */
export interface AuthenticationService {
  /**
   * Authernicate user by username and password
   */
  authenicate(username: string, password: string): Promise<string>;

  /**
   * Validate access token
   */
  validate(token: string): Promise<boolean>;
}

/**
 * Jwt Token
 */
@injectable()
export class JwtBearerTokenService implements BearerTokenService {
  private logger = Logger.getInstance('JWT_BEARER_TOKEN');
  private secret: string;
  private algorithm: string;
  private expiresIn: string;

  /**
   * Creates jwt service instance
   */
  constructor() {
    this.secret = config.jwt.secret;
    if (!this.secret) {
      throw new BearerTokenException('No JWT secret was passed');
    }
    this.algorithm = config.jwt.algorithm;
    this.expiresIn = config.jwt.expires;
  }

  /**
   * @inheritdoc
   */
  async validate(jwtToken: string): Promise<boolean> {
    this.logger.verbose('validate token');
    try {
      jwt.verify(jwtToken, config.jwt.secret, {algorithms: [this.algorithm]});
      this.logger.verbose('success');
      return true;
    } catch (error) {
      this.logger.verbose('error', error);
      return false;
    }
  }

  /**
   * @inheritdoc
   */
  decode(jwtToken: string): any {
    return jwt.decode(jwtToken);
  }

  /**
   * @inheritdoc
   */
  async generate(payload: any): Promise<string> {
    this.logger.verbose('Generate new token', payload);
    const token = jwt.sign(payload, config.jwt.secret, {algorithm: this.algorithm, expiresIn: this.expiresIn});
    return token;
  }
}

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

/**
 * StandardAuthenticateionService
 */
@injectable()
export class StandardAuthenticationService implements AuthenticationService {
  private logger = Logger.getInstance('STANDARD_AUTHENTICATION');

  constructor(
    @inject(IdentificationServiceType) private identifyService: IdentificationService,
    @inject(BearerTokenServiceType) private tokenService: BearerTokenService
  ) {
  }

  /**
   * @inheritdoc
   */
  async authenicate(username: string, password: string): Promise<string> {
    this.logger.verbose('Authenticate user %s', username);
    const identify = await this.identifyService.identify(username, password);
    if (identify === null) {
      return '';
    }

    this.logger.verbose('Generate and send a new token for user %s', username);

    return await this.tokenService.generate({
      mspId: identify.mspId,
      username: identify.username,
      role: identify.role
    });
  }

  /**
   * @inheritdoc
   */
  async validate(token: string): Promise<boolean> {
    this.logger.verbose('Validate token %s', token);
    if (!token || !await this.tokenService.validate(token)) {
      this.logger.verbose('Token is invalid %s', token);
      return false;
    }
    this.logger.verbose('Token is valid %s', token);
    return true;
  }
}
