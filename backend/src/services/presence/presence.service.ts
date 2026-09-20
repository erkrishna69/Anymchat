import { IPublicAnonymousUser } from '../../types/user/user.types';
import { HaversineService } from '../geo/haversine.service';
import { DISTANCE_CONSTANTS } from '../../constants/distance/distance.constants';
import { Logger } from '../../utils/logger/logger.util';
import { SafetyService } from '../safety/safety.service';

export interface ActiveSession {
  socketId: string;
  anonymousId: string;
  alias: string;
  avatarColor: string;
  avatarId?: number;
  gender?: 'male' | 'female' | 'other';
  latitude: number;
  longitude: number;
  radiusKm: number;
  lastActive: number;
  lastLocationUpdate?: number;
  ip?: string;
}

export class PresenceService {
  private static activeSessions = new Map<string, ActiveSession>(); // socketId -> session
  private static userSocketsMap = new Map<string, Set<string>>(); // anonymousId -> Set<socketId>

  public static readonly MAX_CONCURRENT_SOCKETS_PER_USER = 3;

  public static registerSession(session: ActiveSession): { evictedSocketId?: string } {
    this.activeSessions.set(session.socketId, session);

    let userSockets = this.userSocketsMap.get(session.anonymousId);
    if (!userSockets) {
      userSockets = new Set<string>();
      this.userSocketsMap.set(session.anonymousId, userSockets);
    }

    let evictedSocketId: string | undefined;
    // If user has more than MAX_CONCURRENT_SOCKETS, evict the oldest socket
    if (userSockets.size >= this.MAX_CONCURRENT_SOCKETS_PER_USER) {
      const oldestSocketId = userSockets.values().next().value;
      if (oldestSocketId && oldestSocketId !== session.socketId) {
        userSockets.delete(oldestSocketId);
        this.activeSessions.delete(oldestSocketId);
        evictedSocketId = oldestSocketId;
        Logger.info(`Evicted older session socket ${oldestSocketId} for user ${session.anonymousId}`);
      }
    }

    userSockets.add(session.socketId);
    Logger.info(`Registered session for ${session.alias} (${session.anonymousId}) on socket ${session.socketId}`);
    return { evictedSocketId };
  }

  public static updateLocation(
    socketId: string,
    latitude: number,
    longitude: number,
    radiusKm: number = DISTANCE_CONSTANTS.DEFAULT_RADIUS_KM
  ): ActiveSession | null {
    const session = this.activeSessions.get(socketId);
    if (!session) return null;

    session.latitude = latitude;
    session.longitude = longitude;
    session.radiusKm = radiusKm;
    session.lastActive = Date.now();
    session.lastLocationUpdate = Date.now();
    this.activeSessions.set(socketId, session);
    return session;
  }

  public static removeSession(socketId: string): ActiveSession | null {
    const session = this.activeSessions.get(socketId);
    if (session) {
      this.activeSessions.delete(socketId);
      const userSockets = this.userSocketsMap.get(session.anonymousId);
      if (userSockets) {
        userSockets.delete(socketId);
        if (userSockets.size === 0) {
          this.userSocketsMap.delete(session.anonymousId);
        }
      }
      Logger.info(`Removed session for ${session.alias} (${session.anonymousId})`);
      return session;
    }
    return null;
  }

  public static getSessionBySocketId(socketId: string): ActiveSession | undefined {
    return this.activeSessions.get(socketId);
  }

  public static getSocketIdsByAnonymousId(anonymousId: string): string[] {
    const set = this.userSocketsMap.get(anonymousId);
    return set ? Array.from(set) : [];
  }

  public static getSocketIdByAnonymousId(anonymousId: string): string | undefined {
    const set = this.userSocketsMap.get(anonymousId);
    if (!set || set.size === 0) return undefined;
    return Array.from(set)[set.size - 1]; // Return most recently active socket
  }

  public static getNearbySessions(
    centerLat: number,
    centerLng: number,
    radiusKm: number = DISTANCE_CONSTANTS.DEFAULT_RADIUS_KM
  ): ActiveSession[] {
    const nearby: ActiveSession[] = [];
    const seenUsers = new Set<string>();

    for (const session of this.activeSessions.values()) {
      if (session.latitude !== undefined && session.longitude !== undefined) {
        // Avoid duplicate counting if user has multiple devices
        if (seenUsers.has(session.anonymousId)) continue;
        if (HaversineService.isNearby(centerLat, centerLng, session.latitude, session.longitude, radiusKm)) {
          seenUsers.add(session.anonymousId);
          nearby.push(session);
        }
      }
    }
    return nearby;
  }

  /**
   * Returns list of sanitized public profiles nearby without exposing lat/lng
   */
  public static getNearbyPublicUsers(
    currentAnonymousId: string,
    centerLat: number,
    centerLng: number,
    radiusKm: number = DISTANCE_CONSTANTS.DEFAULT_RADIUS_KM
  ): IPublicAnonymousUser[] {
    const nearbySessions = this.getNearbySessions(centerLat, centerLng, radiusKm);
    return nearbySessions
      .filter((s) => s.anonymousId !== currentAnonymousId)
      .map((s) => {
        const timeoutStatus = SafetyService.getTimeoutStatus(s.anonymousId);
        return {
          anonymousId: s.anonymousId,
          alias: s.alias,
          avatarColor: s.avatarColor,
          avatarId: s.avatarId,
          gender: s.gender,
          interests: ['Music', 'Gaming', 'Tech'],
          isOnline: true,
          isTimedOut: timeoutStatus.isTimedOut,
          timeoutUntil: timeoutStatus.isTimedOut ? Date.now() + timeoutStatus.remainingSeconds * 1000 : undefined,
          proximityTag: 'Nearby (< 10km)',
        };
      });
  }

  public static getNearbyCount(
    centerLat: number,
    centerLng: number,
    radiusKm: number = DISTANCE_CONSTANTS.DEFAULT_RADIUS_KM
  ): number {
    return this.getNearbySessions(centerLat, centerLng, radiusKm).length;
  }
}
