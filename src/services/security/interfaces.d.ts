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
  validate(token: string): Promise<object|null>;
}
