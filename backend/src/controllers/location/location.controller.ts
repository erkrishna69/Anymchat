import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth/auth.middleware';
import { PresenceService } from '../../services/presence/presence.service';
import { UserRepository } from '../../repositories/user/user.repository';
import { HTTP_STATUS } from '../../constants/status/httpStatus.constants';
import { DISTANCE_CONSTANTS } from '../../constants/distance/distance.constants';

export class LocationController {
  public static async updateLocation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Unauthorized' });
        return;
      }

      const { latitude, longitude, radiusKm } = req.body;
      const effectiveRadius = radiusKm ? parseFloat(radiusKm) : DISTANCE_CONSTANTS.DEFAULT_RADIUS_KM;

      // Update in repository
      await UserRepository.createOrUpdate({
        anonymousId: req.user.anonymousId,
        alias: req.user.alias,
        avatarColor: '#6366F1',
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      });

      const count = PresenceService.getNearbyCount(parseFloat(latitude), parseFloat(longitude), effectiveRadius);
      const nearbyUsers = PresenceService.getNearbyPublicUsers(
        req.user.anonymousId,
        parseFloat(latitude),
        parseFloat(longitude),
        effectiveRadius
      );

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          radiusKm: effectiveRadius,
          nearbyCount: count,
          nearbyUsers,
        },
      });
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }
}
