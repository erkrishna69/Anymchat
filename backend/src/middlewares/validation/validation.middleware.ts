import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../../constants/status/httpStatus.constants';
import { ERROR_CODES } from '../../constants/errors/errorCodes.constants';

export type ValidatorFn = (body: any) => { valid: boolean; error?: string };

export function validateBody(validator: ValidatorFn) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = validator(req.body);
    if (!result.valid) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: result.error || 'Validation error',
        code: ERROR_CODES.VALIDATION_FAILED,
      });
      return;
    }
    next();
  };
}
