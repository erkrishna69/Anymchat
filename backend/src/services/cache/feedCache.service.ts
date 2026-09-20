import { getRedisClient, getRedisStatus } from '../../config/redis/redis.config';
import { ENV } from '../../config/env/env.config';
import { IPublicFeedMessage } from '../../types/feed/feedMessage.types';
import { Logger } from '../../utils/logger/logger.util';

const REDIS_FEED_ZSET_KEY = 'feed:messages:active_24h';
const REDIS_GEO_FEED_PREFIX = 'feed:geo:';

// In-memory fallback store
interface MemoryFeedEntry {
  message: IPublicFeedMessage & { latitude?: number; longitude?: number };
  timestamp: number;
}
const inMemoryZSet: MemoryFeedEntry[] = [];

export class FeedCacheService {
  /**
   * Adds a feed message into the Redis 24-Hour Active Sorted Set
   * Automatically purges messages older than 24 hours
   */
  public static async cacheMessage(
    msg: IPublicFeedMessage & { latitude?: number; longitude?: number }
  ): Promise<void> {
    const timestamp = new Date(msg.createdAt).getTime();
    const cutoff24h = Date.now() - ENV.MESSAGE_TTL_SECONDS * 1000;

    if (getRedisStatus()) {
      try {
        const client = getRedisClient();
        if (client) {
          const payload = JSON.stringify(msg);

          // Atomic pipeline: ZADD message, prune messages older than 24h, set TTL on key
          const pipeline = client.pipeline();
          pipeline.zadd(REDIS_FEED_ZSET_KEY, timestamp, payload);
          pipeline.zremrangebyscore(REDIS_FEED_ZSET_KEY, '-inf', cutoff24h);
          pipeline.expire(REDIS_FEED_ZSET_KEY, ENV.MESSAGE_TTL_SECONDS + 3600); // safety buffer

          await pipeline.exec();
          return;
        }
      } catch (err: any) {
        Logger.warn(`FeedCacheService.cacheMessage Redis error: ${err.message}`);
      }
    }

    // In-memory fallback
    inMemoryZSet.unshift({ message: msg, timestamp });

    // Prune entries older than 24h or cap at 50,000 for local dev
    const validUntil = Date.now() - ENV.MESSAGE_TTL_SECONDS * 1000;
    while (inMemoryZSet.length > 0 && inMemoryZSet[inMemoryZSet.length - 1].timestamp < validUntil) {
      inMemoryZSet.pop();
    }
    if (inMemoryZSet.length > 50000) {
      inMemoryZSet.splice(50000);
    }
  }

  /**
   * Retrieves the most recent active 24h messages from Redis Sorted Set
   */
  public static async getRecentFeed(limit: number = 60): Promise<IPublicFeedMessage[]> {
    const cutoff24h = Date.now() - ENV.MESSAGE_TTL_SECONDS * 1000;

    if (getRedisStatus()) {
      try {
        const client = getRedisClient();
        if (client) {
          // Fetch members with score >= 24h ago, sorted newest to oldest
          const rawItems = await client.zrevrangebyscore(
            REDIS_FEED_ZSET_KEY,
            '+inf',
            cutoff24h,
            'LIMIT',
            0,
            limit
          );

          if (rawItems && rawItems.length > 0) {
            return rawItems.map((str) => JSON.parse(str) as IPublicFeedMessage);
          }
        }
      } catch (err: any) {
        Logger.warn(`FeedCacheService.getRecentFeed Redis error: ${err.message}`);
      }
    }

    // In-memory fallback
    return inMemoryZSet
      .filter((entry) => entry.timestamp >= cutoff24h)
      .slice(0, limit)
      .map((entry) => entry.message);
  }

  /**
   * Purge expired messages (> 24 hours) across Redis keys
   */
  public static async purgeExpiredMessages(): Promise<number> {
    const cutoff24h = Date.now() - ENV.MESSAGE_TTL_SECONDS * 1000;

    if (getRedisStatus()) {
      try {
        const client = getRedisClient();
        if (client) {
          const removed = await client.zremrangebyscore(REDIS_FEED_ZSET_KEY, '-inf', cutoff24h);
          if (removed > 0) {
            Logger.info(`🧹 [Redis Clean] Purged ${removed} expired messages older than 24 hours`);
          }
          return removed;
        }
      } catch (err: any) {
        Logger.warn(`FeedCacheService.purgeExpiredMessages error: ${err.message}`);
      }
    }

    // In-memory purge
    const initialLen = inMemoryZSet.length;
    for (let i = inMemoryZSet.length - 1; i >= 0; i--) {
      if (inMemoryZSet[i].timestamp < cutoff24h) {
        inMemoryZSet.splice(i, 1);
      }
    }
    return initialLen - inMemoryZSet.length;
  }
}
