# Jincor Hyperledger Fabric Api
![](https://travis-ci.org/JincorTech/hyperledger-fabricapi.svg?branch=master)

This is the internal service provided a REST like API for a Hyperledger Fabric network (HLF).
In order to access the HLF blockchain by using any other application services should use this service.

Main features are:

1. Work with certificates and private keys.
1. Deploy & Upgrade a chaincode.
1. Invoke & Query a chaincode.


## Pre-requests

1. install `docker`.
1. deployed `hyperledger fabric network`.
1. mount local `crypto-config` to a container.

*Preferred Linux environment*.


## Configuration

### Environment

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

### Credentials

File credential.json should contains user records like:
```
  "username": {
    "password": hmac(FABRICAPI_IDENTIFY_SECRET + username, *PASSWORD*)
    "mspId": MspIdentify
    "role": admin|user
    "networkConfigFile": path to network-config.yaml
  },
```

### Network

File network-config.yaml contains description of a hyperledger fabric network.
Fix all paths by properly paths of your crypto-config. For more details see [Hyperledger Fabric documentaion](http://hyperledger-fabric.readthedocs.io/en/latest/build_network.html).

## Installation

1. Copy & fix: `.env.template` -> `.env`, `credentials.json.template` -> `credentials.json`, `network-config.yaml.template` -> `network-config.yaml`
1. Build docker image
1. Run docker container, and don't forget to mount crypto-config.


## Run Tests

Todo

