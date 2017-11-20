import { Request, Response, NextFunction } from 'express';

import { Logger } from '../logger';
import { responseAsUnbehaviorError } from '../helpers/responses';

export function uncatchedErrorHandler(logger: Logger, err: Error, req: Request, res: Response, next: NextFunction): void {
  logger.error('uncatchedErrorHandler', err);
  responseAsUnbehaviorError(res, err);
}
