import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ENV } from '../../config/env/env.config';
import { HTTP_STATUS } from '../../constants/status/httpStatus.constants';
import { ERROR_CODES } from '../../constants/errors/errorCodes.constants';
import { Logger } from '../../utils/logger/logger.util';

// Track failed admin authentication attempts per IP (max 5 fails / 5 min lockout)
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();

function isConstantTimeMatch(provided: string, target: string): boolean {
  if (!provided || !target) return false;
  const hashProvided = crypto.createHash('sha256').update(provided).digest();
  const hashTarget = crypto.createHash('sha256').update(target).digest();
  return crypto.timingSafeEqual(hashProvided, hashTarget);
}

/**
 * Gets the list of valid admin keys, supporting key rotation via comma-separated string
 */
export function getValidAdminKeys(): string[] {
  const keys: string[] = [];
  if (ENV.ADMIN_API_KEY) {
    // Support comma-separated keys for zero-downtime rotation
    const split = ENV.ADMIN_API_KEY.split(',').map((k) => k.trim()).filter((k) => k.length > 0);
    keys.push(...split);
  }
  return keys;
}

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown_ip';
  const now = Date.now();

  // 1. Check Brute Force Lockout
  const attemptInfo = failedAttempts.get(clientIp);
  if (attemptInfo && attemptInfo.lockedUntil > now) {
    const remainingSeconds = Math.ceil((attemptInfo.lockedUntil - now) / 1000);
    Logger.warn(
      `🚨 [Admin Audit] Blocked request from locked IP: ${clientIp} (${remainingSeconds}s remaining) on ${req.method} ${req.originalUrl}`
    );
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: `Too many failed admin authentication attempts. Locked for ${remainingSeconds} seconds.`,
      code: ERROR_CODES.RATE_LIMITED,
    });
    return;
  }

  // 2. Extract Provided Key (Header X-Admin-Key or Bearer Token)
  const adminKey = req.headers['x-admin-key'] as string;
  const authHeader = req.headers.authorization;

  let providedKey = adminKey;
  if (!providedKey && authHeader && authHeader.startsWith('Bearer ')) {
    providedKey = authHeader.split(' ')[1];
  }

  const validKeys = getValidAdminKeys();
  let isValid = false;

  if (providedKey && validKeys.length > 0) {
    for (const key of validKeys) {
      if (isConstantTimeMatch(providedKey, key)) {
        isValid = true;
        break;
      }
    }
  }

  // 3. Handle Failure with Lockout Escalation & Audit Log
  if (!isValid) {
    const currentFails = (attemptInfo?.count || 0) + 1;
    const lockedUntil = currentFails >= 5 ? now + 5 * 60 * 1000 : 0;
    failedAttempts.set(clientIp, { count: currentFails, lockedUntil });

    Logger.warn(
      `🚨 [Admin Security Audit] Failed admin auth attempt #${currentFails} on ${req.method} ${req.originalUrl} from IP: ${clientIp} (UA: ${req.headers['user-agent'] || 'unknown'})`
    );

    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: 'Unauthorized. Valid Admin API Key required.',
      code: ERROR_CODES.UNAUTHORIZED,
    });
    return;
  }

  // 4. Reset failed attempts on success & log authorized action
  if (attemptInfo) {
    failedAttempts.delete(clientIp);
  }

  Logger.info(
    `🛡️ [Admin Audit] Authorized access granted to IP: ${clientIp} for ${req.method} ${req.originalUrl}`
  );

  next();
}

