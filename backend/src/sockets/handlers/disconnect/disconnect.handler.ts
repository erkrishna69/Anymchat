import { Socket } from 'socket.io';
import { PresenceService } from '../../../services/presence/presence.service';
import { SocketRegistry } from '../../registry/socketRegistry';
import { Logger } from '../../../utils/logger/logger.util';

export function handleDisconnect(socket: Socket, reason: string): void {
  const removed = PresenceService.removeSession(socket.id);
  if (removed && removed.latitude !== undefined && removed.longitude !== undefined) {
    Logger.info(`Socket disconnected: ${removed.alias} (${reason})`);
    // Broadcast updated presence to remaining nearby active users
    SocketRegistry.broadcastNearbyPresenceUpdate(removed.latitude, removed.longitude, removed.radiusKm);
  }
}
