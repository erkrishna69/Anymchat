import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { FeedRepository } from '../../repositories/feed/feed.repository';
import { DirectRepository } from '../../repositories/direct/direct.repository';
import { GoogleDriveService } from './gdrive.service';
import { ArchiveLogModel } from '../../models/archive/archiveLog.model';
import { getMongoConnectionStatus } from '../../config/database/mongo.config';
import { ENV } from '../../config/env/env.config';
import { Logger } from '../../utils/logger/logger.util';

// In-memory fallback audit log if MongoDB is offline
const inMemoryArchiveLogs: any[] = [];

export class ChatArchivalService {
  /**
   * Validates archive encryption key strength
   */
  public static validateEncryptionKey(key: string): boolean {
    if (!key || key.length < 16) return false;
    const weakKeys = ['password', '1234567890', 'default_secret', 'changeme', 'admin'];
    if (weakKeys.includes(key.toLowerCase())) return false;
    return true;
  }

  /**
   * AES-256-GCM Encryption helper for secure transcript storage
   */
  public static encryptTranscript(
    plainText: string,
    secretKey: string,
    keyId: string = 'primary_v1'
  ): { encrypted: Buffer; iv: string; tag: string; keyId: string } {
    if (!this.validateEncryptionKey(secretKey)) {
      throw new Error('Encryption key does not meet minimum security requirements (min 16 chars, non-trivial entropy).');
    }
    // Derive deterministic 32-byte (256-bit) key from secret
    const key = crypto.createHash('sha256').update(secretKey).digest();
    const iv = crypto.randomBytes(12); // 96-bit unique nonce for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      keyId,
    };
  }

  /**
   * AES-256-GCM Decryption helper verifying auth tag and payload integrity
   */
  public static decryptTranscript(envelopeJson: string, secretKey: string): string {
    const envelope = typeof envelopeJson === 'string' ? JSON.parse(envelopeJson) : envelopeJson;
    if (!envelope || !envelope.iv || !envelope.tag || !envelope.data) {
      throw new Error('Invalid archive envelope format');
    }

    const key = crypto.createHash('sha256').update(secretKey).digest();
    const iv = Buffer.from(envelope.iv, 'hex');
    const tag = Buffer.from(envelope.tag, 'hex');
    const encryptedData = Buffer.from(envelope.data, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]).toString('utf8');

    // Verify SHA-256 Checksum
    if (envelope.sha256) {
      const actualHash = crypto.createHash('sha256').update(decrypted).digest('hex');
      if (actualHash !== envelope.sha256) {
        throw new Error('Archive checksum mismatch! Integrity compromised.');
      }
    }

    return decrypted;
  }

  /**
   * Runs the 1-hour batch chat archival process with AES-256-GCM encryption
   */
  public static async runHourlyArchive(
    customStart?: Date,
    customEnd?: Date,
    force: boolean = false
  ): Promise<{
    success: boolean;
    fileName: string;
    totalMessages: number;
    fileSizeBytes: number;
    sha256: string;
    gdriveFileId?: string;
    status: 'COMPLETED' | 'STAGED_LOCAL' | 'FAILED' | 'SKIPPED';
    error?: string;
  }> {
    if (!ENV.ARCHIVE_ENABLED && !force) {
      Logger.info('ℹ️ [Archival] Archival is disabled by privacy policy (ARCHIVE_ENABLED=false). Skipping.');
      return {
        success: true,
        fileName: '',
        totalMessages: 0,
        fileSizeBytes: 0,
        sha256: '',
        status: 'SKIPPED',
        error: 'Archival disabled by policy',
      };
    }

    const now = customEnd || new Date();
    // Align window to exact top of hour if not custom
    const endTime = customEnd || new Date(Math.floor(now.getTime() / (60 * 60 * 1000)) * (60 * 60 * 1000));
    const startTime = customStart || new Date(endTime.getTime() - 60 * 60 * 1000);

    // 1. Idempotency Check: Prevent duplicate archives for the exact same window
    if (getMongoConnectionStatus()) {
      try {
        const existing = await ArchiveLogModel.findOne({
          windowStart: startTime,
          windowEnd: endTime,
          status: { $in: ['COMPLETED', 'STAGED_LOCAL'] },
        });
        if (existing) {
          Logger.info(`ℹ️ [Archival] Window ${startTime.toISOString()} already processed. Skipping duplicate execution.`);
          return {
            success: true,
            fileName: existing.fileName,
            totalMessages: existing.totalMessages,
            fileSizeBytes: existing.fileSizeBytes,
            sha256: existing.sha256Hash,
            gdriveFileId: existing.gdriveFileId,
            status: existing.status as any,
          };
        }
      } catch {
        /* fallback */
      }
    }

    Logger.info(
      `📦 [Archival] Starting 1-Hour Chat Archival for window: ${startTime.toISOString()} to ${endTime.toISOString()}`
    );

    try {
      // 2. Fetch messages across feed and direct channels in the 1-hour window
      const [feedMsgs, directMsgs] = await Promise.all([
        FeedRepository.getMessagesByTimeWindow(startTime, endTime),
        DirectRepository.getMessagesByTimeWindow(startTime, endTime),
      ]);

      const totalFeed = feedMsgs.length;
      const totalDirect = directMsgs.length;
      const totalCount = totalFeed + totalDirect;

      // 3. Format transcript content
      const dateStr = startTime.toISOString().replace(/[:.]/g, '-');
      const fileName = `anymchat_archive_${dateStr}.enc.txt`;
      const dateFolder = startTime.toISOString().split('T')[0];
      const backupDir = path.join(ENV.LOCAL_BACKUP_DIR, 'hourly', dateFolder);

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const filePath = path.join(backupDir, fileName);

      // Build structured, auditable text transcript
      let transcript = '';
      transcript += '================================================================================\n';
      transcript += '                     ANYMCHAT HOURLY BACKUP TRANSCRIPT                         \n';
      transcript += '================================================================================\n';
      transcript += `Generated At      : ${new Date().toISOString()}\n`;
      transcript += `Window Start (UTC): ${startTime.toISOString()}\n`;
      transcript += `Window End   (UTC): ${endTime.toISOString()}\n`;
      transcript += `Total Messages    : ${totalCount} (Feed: ${totalFeed}, Direct: ${totalDirect})\n`;
      transcript += `Storage Security  : AES-256-GCM Encrypted at Rest\n`;
      transcript += '================================================================================\n\n';

      transcript += '--------------------------------------------------------------------------------\n';
      transcript += '--- LOCAL PROXIMITY FEED MESSAGES ---\n';
      transcript += '--------------------------------------------------------------------------------\n';
      if (feedMsgs.length === 0) {
        transcript += '[No feed messages in this 1-hour window]\n';
      } else {
        for (const msg of feedMsgs) {
          const time = new Date(msg.createdAt).toISOString();
          const sender = msg.senderAlias || 'Anonymous';
          const senderIdHash = crypto
            .createHash('sha256')
            .update(msg.senderAnonymousId || '')
            .digest('hex')
            .substring(0, 10);
          transcript += `[${time}] [FEED] [Sender: ${sender} (Hash: ${senderIdHash})] [Proximity: Nearby]: ${msg.content}\n`;
        }
      }

      transcript += '\n--------------------------------------------------------------------------------\n';
      transcript += '--- DIRECT 1-ON-1 MESSAGES ---\n';
      transcript += '--------------------------------------------------------------------------------\n';
      if (directMsgs.length === 0) {
        transcript += '[No direct messages in this 1-hour window]\n';
      } else {
        for (const msg of directMsgs) {
          const time = new Date(msg.createdAt).toISOString();
          const senderHash = crypto
            .createHash('sha256')
            .update(msg.senderAnonymousId || '')
            .digest('hex')
            .substring(0, 10);
          const recipientHash = crypto
            .createHash('sha256')
            .update(msg.recipientAnonymousId || '')
            .digest('hex')
            .substring(0, 10);
          transcript += `[${time}] [DM] [From: ${senderHash} -> To: ${recipientHash}]: ${msg.content}\n`;
        }
      }

      transcript += '\n================================================================================\n';
      transcript += '                             END OF TRANSCRIPT                                 \n';
      transcript += '================================================================================\n';

      // 4. Calculate SHA256 of plain transcript, then encrypt with AES-256-GCM
      const sha256 = crypto.createHash('sha256').update(transcript).digest('hex');
      const { encrypted, iv, tag, keyId } = this.encryptTranscript(transcript, ENV.ARCHIVE_ENCRYPTION_KEY, 'primary_v1');

      // Construct encrypted payload envelope
      const encryptedEnvelope = JSON.stringify({
        version: '2.0',
        keyId,
        cipher: 'AES-256-GCM',
        iv,
        tag,
        sha256,
        data: encrypted.toString('base64'),
      });

      // Write locally to stage
      fs.writeFileSync(filePath, encryptedEnvelope, 'utf-8');
      const stats = fs.statSync(filePath);

      Logger.info(
        `🔒 [Archival] Encrypted transcript written locally (${stats.size} bytes, SHA256: ${sha256.substring(0, 12)}...)`
      );

      // 5. Upload to Google Drive if configured
      let gdriveResult: any = { success: false, error: 'GDrive not attempted' };
      if (GoogleDriveService.isConfigured()) {
        gdriveResult = await GoogleDriveService.uploadTranscript(fileName, filePath, 'application/json');
      } else {
        gdriveResult = {
          success: false,
          error: 'Google Drive credentials not set in .env. Safely preserved in local staging.',
        };
      }

      const finalStatus: 'COMPLETED' | 'STAGED_LOCAL' | 'FAILED' = gdriveResult.success
        ? 'COMPLETED'
        : 'STAGED_LOCAL';

      // 6. Record Audit Log in Database & Memory
      const logRecord = {
        windowStart: startTime,
        windowEnd: endTime,
        totalFeedMessages: totalFeed,
        totalDirectMessages: totalDirect,
        totalMessages: totalCount,
        fileName,
        localPath: filePath,
        fileSizeBytes: stats.size,
        sha256Hash: sha256,
        isEncrypted: true,
        gdriveFileId: gdriveResult.fileId,
        gdriveWebViewLink: gdriveResult.webViewLink,
        status: finalStatus,
        errorMessage: gdriveResult.error,
        createdAt: new Date(),
      };

      if (getMongoConnectionStatus()) {
        try {
          await ArchiveLogModel.findOneAndUpdate(
            { windowStart: startTime, windowEnd: endTime },
            logRecord,
            { upsert: true, new: true }
          );
        } catch (err: any) {
          Logger.warn(`Failed to persist ArchiveLog to MongoDB: ${err.message}`);
        }
      }

      inMemoryArchiveLogs.unshift(logRecord);
      if (inMemoryArchiveLogs.length > 100) {
        inMemoryArchiveLogs.pop();
      }

      // 7. Prune staging files older than retention policy
      this.purgeOldLocalBackups(ENV.LOCAL_STAGING_RETENTION_HOURS);

      Logger.info(
        `✅ [Archival] Completed 1-Hour Archive job. Status: ${finalStatus}, Messages: ${totalCount}`
      );

      return {
        success: true,
        fileName,
        totalMessages: totalCount,
        fileSizeBytes: stats.size,
        sha256,
        gdriveFileId: gdriveResult.fileId,
        status: finalStatus,
        error: gdriveResult.error,
      };
    } catch (err: any) {
      Logger.error(`❌ [Archival] 1-Hour Archival error:`, err);
      return {
        success: false,
        fileName: '',
        totalMessages: 0,
        fileSizeBytes: 0,
        sha256: '',
        status: 'FAILED',
        error: err.message,
      };
    }
  }

  /**
   * Enforces local storage retention policy: Removes staging files older than maxAgeHours
   */
  public static purgeOldLocalBackups(maxAgeHours: number = ENV.LOCAL_STAGING_RETENTION_HOURS): number {
    let deletedCount = 0;
    try {
      const baseDir = path.join(ENV.LOCAL_BACKUP_DIR, 'hourly');
      if (!fs.existsSync(baseDir)) return 0;

      const cutoffMs = Date.now() - maxAgeHours * 60 * 60 * 1000;
      const dayDirs = fs.readdirSync(baseDir);

      for (const dayDir of dayDirs) {
        const fullDayPath = path.join(baseDir, dayDir);
        if (fs.statSync(fullDayPath).isDirectory()) {
          const files = fs.readdirSync(fullDayPath);
          for (const file of files) {
            const filePath = path.join(fullDayPath, file);
            const stats = fs.statSync(filePath);
            if (stats.mtimeMs < cutoffMs) {
              fs.unlinkSync(filePath);
              deletedCount++;
            }
          }
          // Remove folder if empty
          if (fs.readdirSync(fullDayPath).length === 0) {
            fs.rmdirSync(fullDayPath);
          }
        }
      }

      if (deletedCount > 0) {
        Logger.info(`🧹 [Storage Retention] Cleaned ${deletedCount} local archive staging files older than ${maxAgeHours} hours.`);
      }
    } catch (err: any) {
      Logger.warn(`Storage retention purge error: ${err.message}`);
    }
    return deletedCount;
  }

  /**
   * Fetch recent archival history logs
   */
  public static async getRecentLogs(limit: number = 20): Promise<any[]> {
    if (getMongoConnectionStatus()) {
      try {
        return await ArchiveLogModel.find().sort({ createdAt: -1 }).limit(limit);
      } catch {
        // fallback
      }
    }
    return inMemoryArchiveLogs.slice(0, limit);
  }
}

