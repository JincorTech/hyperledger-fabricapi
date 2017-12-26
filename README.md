# Jincor Hyperledger Fabric Api
![](https://travis-ci.org/JincorTech/hyperledger-fabricapi.svg?branch=master)

This is the internal service provided a REST like API for a Hyperledger Fabric network (HLF).
In order to access the HLF blockchain by using any other application services should use this service.

Main features are:

1. Work with certificates and private keys (with using of Fabric-CA).
1. Deploy & Upgrade a chaincode.
1. Invoke & Query a chaincode.
1. Query blocks and transactions.
1. Subscribe on events (block, transaction, chaincode).


## Pre-requests

1. install last version of `docker`.
1. deployed `hyperledger fabric network`.
1. mount local `crypto-config` to the FabricApi container. All paths specified in `network-config.yaml` file.

*Preferred Linux environment*.


## Configuration

### Environment variables

* *FABRICAPI_LOGGING_LEVEL* log level (verbose, info, warning, error)
* *FABRICAPI_LOGGING_FORMAT* log format (text, json)
* *FABRICAPI_LOGGING_COLORIZE* colorize output (true, false)
* *FABRICAPI_SERVER_HTTP* HTTP server (true, false)
* *FABRICAPI_SERVER_HTTP_IP* bind ip
* *FABRICAPI_SERVER_HTTP_PORT* listen port
* *FABRICAPI_SERVER_HTTPS* HTTPS server (true, false)
* *FABRICAPI_SERVER_HTTPS_IP* https bind ip
* *FABRICAPI_SERVER_HTTPS_PORT* https port
* *FABRICAPI_SERVER_HTTPS_PUB_KEY* path to cert. file
* *FABRICAPI_SERVER_HTTPS_PRIV_KEY* path to private key file
* *FABRICAPI_SERVER_HTTPS_CA* path to root CA cert. file
* *FABRICAPI_NETWORK_FILEPATH* path to a file contains fabric network description
* *FABRICAPI_JWT_SECRET* secret for jwt
* *FABRICAPI_JWT_SIGN_TYPE* signing algorithm type (HS256)
* *FABRICAPI_JWT_EXPIRES_DURATION* jwt lifetime (2 days, 10 days)
* *FABRICAPI_IDENTIFY_FILE* path to a file contains service users
* *FABRICAPI_IDENTIFY_SECRET* secret for password hashes
* *FABRICAPI_CHAINCODE_GO_SRC_PATH* base chaincode sources path
* *FABRICAPI_METRICS_USER* http basic auth for /metrics/prometheus endpoint.
* *FABRICAPI_METRICS_PASSWORD* http basic auth for metrics.
* *FABRICAPI_EVENTS_USERS_LIST* user name from network for listen events (block, transaction, chaincode)
* *FABRICAPI_CERT2ADDR_URL* endpoint to get address (like in ethereum) by passing cert.
* *FABRICAPI_CERT2ADDR_USER* http basic auth
* *FABRICAPI_CERT2ADDR_PASSWORD* http basic auth
* *FABRICAPI_NATS_SERVERS* nats server
* *FABRICAPI_NATS_TLS* is nats tls enabled
* *FABRICAPI_NATS_TLS_PUB_KEY* path to cert file
* *FABRICAPI_NATS_TLS_PRIV_KEY* path to private key file
* *FABRICAPI_NATS_TLS_CA* path to ca file
* *FABRICAPI_NATS_USER* nats username
* *FABRICAPI_NATS_PASSWORD* nats password


### Credentials

File credential.json should contains user records like:
```
  "username": {
    "password": hmac(FABRICAPI_IDENTIFY_SECRET + username, *PASSWORD*)
    "mspId": MspIdentify
    "role": admin|user
    "networkConfigFile": path to network-config.yaml,
    "events": [{
      "peer": "peer0",
      "chaincodes":[
        ["chaincode1","event1"]
      ]
    }]
  },
```

where, "events" is used to configure an event listeners (block, transactions, chaincodes).


### Network

File network-config.yaml contains description of a hyperledger fabric network.
Fix all paths by properly paths of your crypto-config.
For more details see [Hyperledger Fabric documentaion](http://hyperledger-fabric.readthedocs.io/en/latest/build_network.html).


## Metrics

There is only prometheus implementation. The metrics available in endpoint: /metrics/prometheus
*Note.* Metrics are  persisted in in-memory.


## Nats

Any raised events by HLF, they all sending to the NATS channels.

There are 3 channels:

* `/hyperledger-fabricapi/events/blocks/{MspId}`
* `/hyperledger-fabricapi/events/transactions/{MspId}`
* `/hyperledger-fabricapi/events/chaincodes/{MspId}/{ChaincodeName}/{ChaincodeEventName}`,
  where {ChaincodeName} without version postfix (i.e. remove `:version`).

Subscribe to `/hyperledger-fabricapi/events/chaincodes/MyOrganization/hyperledger-fabric-evmcc/EVM:LOG` to listen EVM events from chaincode.


## Installation

1. Copy & fix: `.env.template` -> `.env`, `credentials.json.template` -> `credentials.json`, `network-config.yaml.template` -> `network-config.yaml`.
1. Build docker image, and run NATS (may using also in the docker) properly configured by Environment variables.
1. Run fabricapi docker container, and don't forget to mount crypto-config folder.


## Run Tests

Todo
