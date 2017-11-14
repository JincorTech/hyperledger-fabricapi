import * as dotenv from 'dotenv';

dotenv.config();

const {
  FABRICAPI_LOGGING_LEVEL,
  FABRICAPI_LOGGING_FORMAT,
  FABRICAPI_LOGGING_COLORIZE,

  FABRICAPI_SERVER_HTTP,
  FABRICAPI_SERVER_HTTP_IP,
  FABRICAPI_SERVER_HTTP_PORT,
  FABRICAPI_SERVER_HTTPS,
  FABRICAPI_SERVER_HTTPS_IP,
  FABRICAPI_SERVER_HTTPS_PORT,
  FABRICAPI_SERVER_HTTPS_PUB_KEY,
  FABRICAPI_SERVER_HTTPS_PRIV_KEY,
  FABRICAPI_SERVER_HTTPS_CA,

  FABRICAPI_NETWORK_FILEPATH,

  FABRICAPI_JWT_SECRET,
  FABRICAPI_JWT_SIGN_TYPE,
  FABRICAPI_JWT_EXPIRES_DURATION,

  FABRICAPI_IDENTIFY_FILE,
  FABRICAPI_IDENTIFY_SECRET,

  FABRICAPI_CHAINCODE_GO_SRC_PATH,

  FABRICAPI_EVENTS_USERS_LIST,

  FABRICAPI_NATS_SERVERS,
  FABRICAPI_NATS_TLS,
  FABRICAPI_NATS_TLS_PUB_KEY,
  FABRICAPI_NATS_TLS_PRIV_KEY,
  FABRICAPI_NATS_TLS_CA,
  FABRICAPI_NATS_USER,
  FABRICAPI_NATS_PASSWORD
} = process.env;

export default {
  logging: {
    level: FABRICAPI_LOGGING_LEVEL,
    format: FABRICAPI_LOGGING_FORMAT,
    colorize: FABRICAPI_LOGGING_COLORIZE === 'true'
  },
  server: {
    http: FABRICAPI_SERVER_HTTP === 'true',
    httpPort: parseInt(FABRICAPI_SERVER_HTTP_PORT, 10) || 8080,
    httpIp: FABRICAPI_SERVER_HTTP_IP || '0.0.0.0',
    https: FABRICAPI_SERVER_HTTPS === 'true',
    httpsPort: parseInt(FABRICAPI_SERVER_HTTPS_PORT, 10) || 8443,
    httpsIp: FABRICAPI_SERVER_HTTPS_IP || '0.0.0.0',
    httpsCa: FABRICAPI_SERVER_HTTPS_CA,
    httpsPubKey: FABRICAPI_SERVER_HTTPS_PUB_KEY,
    httpsPrivKey: FABRICAPI_SERVER_HTTPS_PRIV_KEY,
    httpsRequestClientCert: false
  },
  jwt: {
    secret: FABRICAPI_JWT_SECRET,
    algorithm: FABRICAPI_JWT_SIGN_TYPE || 'HS256',
    expires: FABRICAPI_JWT_EXPIRES_DURATION || '2 days'
  },
  identify: {
    filePath: FABRICAPI_IDENTIFY_FILE,
    fileSecret: FABRICAPI_IDENTIFY_SECRET
  },
  chaincode: {
    goSrcPath: FABRICAPI_CHAINCODE_GO_SRC_PATH
  },
  events: {
    usernames: FABRICAPI_EVENTS_USERS_LIST
  },
  mq: {
    channelChaincodes: '/hyperledger-fabricapi/events/chaincodes/',
    channelTransactions: '/hyperledger-fabricapi/events/transactions/',
    channelBlocks: '/hyperledger-fabricapi/events/blocks/',

    natsServers: FABRICAPI_NATS_SERVERS || 'localhost:4222',
    natsTls: FABRICAPI_NATS_TLS === 'true',
    natsTlsPubKey: FABRICAPI_NATS_TLS_PUB_KEY || '',
    natsTlsPrivKey: FABRICAPI_NATS_TLS_PRIV_KEY || '',
    natsTlsCa: FABRICAPI_NATS_TLS_CA || '',
    natsUser: FABRICAPI_NATS_USER || '',
    natsPassword: FABRICAPI_NATS_PASSWORD || ''
  }
};
