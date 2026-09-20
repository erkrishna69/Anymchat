import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth/auth.middleware';
import { SafetyService } from '../../services/safety/safety.service';
import { HTTP_STATUS } from '../../constants/status/httpStatus.constants';

export class SafetyController {
  public static async reportUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Unauthorized' });
        return;
      }

      const { reportedAnonymousId, messageId, reason, additionalDetails } = req.body;

      const report = await SafetyService.fileReport({
        reporterAnonymousId: req.user.anonymousId,
        reportedAnonymousId,
        messageId,
        reason,
        additionalDetails,
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Report received. Our safety moderation team will review this.',
        reportId: report._id,
      });
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }

  public static async blockUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Unauthorized' });
        return;
      }

      const { targetAnonymousId } = req.body;
      await SafetyService.blockUser(req.user.anonymousId, targetAnonymousId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `User ${targetAnonymousId} blocked. Their messages will no longer appear in your feed.`,
      });
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }

  public static async unblockUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Unauthorized' });
        return;
      }

      const { targetAnonymousId } = req.body;
      await SafetyService.unblockUser(req.user.anonymousId, targetAnonymousId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `User ${targetAnonymousId} unblocked.`,
      });
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }

  public static async getBlockedUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Unauthorized' });
        return;
      }

      const blocked = await SafetyService.getBlockedUsers(req.user.anonymousId);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: blocked,
      });
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }
}
