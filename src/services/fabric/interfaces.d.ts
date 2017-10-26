import { ChaincodePolicy, TransientMap } from './chaincode/interfaces';

export interface ChaincodeInstall {
  isUpgrade: boolean,
  channelName: string,
  chaincodeId: string,
  args: Array<string>,
  peers: Array<string>,
  eventPeer: string,
  policy: ChaincodePolicy|null
}

export interface ChaincodeCall {
  isQuery: boolean;
  initiatorUsername: string;
  channelName: string;
  chaincodeId: string;
  method: string;
  args: Array<string>;
  peers: Array<string>;
  eventPeer: string,
  transientMap?: TransientMap;
  commitTransaction?: boolean;
}
