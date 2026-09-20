import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth/auth.middleware';
import { DirectChatService } from '../../services/direct/directChat.service';
import { HTTP_STATUS } from '../../constants/status/httpStatus.constants';
import { SocketRegistry } from '../../sockets/registry/socketRegistry';

export class DirectController {
  public static async getChatHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Unauthorized' });
        return;
      }

      const { otherUserId } = req.params;
      if (!otherUserId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Target user ID is required' });
        return;
      }

      const history = await DirectChatService.getChatHistory(req.user.anonymousId, otherUserId);
      await DirectChatService.markMessagesRead(req.user.anonymousId, otherUserId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }

  public static async sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Unauthorized' });
        return;
      }

      const { recipientAnonymousId, content } = req.body;
      const result = await DirectChatService.sendMessage(
        req.user.anonymousId,
        recipientAnonymousId,
        content
      );

      if (!result.success || !result.message) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: result.error || 'Failed to send direct message',
        });
        return;
      }

      // Deliver via socket if recipient is online
      SocketRegistry.sendDirectMessage(recipientAnonymousId, result.message);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }
}
