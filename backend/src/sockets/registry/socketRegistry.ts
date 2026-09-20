import { Server, Socket } from 'socket.io';
import { IPublicFeedMessage } from '../../types/feed/feedMessage.types';
import { IPublicDirectMessage } from '../../types/direct/directMessage.types';
import { PresenceService } from '../../services/presence/presence.service';
import { SOCKET_EVENTS } from '../../constants/events/socketEvents.constants';
import { DISTANCE_CONSTANTS } from '../../constants/distance/distance.constants';
import { Logger } from '../../utils/logger/logger.util';

export class SocketRegistry {
  private static io: Server | null = null;

  public static init(io: Server): void {
    this.io = io;
  }

  public static getIO(): Server {
    if (!this.io) {
      throw new Error('Socket.io server not initialized');
    }
    return this.io;
  }

  /**
   * Broadcasts a feed message ONLY to connected sockets within 10 KM of author's coordinates!
   */
  public static broadcastFeedMessage(
    message: IPublicFeedMessage,
    authorLat: number,
    authorLon: number,
    radiusKm: number = DISTANCE_CONSTANTS.DEFAULT_RADIUS_KM
  ): void {
    if (!this.io) return;

    const nearbySessions = PresenceService.getNearbySessions(authorLat, authorLon, radiusKm);
    Logger.spatial(
      `Broadcasting message ${message.id} to ${nearbySessions.length} users within ${radiusKm} KM`
    );

    for (const session of nearbySessions) {
      this.io.to(session.socketId).emit(SOCKET_EVENTS.FEED_MESSAGE_RECEIVED, message);
    }
  }

  /**
   * Delivers a direct message directly to the recipient's active socket
   */
  public static sendDirectMessage(recipientAnonymousId: string, message: IPublicDirectMessage): void {
    if (!this.io) return;
    const socketId = PresenceService.getSocketIdByAnonymousId(recipientAnonymousId);
    if (socketId) {
      this.io.to(socketId).emit(SOCKET_EVENTS.DIRECT_MESSAGE_RECEIVED, message);
    }
  }

  /**
   * Sends typing indicator for 1-on-1 direct chat
   */
  public static sendTypingIndicator(
    recipientAnonymousId: string,
    senderAnonymousId: string,
    isTyping: boolean
  ): void {
    if (!this.io) return;
    const socketId = PresenceService.getSocketIdByAnonymousId(recipientAnonymousId);
    if (socketId) {
      this.io.to(socketId).emit(SOCKET_EVENTS.DIRECT_TYPING_INDICATOR, {
        senderAnonymousId,
        isTyping,
      });
    }
  }

  /**
   * Broadcasts updated nearby user list to everyone in that spatial cluster
   */
  public static broadcastNearbyPresenceUpdate(
    centerLat: number,
    centerLng: number,
    radiusKm: number = DISTANCE_CONSTANTS.DEFAULT_RADIUS_KM
  ): void {
    if (!this.io) return;
    const nearbySessions = PresenceService.getNearbySessions(centerLat, centerLng, radiusKm);

    for (const session of nearbySessions) {
      const users = PresenceService.getNearbyPublicUsers(
        session.anonymousId,
        session.latitude,
        session.longitude,
        session.radiusKm || radiusKm
      );
      this.io.to(session.socketId).emit(SOCKET_EVENTS.NEARBY_USERS_UPDATE, {
        totalNearby: nearbySessions.length,
        users,
      });
    }
  }

  /**
   * Broadcasts Orbit AI user timeout to everyone in that spatial cluster
   */
  public static broadcastUserTimeout(
    anonymousId: string,
    alias: string,
    timeoutMinutes: number,
    timeoutUntil: number,
    reason: string,
    centerLat: number,
    centerLng: number,
    radiusKm: number = DISTANCE_CONSTANTS.DEFAULT_RADIUS_KM
  ): void {
    if (!this.io) return;
    const nearbySessions = PresenceService.getNearbySessions(centerLat, centerLng, radiusKm);
    Logger.info(` [Orbit AI] Broadcasting timeout for ${alias} (${anonymousId}) to ${nearbySessions.length} users`);

    for (const session of nearbySessions) {
      this.io.to(session.socketId).emit(SOCKET_EVENTS.ORBIT_USER_TIMEOUT, {
        anonymousId,
        alias,
        timeoutMinutes,
        timeoutUntil,
        reason,
      });
    }
  }
}
