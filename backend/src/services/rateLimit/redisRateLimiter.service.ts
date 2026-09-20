import { getRedisClient, getRedisStatus } from '../../config/redis/redis.config';
import { ENV } from '../../config/env/env.config';
import { Logger } from '../../utils/logger/logger.util';

// In-memory fallback with automated periodic prune
const inMemoryRateLimits = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of inMemoryRateLimits.entries()) {
    if (v.resetAt <= now) {
      inMemoryRateLimits.delete(k);
    }
  }
}, 60 * 1000).unref?.();

export class RedisRateLimiterService {
  /**
   * Sliding window rate limiter
   * Returns { allowed: boolean, remaining: number, resetInSeconds: number }
   */
  public static async checkRateLimit(
    identifier: string,
    action: string = 'chat',
    maxLimit: number = ENV.RATE_LIMIT_MAX_PER_MINUTE,
    windowSeconds: number = 60
  ): Promise<{ allowed: boolean; count: number; remaining: number; resetInSeconds: number }> {
    const key = `ratelimit:${action}:${identifier}`;

    if (getRedisStatus()) {
      try {
        const client = getRedisClient();
        if (client) {
          const current = await client.incr(key);
          if (current === 1) {
            await client.expire(key, windowSeconds);
          }
          const ttl = await client.ttl(key);
          const remaining = Math.max(0, maxLimit - current);
          const allowed = current <= maxLimit;

          return {
            allowed,
            count: current,
            remaining,
            resetInSeconds: ttl > 0 ? ttl : windowSeconds,
          };
        }
      } catch (err: any) {
        Logger.warn(`RedisRateLimiterService error: ${err.message}`);
      }
    }

    // In-memory fallback
    const now = Date.now();
    let entry = inMemoryRateLimits.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 1, resetAt: now + windowSeconds * 1000 };
      inMemoryRateLimits.set(key, entry);
      return {
        allowed: true,
        count: 1,
        remaining: maxLimit - 1,
        resetInSeconds: windowSeconds,
      };
    }

    entry.count += 1;
    const remaining = Math.max(0, maxLimit - entry.count);
    const resetInSeconds = Math.ceil((entry.resetAt - now) / 1000);
    const allowed = entry.count <= maxLimit;

    return {
      allowed,
      count: entry.count,
      remaining,
      resetInSeconds,
    };
  }
}
