import { getRedisClient, getRedisStatus } from '../../config/redis/redis.config';
import { Logger } from '../../utils/logger/logger.util';

// In-memory fallback deduplication bucket
const inMemoryDeduplication = new Map<string, { result: any; expiresAt: number }>();

// Auto clean in-memory deduplication bucket every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of inMemoryDeduplication.entries()) {
    if (val.expiresAt <= now) {
      inMemoryDeduplication.delete(key);
    }
  }
}, 60000);

export class IdempotencyService {
  /**
   * Checks if clientMessageId was already processed recently
   * Returns cached result if duplicate, or null if new
   */
  public static async getProcessedMessage<T>(clientMessageId: string): Promise<T | null> {
    if (!clientMessageId) return null;
    const key = `idempotency:msg:${clientMessageId}`;

    if (getRedisStatus()) {
      try {
        const client = getRedisClient();
        if (client) {
          const raw = await client.get(key);
          if (raw) {
            Logger.info(`🔁 [Deduplication] Prevented duplicate message processing for clientMessageId: ${clientMessageId}`);
            return JSON.parse(raw) as T;
          }
          return null;
        }
      } catch (err: any) {
        Logger.warn(`IdempotencyService error: ${err.message}`);
      }
    }

    const entry = inMemoryDeduplication.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      Logger.info(`🔁 [Deduplication] Prevented duplicate message (in-memory) for clientMessageId: ${clientMessageId}`);
      return entry.result as T;
    }
    return null;
  }

  /**
   * Records processed message to deduplicate retries within windowSeconds (default 300s / 5min)
   */
  public static async recordProcessedMessage<T>(
    clientMessageId: string,
    result: T,
    windowSeconds: number = 300
  ): Promise<void> {
    if (!clientMessageId) return;
    const key = `idempotency:msg:${clientMessageId}`;

    if (getRedisStatus()) {
      try {
        const client = getRedisClient();
        if (client) {
          await client.set(key, JSON.stringify(result), 'EX', windowSeconds);
          return;
        }
      } catch (err: any) {
        Logger.warn(`IdempotencyService record error: ${err.message}`);
      }
    }

    inMemoryDeduplication.set(key, {
      result,
      expiresAt: Date.now() + windowSeconds * 1000,
    });
  }
}
