/**
 * TransientMap
 */
export interface TransientMap {
  [key: string]: string;
}

/**
   * ChaincodePolicyIdentity
   */
export interface ChaincodePolicyIdentity {
  role: {
    name: string;
    mspId: string;
  };
}

/**
   * ChaincodePolicySignedBy
   */
export interface ChaincodePolicySignedBy {
  [key: string]: Array<ChaincodePolicySignedBy> | number;
}

/**
   * ChaincodePolicy
   */
export interface ChaincodePolicy {
  identities: Array<ChaincodePolicyIdentity>;
  policy: ChaincodePolicySignedBy;
}
