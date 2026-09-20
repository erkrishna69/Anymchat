import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../../constants/status/httpStatus.constants';
import { ERROR_CODES } from '../../constants/errors/errorCodes.constants';
import { Logger } from '../../utils/logger/logger.util';

export function errorHandlerMiddleware(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  Logger.error('Unhandled server error:', err);
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    error: 'An internal server error occurred',
    code: ERROR_CODES.INTERNAL_ERROR,
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}
