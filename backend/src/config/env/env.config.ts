import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const ENV = {
  PORT: parseInt(process.env.PORT || '5050', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/anymchat',
  JWT_SECRET: process.env.JWT_SECRET || 'anymchat_ultra_secure_jwt_secret_9823471',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  DEFAULT_RADIUS_KM: parseFloat(process.env.DEFAULT_RADIUS_KM || '10'),
  RATE_LIMIT_MAX_PER_MINUTE: parseInt(process.env.RATE_LIMIT_MAX_PER_MINUTE || '30', 10),

  // Security & Admin API
  ADMIN_API_KEY: process.env.ADMIN_API_KEY || 'anymchat_admin_secret_key_change_in_prod',

  // Redis Configuration
  REDIS_URI: process.env.REDIS_URI || process.env.REDIS_URL || '',
  REDIS_HOST: process.env.REDIS_HOST || '127.0.0.1',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
  REDIS_DB: parseInt(process.env.REDIS_DB || '0', 10),

  // Message Ephemeral Lifecycle (24 Hours)
  MESSAGE_TTL_SECONDS: parseInt(process.env.MESSAGE_TTL_SECONDS || '86400', 10), // 24 hours = 86400 sec

  // Privacy, Archival & Encryption Settings
  ARCHIVE_ENABLED: process.env.ARCHIVE_ENABLED === 'true', // Defaults to false for strict privacy
  ARCHIVE_INTERVAL_CRON: process.env.ARCHIVE_INTERVAL_CRON || '0 * * * *', // Every hour at minute 0
  ARCHIVE_ENCRYPTION_KEY: process.env.ARCHIVE_ENCRYPTION_KEY || 'anymchat_ultra_secure_archive_encryption_key_32b',
  LOCAL_BACKUP_DIR: process.env.LOCAL_BACKUP_DIR || path.resolve(process.cwd(), 'backups'),
  LOCAL_STAGING_RETENTION_HOURS: parseInt(process.env.LOCAL_STAGING_RETENTION_HOURS || '24', 10),

  // Google Drive Credentials
  GDRIVE_FOLDER_ID: process.env.GDRIVE_FOLDER_ID || '',
  GDRIVE_SERVICE_ACCOUNT_EMAIL: process.env.GDRIVE_SERVICE_ACCOUNT_EMAIL || '',
  GDRIVE_PRIVATE_KEY: (process.env.GDRIVE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  GDRIVE_CLIENT_ID: process.env.GDRIVE_CLIENT_ID || '',
  GDRIVE_CLIENT_SECRET: process.env.GDRIVE_CLIENT_SECRET || '',
  GDRIVE_REFRESH_TOKEN: process.env.GDRIVE_REFRESH_TOKEN || '',
};


