import { google } from 'googleapis';
import fs from 'fs';
import { ENV } from '../../config/env/env.config';
import { Logger } from '../../utils/logger/logger.util';

export class GoogleDriveService {
  private static driveClient: any = null;
  private static isInitialized = false;

  private static getClient() {
    if (this.isInitialized) {
      return this.driveClient;
    }

    this.isInitialized = true;

    try {
      // Option 1: Service Account (Recommended for automated server tasks)
      if (ENV.GDRIVE_SERVICE_ACCOUNT_EMAIL && ENV.GDRIVE_PRIVATE_KEY) {
        const auth = new google.auth.JWT({
          email: ENV.GDRIVE_SERVICE_ACCOUNT_EMAIL,
          key: ENV.GDRIVE_PRIVATE_KEY,
          scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
        });
        this.driveClient = google.drive({ version: 'v3', auth });
        Logger.info('📁 [Google Drive] Initialized Google Drive client with Service Account');
        return this.driveClient;
      }

      // Option 2: OAuth2 Client with Refresh Token
      if (ENV.GDRIVE_CLIENT_ID && ENV.GDRIVE_CLIENT_SECRET && ENV.GDRIVE_REFRESH_TOKEN) {
        const oauth2Client = new google.auth.OAuth2(
          ENV.GDRIVE_CLIENT_ID,
          ENV.GDRIVE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({
          refresh_token: ENV.GDRIVE_REFRESH_TOKEN,
        });
        this.driveClient = google.drive({ version: 'v3', auth: oauth2Client });
        Logger.info('📁 [Google Drive] Initialized Google Drive client with OAuth2 Credentials');
        return this.driveClient;
      }

      Logger.info(
        '📁 [Google Drive] No GDrive credentials provided in .env. Operating in Local Secure Staging Mode.'
      );
      this.driveClient = null;
      return null;
    } catch (err: any) {
      Logger.warn(`📁 [Google Drive] Initialization error: ${err.message}`);
      this.driveClient = null;
      return null;
    }
  }

  /**
   * Upload a text transcript or backup archive file to Google Drive
   */
  public static async uploadTranscript(
    fileName: string,
    localFilePath: string,
    mimeType: string = 'text/plain'
  ): Promise<{
    success: boolean;
    fileId?: string;
    webViewLink?: string;
    error?: string;
  }> {
    const drive = this.getClient();

    if (!drive) {
      return {
        success: false,
        error: 'Google Drive credentials not configured. File staged locally.',
      };
    }

    try {
      const fileMetadata: any = {
        name: fileName,
      };

      if (ENV.GDRIVE_FOLDER_ID && ENV.GDRIVE_FOLDER_ID.trim().length > 0) {
        fileMetadata.parents = [ENV.GDRIVE_FOLDER_ID.trim()];
      }

      const media = {
        mimeType,
        body: fs.createReadStream(localFilePath),
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, name, webViewLink, webContentLink',
        supportsAllDrives: true,
      });

      const fileId = response.data.id;
      const webViewLink = response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

      Logger.info(`☁️ [Google Drive] Uploaded "${fileName}" successfully! File ID: ${fileId}`);

      return {
        success: true,
        fileId,
        webViewLink,
      };
    } catch (err: any) {
      Logger.error(`☁️ [Google Drive] Upload failed for ${fileName}:`, err.message);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Check if Google Drive integration is fully configured and active
   */
  public static isConfigured(): boolean {
    return !!(
      (ENV.GDRIVE_SERVICE_ACCOUNT_EMAIL && ENV.GDRIVE_PRIVATE_KEY) ||
      (ENV.GDRIVE_CLIENT_ID && ENV.GDRIVE_CLIENT_SECRET && ENV.GDRIVE_REFRESH_TOKEN)
    );
  }
}
