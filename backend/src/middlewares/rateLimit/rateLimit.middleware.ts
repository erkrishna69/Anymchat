import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { SafetyService } from '../../services/safety/safety.service';
import { HTTP_STATUS } from '../../constants/status/httpStatus.constants';
import { ERROR_CODES } from '../../constants/errors/errorCodes.constants';

// Rate limiting store: bucketName -> (clientKey -> timestamps[])
const rateLimitStores = new Map<string, Map<string, number[]>>();

// Auto-cleanup stale keys every 5 minutes to avoid memory buildup
setInterval(() => {
  const now = Date.now();
  for (const [, bucket] of rateLimitStores.entries()) {
    for (const [key, timestamps] of bucket.entries()) {
      const recent = timestamps.filter((t) => now - t < 15 * 60 * 1000);
      if (recent.length === 0) {
        bucket.delete(key);
      } else {
        bucket.set(key, recent);
      }
    }
  }
}, 5 * 60 * 1000).unref?.();

/**
 * Checks sliding-window rate limit for a given key in a bucket
 */
export function checkRateLimit(
  bucketName: string,
  clientKey: string,
  windowMs: number,
  maxRequests: number
): { limited: boolean; retryAfterSec: number } {
  if (!rateLimitStores.has(bucketName)) {
    rateLimitStores.set(bucketName, new Map<string, number[]>());
  }
  const bucket = rateLimitStores.get(bucketName)!;
  const now = Date.now();
  const timestamps = bucket.get(clientKey) || [];
  const recent = timestamps.filter((t) => now - t < windowMs);

  if (recent.length >= maxRequests) {
    const oldest = recent[0];
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    return { limited: true, retryAfterSec };
  }

  recent.push(now);
  bucket.set(clientKey, recent);
  return { limited: false, retryAfterSec: 0 };
}

export function getClientIp(req: AuthenticatedRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || req.ip || 'unknown_ip';
}

/**
 * Composite rate limit helper (checks IP limit + User ID limit if user is authenticated)
 */
function checkCompositeLimit(
  req: AuthenticatedRequest,
  bucketName: string,
  ipConfig: { windowMs: number; max: number },
  userConfig?: { windowMs: number; max: number }
): { limited: boolean; retryAfterSec: number; reason?: string } {
  const ip = getClientIp(req);
  const ipCheck = checkRateLimit(`${bucketName}_ip`, ip, ipConfig.windowMs, ipConfig.max);
  if (ipCheck.limited) {
    return { limited: true, retryAfterSec: ipCheck.retryAfterSec, reason: 'Network rate limit exceeded' };
  }

  const userId = req.user?.anonymousId;
  if (userId && userConfig) {
    const userCheck = checkRateLimit(`${bucketName}_user`, userId, userConfig.windowMs, userConfig.max);
    if (userCheck.limited) {
      return { limited: true, retryAfterSec: userCheck.retryAfterSec, reason: 'Account request limit exceeded' };
    }
  }

  return { limited: false, retryAfterSec: 0 };
}

// 1. Message posting rate limit (User: 5/3s, IP: 15/10s)
export function rateLimitMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const userId = req.user?.anonymousId;
  if (userId && SafetyService.isRateLimited(userId)) {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      error: 'Too many messages. Please wait 3 seconds.',
      code: ERROR_CODES.RATE_LIMITED,
    });
    return;
  }

  const check = checkCompositeLimit(
    req,
    'post_msg',
    { windowMs: 10 * 1000, max: 15 },
    { windowMs: 3 * 1000, max: 5 }
  );

  if (check.limited) {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      error: `Too many messages sent. Please wait ${check.retryAfterSec}s.`,
      code: ERROR_CODES.RATE_LIMITED,
      retryAfter: check.retryAfterSec,
    });
    return;
  }
  next();
}

// 2. Name generation rate limit (5/min per IP)
export function generateNameRateLimiter(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  const { limited, retryAfterSec } = checkRateLimit('gen_name', ip, 60 * 1000, 5);

  if (limited) {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: `Too many name generation requests. Please wait ${retryAfterSec}s.`,
      code: ERROR_CODES.RATE_LIMITED,
      retryAfter: retryAfterSec,
    });
    return;
  }
  next();
}

// 3. Login rate limiter (5 attempts per 5 mins per IP + 10 per 5 mins per email if provided)
export function loginRateLimiter(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  const ipCheck = checkRateLimit('login_ip', ip, 5 * 60 * 1000, 5);

  if (ipCheck.limited) {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: `Too many login attempts. Please wait ${ipCheck.retryAfterSec}s before trying again.`,
      code: ERROR_CODES.RATE_LIMITED,
      retryAfter: ipCheck.retryAfterSec,
    });
    return;
  }

  const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : null;
  if (email) {
    const emailCheck = checkRateLimit('login_email', email, 5 * 60 * 1000, 8);
    if (emailCheck.limited) {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        error: `Too many failed login attempts for this account. Please wait ${emailCheck.retryAfterSec}s.`,
        code: ERROR_CODES.RATE_LIMITED,
        retryAfter: emailCheck.retryAfterSec,
      });
      return;
    }
  }

  next();
}

// 4. Signup rate limiter (4 accounts per 15 mins per IP)
export function signupRateLimiter(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  const { limited, retryAfterSec } = checkRateLimit('signup', ip, 15 * 60 * 1000, 4);

  if (limited) {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: `Account creation limit reached for your network. Please wait ${retryAfterSec}s before creating a new account.`,
      code: ERROR_CODES.RATE_LIMITED,
      retryAfter: retryAfterSec,
    });
    return;
  }
  next();
}

// 5. Guest anonymous session limiter (8 guest joins per 10 mins per IP)
export function guestAuthRateLimiter(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  const { limited, retryAfterSec } = checkRateLimit('guest_anon', ip, 10 * 60 * 1000, 8);

  if (limited) {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: `Guest session creation limit reached. Please wait ${retryAfterSec}s.`,
      code: ERROR_CODES.RATE_LIMITED,
      retryAfter: retryAfterSec,
    });
    return;
  }
  next();
}

// 6. Feed query rate limiter (User: 30/min, IP: 60/min - protects DB geo-spatial load)
export function feedQueryRateLimiter(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const check = checkCompositeLimit(
    req,
    'get_feed',
    { windowMs: 60 * 1000, max: 60 },
    { windowMs: 60 * 1000, max: 30 }
  );

  if (check.limited) {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: `Feed refresh limit reached. Please wait ${check.retryAfterSec}s before refreshing feed.`,
      code: ERROR_CODES.RATE_LIMITED,
      retryAfter: check.retryAfterSec,
    });
    return;
  }
  next();
}

// 7. Location sync rate limiter (User: 12/min, IP: 30/min)
export function locationRestRateLimiter(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const check = checkCompositeLimit(
    req,
    'location_sync',
    { windowMs: 60 * 1000, max: 30 },
    { windowMs: 60 * 1000, max: 12 }
  );

  if (check.limited) {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: `Location update frequency exceeded. Please wait ${check.retryAfterSec}s.`,
      code: ERROR_CODES.RATE_LIMITED,
      retryAfter: check.retryAfterSec,
    });
    return;
  }
  next();
}

// 8. Global API Gateway limiter (120 req / min per IP)
export function globalApiRateLimiter(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  const { limited, retryAfterSec } = checkRateLimit('global_api', ip, 60 * 1000, 120);

  if (limited) {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: `Too many requests. Please slow down. Retry in ${retryAfterSec}s.`,
      code: ERROR_CODES.RATE_LIMITED,
      retryAfter: retryAfterSec,
    });
    return;
  }
  next();
}
