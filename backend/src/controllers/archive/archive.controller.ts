import { Request, Response } from 'express';
import { ChatArchivalService } from '../../services/archive/chatArchival.service';
import { GoogleDriveService } from '../../services/archive/gdrive.service';
import { getRedisStatus } from '../../config/redis/redis.config';
import { getMongoConnectionStatus } from '../../config/database/mongo.config';
import { ENV } from '../../config/env/env.config';

export class ArchiveController {
  public static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const logs = await ChatArchivalService.getRecentLogs(10);
      const isGDriveActive = GoogleDriveService.isConfigured();
      const isRedisActive = getRedisStatus();
      const isMongoActive = getMongoConnectionStatus();

      res.status(200).json({
        success: true,
        data: {
          system: {
            redisConnected: isRedisActive,
            mongoConnected: isMongoActive,
            googleDriveConfigured: isGDriveActive,
            messageTtlSeconds: ENV.MESSAGE_TTL_SECONDS,
            archiveIntervalCron: ENV.ARCHIVE_INTERVAL_CRON,
            localBackupDir: ENV.LOCAL_BACKUP_DIR,
          },
          recentArchives: logs,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async triggerArchive(req: Request, res: Response): Promise<void> {
    try {
      const { startHoursAgo = 1 } = req.body || {};
      const now = new Date();
      const startTime = new Date(now.getTime() - Number(startHoursAgo) * 60 * 60 * 1000);

      const result = await ChatArchivalService.runHourlyArchive(startTime, now);

      res.status(200).json({
        success: true,
        message: 'Archival job executed successfully',
        data: result,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
