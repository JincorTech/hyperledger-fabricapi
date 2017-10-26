import { TransientMap } from './chaincode/interfaces';

export interface ChaincodeCall {
  isQuery: boolean;
  initiatorUsername: string;
  channelName: string;
  chaincodeId: string;
  method: string;
  args: Array<string>;
  peers: Array<string>;
  transientMap?: TransientMap;
  commitTransaction?: boolean;
}
