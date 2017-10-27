declare interface AuthenticatedRequest {
  params: any;
  body: any;
  token: string;
  tokenDecoded: any;
  identification: IdentificationData;
}

declare interface IdentificationData {
  password: string;
  mspId: string;
  username: string;
  role: string;
  networkConfigFile: string;
}

