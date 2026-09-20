import { Socket } from 'socket.io';
import { verifyUserToken } from '../../../utils/crypto/token.util';
import { PresenceService } from '../../../services/presence/presence.service';
import { handleLocationUpdate } from '../location/locationUpdate.handler';
import { handleFeedMessage } from '../feed/feedMessage.handler';
import { handleDirectMessage, handleTypingIndicator } from '../direct/directChat.handler';
import { handleDisconnect } from '../disconnect/disconnect.handler';
import { SOCKET_EVENTS } from '../../../constants/events/socketEvents.constants';
import { Logger } from '../../../utils/logger/logger.util';
import { SocketRegistry } from '../../registry/socketRegistry';
import {
  checkSocketConnectionRate,
  checkSocketEventRate,
  validatePayloadSize,
  cleanupSocketSecurity,
  getSocketIp,
} from '../../middleware/socketSecurity.middleware';

export function handleConnection(socket: Socket): void {
  // 1. Connection Handshake Rate Limiter (Max 25/min per IP)
  if (!checkSocketConnectionRate(socket)) {
    Logger.warn(`Socket connection rate limit exceeded for IP: ${getSocketIp(socket)}`);
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Too many connection attempts. Please wait.' });
    socket.disconnect(true);
    return;
  }

  const token = socket.handshake.auth?.token || (socket.handshake.query?.token as string);
  const alias = (socket.handshake.query?.alias as string) || 'Anonymous';
  const avatarColor = (socket.handshake.query?.avatarColor as string) || '#6366F1';

  let anonymousId = `anon_${socket.id.substring(0, 6)}`;
  let userAlias = alias;
  let userGender: 'male' | 'female' | 'other' = 'other';
  let userAvatarId = 1;

  if (token) {
    const verified = verifyUserToken(token);
    if (verified) {
      anonymousId = verified.anonymousId;
      userAlias = verified.alias;
      userGender = verified.gender || 'other';
      userAvatarId = verified.avatarId || 1;
    }
  }

  // 2. Register session (enforces max 3 concurrent active sockets per user)
  const registration = PresenceService.registerSession({
    socketId: socket.id,
    anonymousId,
    alias: userAlias,
    avatarColor,
    avatarId: userAvatarId,
    gender: userGender,
    latitude: 0,
    longitude: 0,
    radiusKm: 10,
    lastActive: Date.now(),
    ip: getSocketIp(socket),
  });

  if (registration.evictedSocketId) {
    try {
      const io = SocketRegistry.getIO();
      const oldSocket = io.sockets.sockets.get(registration.evictedSocketId);
      if (oldSocket) {
        oldSocket.emit(SOCKET_EVENTS.ERROR, { message: 'Session opened in another window/device.' });
        oldSocket.disconnect(true);
      }
    } catch {
      /* IO not ready yet */
    }
  }

  Logger.info(`Socket connected: ${userAlias} [${anonymousId}] - Socket ID: ${socket.id}`);

  // Helper to safely execute socket handlers with event rate & payload limits
  const safeHandler = (handler: (socket: Socket, payload: any) => void) => (payload: any) => {
    if (!checkSocketEventRate(socket)) return;
    if (!validatePayloadSize(payload, 4096)) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Payload size exceeds 4KB limit' });
      return;
    }
    handler(socket, payload);
  };

  // Hook event handlers
  socket.on(SOCKET_EVENTS.UPDATE_LOCATION, safeHandler(handleLocationUpdate));
  socket.on(SOCKET_EVENTS.SEND_FEED_MESSAGE, safeHandler(handleFeedMessage));
  socket.on(SOCKET_EVENTS.SEND_DIRECT_MESSAGE, safeHandler(handleDirectMessage));
  socket.on(SOCKET_EVENTS.TYPING_DIRECT, safeHandler(handleTypingIndicator));

  socket.on('disconnect', (reason) => {
    cleanupSocketSecurity(socket.id);
    handleDisconnect(socket, reason);
  });
}
