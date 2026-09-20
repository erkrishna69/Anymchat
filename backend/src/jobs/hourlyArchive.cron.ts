import cron, { ScheduledTask } from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { ChatArchivalService } from '../services/archive/chatArchival.service';
import { FeedCacheService } from '../services/cache/feedCache.service';
import { getRedisClient, getRedisStatus } from '../config/redis/redis.config';
import { ENV } from '../config/env/env.config';
import { Logger } from '../utils/logger/logger.util';

let archiveTask: ScheduledTask | null = null;
let isJobRunning = false;
const INSTANCE_ID = `inst_${uuidv4().substring(0, 8)}`;
const DISTRIBUTED_LOCK_KEY = 'lock:cron:hourly_archive';
const LOCK_TTL_MS = 300000; // 5 minutes max lock duration

export function startHourlyArchiveCron(): void {
  if (archiveTask) {
    Logger.info('Hourly Archival Cron already initialized');
    return;
  }

  const cronPattern = ENV.ARCHIVE_INTERVAL_CRON || '0 * * * *'; // Runs every 1 hour at minute 0

  Logger.info(`Initializing Hourly Chat Archival Cron [Instance: ${INSTANCE_ID}] with schedule: "${cronPattern}"`);

  archiveTask = cron.schedule(cronPattern, async () => {
    if (isJobRunning) {
      Logger.warn('Process-level archive job is already in progress. Skipping tick.');
      return;
    }

    // 1. Distributed Multi-Instance Lock via Redis
    let lockAcquired = false;
    if (getRedisStatus()) {
      try {
        const client = getRedisClient();
        if (client) {
          const res = await client.set(DISTRIBUTED_LOCK_KEY, INSTANCE_ID, 'PX', LOCK_TTL_MS, 'NX');
          if (!res) {
            Logger.info(
              `[Distributed Lock] Another instance is already executing the hourly archive. Skipping on instance ${INSTANCE_ID}.`
            );
            return;
          }
          lockAcquired = true;
        }
      } catch (err: any) {
        Logger.warn(`Distributed lock acquire error: ${err.message}. Falling back to process-level lock.`);
      }
    }

    isJobRunning = true;
    Logger.info(`[Cron Trigger] Instance ${INSTANCE_ID} executing scheduled 1-Hour Chat Archival Job...`);

    // Lease renewal heartbeat timer (extends lock every 60s while job is actively running)
    let renewalTimer: NodeJS.Timeout | null = null;
    if (lockAcquired) {
      renewalTimer = setInterval(async () => {
        if (!isJobRunning || !getRedisStatus()) return;
        try {
          const client = getRedisClient();
          if (client) {
            const current = await client.get(DISTRIBUTED_LOCK_KEY);
            if (current === INSTANCE_ID) {
              await client.pexpire(DISTRIBUTED_LOCK_KEY, LOCK_TTL_MS);
              Logger.info(`[Distributed Lock] Renewed lease for instance ${INSTANCE_ID}`);
            }
          }
        } catch {
          /* ignore */
        }
      }, 60 * 1000);
      renewalTimer.unref?.();
    }

    try {
      // 2. Run 1-hour archive (respects ARCHIVE_ENABLED flag & AES-256-GCM encryption)
      const result = await ChatArchivalService.runHourlyArchive();
      Logger.info(
        `[Cron Complete] Archive Job Status: ${result.status}, Messages: ${result.totalMessages}`
      );

      // 3. Perform 24-Hour Cache Lifecycle Maintenance
      const purged = await FeedCacheService.purgeExpiredMessages();
      if (purged > 0) {
        Logger.info(`[Cron Purge] Cleaned ${purged} expired 24h messages from active cache`);
      }
    } catch (err: any) {
      Logger.error('[Cron Error] Failed during hourly archive execution:', err);
    } finally {
      if (renewalTimer) {
        clearInterval(renewalTimer);
      }
      isJobRunning = false;
      // Release distributed lock safely if held by this instance
      if (lockAcquired && getRedisStatus()) {
        try {
          const client = getRedisClient();
          if (client) {
            const currentHolder = await client.get(DISTRIBUTED_LOCK_KEY);
            if (currentHolder === INSTANCE_ID) {
              await client.del(DISTRIBUTED_LOCK_KEY);
            }
          }
        } catch {
          /* ignore */
        }
      }
    }
  });
}

export function stopHourlyArchiveCron(): void {
  if (archiveTask) {
    archiveTask.stop();
    archiveTask = null;
    Logger.info('Hourly Archival Cron stopped');
  }
}

