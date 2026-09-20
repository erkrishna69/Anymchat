import Redis, { RedisOptions } from 'ioredis';
import { ENV } from '../env/env.config';
import { Logger } from '../../utils/logger/logger.util';

let redisClient: Redis | null = null;
let isRedisConnected = false;
let redisInitialized = false;

export function getRedisClient(): Redis | null {
  return redisClient;
}

export function getRedisStatus(): boolean {
  return isRedisConnected;
}

export async function connectRedis(): Promise<boolean> {
  if (redisInitialized && redisClient) {
    return isRedisConnected;
  }

  redisInitialized = true;

  try {
    const options: RedisOptions = {
      host: ENV.REDIS_HOST,
      port: ENV.REDIS_PORT,
      password: ENV.REDIS_PASSWORD || undefined,
      db: ENV.REDIS_DB || 0,
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      connectTimeout: 2500,
      retryStrategy(times) {
        if (times > 5) {
          // Fall back gracefully to in-memory mode without infinite spam
          return null;
        }
        return Math.min(times * 300, 2000);
      },
    };

    if (ENV.REDIS_URI && ENV.REDIS_URI.trim().length > 0) {
      const isTls = ENV.REDIS_URI.startsWith('rediss://');
      redisClient = new Redis(ENV.REDIS_URI, {
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        connectTimeout: 5000,
        tls: isTls ? { rejectUnauthorized: false } : undefined,
        retryStrategy(times) {
          if (times > 5) return null;
          return Math.min(times * 300, 2000);
        },
      });
    } else {
      redisClient = new Redis(options);
    }

    redisClient.on('connect', () => {
      isRedisConnected = true;
      Logger.info('Connected to Redis database');
    });

    redisClient.on('ready', () => {
      isRedisConnected = true;
      Logger.info('Redis client ready for high-throughput sub-millisecond caching');
    });

    redisClient.on('error', (err: any) => {
      if (isRedisConnected) {
        Logger.warn(`Redis encountered an error: ${err.message}`);
      }
      isRedisConnected = false;
    });

    redisClient.on('close', () => {
      if (isRedisConnected) {
        Logger.warn('Redis connection closed. Switched to high-speed in-memory cache fallback.');
      }
      isRedisConnected = false;
    });

    // Attempt initial connect with remote cloud timeout
    const connectPromise = redisClient.connect();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection attempt timed out')), 5000)
    );

    await Promise.race([connectPromise, timeoutPromise]);
    isRedisConnected = true;
    return true;
  } catch (err: any) {
    isRedisConnected = false;
    Logger.warn(
      `Redis not active (${err.message}). ` +
        `Operating in In-Memory High-Speed Cache Fallback Mode.`
    );
    return false;
  }
}


export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      redisClient.disconnect();
    }
    isRedisConnected = false;
  }
}
