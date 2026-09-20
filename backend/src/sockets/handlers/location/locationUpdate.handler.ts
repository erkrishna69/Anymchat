import { Socket } from 'socket.io';
import { LocationUpdatePayload } from '../../../types/socket/socketPayload.types';
import { PresenceService } from '../../../services/presence/presence.service';
import { SocketRegistry } from '../../registry/socketRegistry';
import { DISTANCE_CONSTANTS } from '../../../constants/distance/distance.constants';
import { SOCKET_EVENTS } from '../../../constants/events/socketEvents.constants';
import { HaversineService } from '../../../services/geo/haversine.service';
import { checkRateLimit } from '../../../middlewares/rateLimit/rateLimit.middleware';

export function handleLocationUpdate(socket: Socket, payload: LocationUpdatePayload): void {
  if (!payload) return;
  const { latitude, longitude, radiusKm } = payload;

  // 1. Strict Coordinate Validation (-90 <= lat <= 90, -180 <= lng <= 180)
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    isNaN(latitude) ||
    isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Invalid GPS coordinates bounds' });
    return;
  }

  // 2. Location Rate Limiter (Max 12 updates per minute per socket)
  const { limited } = checkRateLimit('socket_location', socket.id, 60 * 1000, 12);
  if (limited) {
    // Silently ignore excessive location spam to preserve CPU
    return;
  }

  const existingSession = PresenceService.getSessionBySocketId(socket.id);
  if (existingSession && existingSession.latitude !== 0 && existingSession.longitude !== 0) {
    const distanceDiff = HaversineService.getDistance(
      existingSession.latitude,
      existingSession.longitude,
      latitude,
      longitude
    );

    const timeDiffSec = Math.max(1, (Date.now() - (existingSession.lastLocationUpdate || 0)) / 1000);

    // 3. Anti-Teleportation Guard (e.g. > 500 KM in under 60 seconds is physically impossible)
    if (distanceDiff > 500 && timeDiffSec < 60) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Abnormal location jump detected' });
      return;
    }

    // 4. Micro-Jitter Suppression (Under 10 meters within 10 seconds: avoid redundant broadcast storms)
    if (distanceDiff < 0.01 && timeDiffSec < 10) {
      return;
    }
  }

  const effectiveRadius = radiusKm || DISTANCE_CONSTANTS.DEFAULT_RADIUS_KM;
  const session = PresenceService.updateLocation(socket.id, latitude, longitude, effectiveRadius);

  if (session) {
    const nearbySessions = PresenceService.getNearbySessions(latitude, longitude, effectiveRadius);
    const nearbyUsers = PresenceService.getNearbyPublicUsers(
      session.anonymousId,
      latitude,
      longitude,
      effectiveRadius
    );

    socket.emit(SOCKET_EVENTS.NEARBY_USERS_UPDATE, {
      totalNearby: nearbySessions.length,
      users: nearbyUsers,
    });

    // Notify other nearby users that someone is active in the area
    SocketRegistry.broadcastNearbyPresenceUpdate(latitude, longitude, effectiveRadius);
  }
}
