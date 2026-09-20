import { getRedisClient, getRedisStatus } from '../../config/redis/redis.config';
import { Logger } from '../../utils/logger/logger.util';

// High-speed fallback in-memory cache with TTL support
interface MemoryCacheEntry<T> {
  value: T;
  expiresAt: number | null; // ms timestamp
}

const memoryCache = new Map<string, MemoryCacheEntry<any>>();

// Auto cleanup in-memory expired items periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt && entry.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }
}, 60000);

export class RedisCacheService {
  /**
   * Retrieves a cached value, parsed as JSON
   */
  public static async get<T>(key: string): Promise<T | null> {
    if (getRedisStatus()) {
      try {
        const client = getRedisClient();
        if (client) {
          const raw = await client.get(key);
          if (raw !== null) {
            return JSON.parse(raw) as T;
          }
          return null;
        }
      } catch (err: any) {
        Logger.warn(`Redis get error on key ${key}: ${err.message}`);
      }
    }

    // In-memory fallback
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      memoryCache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  /**
   * Sets a cached value with optional TTL (in seconds)
   */
  public static async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);

    if (getRedisStatus()) {
      try {
        const client = getRedisClient();
        if (client) {
          if (ttlSeconds && ttlSeconds > 0) {
            await client.set(key, serialized, 'EX', ttlSeconds);
          } else {
            await client.set(key, serialized);
          }
          return;
        }
      } catch (err: any) {
        Logger.warn(`Redis set error on key ${key}: ${err.message}`);
      }
    }

    // In-memory fallback
    memoryCache.set(key, {
      value,
      expiresAt: ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  /**
   * Deletes a specific key
   */
  public static async del(key: string): Promise<void> {
    if (getRedisStatus()) {
      try {
        const client = getRedisClient();
        if (client) {
          await client.del(key);
        }
      } catch (err: any) {
        Logger.warn(`Redis del error on key ${key}: ${err.message}`);
      }
    }
    memoryCache.delete(key);
  }

  /**
   * Deletes keys matching a pattern (e.g. `feed:nearby:*`)
   */
  public static async delPattern(pattern: string): Promise<void> {
    if (getRedisStatus()) {
      try {
        const client = getRedisClient();
        if (client) {
          const keys = await client.keys(pattern);
          if (keys.length > 0) {
            await client.del(...keys);
          }
        }
      } catch (err: any) {
        Logger.warn(`Redis delPattern error on ${pattern}: ${err.message}`);
      }
    }

    // In-memory pattern delete
    const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of memoryCache.keys()) {
      if (regexPattern.test(key)) {
        memoryCache.delete(key);
      }
    }
  }

  /**
   * Atomically increment a counter
   */
  public static async incr(key: string, ttlSeconds?: number): Promise<number> {
    if (getRedisStatus()) {
      try {
        const client = getRedisClient();
        if (client) {
          const count = await client.incr(key);
          if (count === 1 && ttlSeconds && ttlSeconds > 0) {
            await client.expire(key, ttlSeconds);
          }
          return count;
        }
      } catch (err: any) {
        Logger.warn(`Redis incr error on ${key}: ${err.message}`);
      }
    }

    // In-memory counter
    const current = memoryCache.get(key);
    let val = 1;
    if (current && (!current.expiresAt || current.expiresAt > Date.now())) {
      val = (current.value || 0) + 1;
    }
    memoryCache.set(key, {
      value: val,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
    return val;
  }
}
