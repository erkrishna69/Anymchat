import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth/auth.middleware';
import { FeedService } from '../../services/feed/feed.service';
import { HTTP_STATUS } from '../../constants/status/httpStatus.constants';
import { DISTANCE_CONSTANTS } from '../../constants/distance/distance.constants';
import { SocketRegistry } from '../../sockets/registry/socketRegistry';

export class FeedController {
  public static async getFeed(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Unauthorized' });
        return;
      }

      const { latitude, longitude, radiusKm } = req.query;

      if (!latitude || !longitude) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Latitude and Longitude query parameters are required to see the local feed',
        });
        return;
      }

      const effectiveRadius = radiusKm ? parseFloat(radiusKm as string) : DISTANCE_CONSTANTS.DEFAULT_RADIUS_KM;

      const messages = await FeedService.getNearbyFeed(
        req.user.anonymousId,
        parseFloat(latitude as string),
        parseFloat(longitude as string),
        effectiveRadius
      );

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          radiusKm: effectiveRadius,
          messages,
        },
      });
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }

  public static async postMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Unauthorized' });
        return;
      }

      const { content, latitude, longitude } = req.body;

      const message = await FeedService.postMessage({
        senderAnonymousId: req.user.anonymousId,
        senderAlias: req.user.alias,
        senderAvatarColor: '#6366F1',
        content,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      });

      // Realtime spatial broadcast to nearby sockets
      SocketRegistry.broadcastFeedMessage(message, parseFloat(latitude), parseFloat(longitude));

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message,
      });
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }
}
