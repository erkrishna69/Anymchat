import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth/auth.middleware';
import { PresenceService } from '../../services/presence/presence.service';
import { HTTP_STATUS } from '../../constants/status/httpStatus.constants';
import { DISTANCE_CONSTANTS } from '../../constants/distance/distance.constants';

export class PresenceController {
  public static async getNearbyUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Unauthorized' });
        return;
      }

      const { latitude, longitude, radiusKm } = req.query;

      if (!latitude || !longitude) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Latitude and Longitude query parameters are required',
        });
        return;
      }

      const effectiveRadius = radiusKm ? parseFloat(radiusKm as string) : DISTANCE_CONSTANTS.DEFAULT_RADIUS_KM;

      const nearbyUsers = PresenceService.getNearbyPublicUsers(
        req.user.anonymousId,
        parseFloat(latitude as string),
        parseFloat(longitude as string),
        effectiveRadius
      );

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          radiusKm: effectiveRadius,
          totalNearby: nearbyUsers.length,
          users: nearbyUsers,
        },
      });
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }
}
