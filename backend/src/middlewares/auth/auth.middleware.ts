import { Request, Response, NextFunction } from 'express';
import { verifyUserToken, TokenPayload } from '../../utils/crypto/token.util';
import { HTTP_STATUS } from '../../constants/status/httpStatus.constants';
import { ERROR_CODES } from '../../constants/errors/errorCodes.constants';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Authentication token missing or invalid',
      code: ERROR_CODES.UNAUTHORIZED,
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyUserToken(token);

  if (!payload) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Token has expired or is invalid',
      code: ERROR_CODES.INVALID_TOKEN,
    });
    return;
  }

  req.user = payload;
  next();
}
