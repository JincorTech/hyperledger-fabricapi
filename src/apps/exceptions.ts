export class ChaincodeApplicationException extends Error {}
export class NotFoundException extends ChaincodeApplicationException { }
export class InvalidArgumentException extends ChaincodeApplicationException { }
export class InvalidEndorsementException extends ChaincodeApplicationException { }
export class BroadcastingException extends ChaincodeApplicationException { }
