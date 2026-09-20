import { Socket } from 'socket.io';
import { SendFeedMessagePayload } from '../../../types/socket/socketPayload.types';
import { PresenceService } from '../../../services/presence/presence.service';
import { FeedService } from '../../../services/feed/feed.service';
import { SafetyService } from '../../../services/safety/safety.service';
import { SocketRegistry } from '../../registry/socketRegistry';
import { SOCKET_EVENTS } from '../../../constants/events/socketEvents.constants';
import { AiHookService } from '../../../services/ai/aiHook.service';
import { IdempotencyService } from '../../../services/dedup/idempotency.service';


export async function handleFeedMessage(socket: Socket, payload: SendFeedMessagePayload): Promise<void> {
  const session = PresenceService.getSessionBySocketId(socket.id);
  if (!session) {
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Session not initialized' });
    return;
  }

  if (session.latitude === undefined || session.longitude === undefined) {
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Location required before posting to nearby feed' });
    return;
  }

  // 1. Message Deduplication Check (Prevents duplicate messages during reconnect storms)
  if (payload.clientMessageId) {
    const cached = await IdempotencyService.getProcessedMessage(payload.clientMessageId);
    if (cached) {
      socket.emit(SOCKET_EVENTS.FEED_MESSAGE_RECEIVED, cached);
      return;
    }
  }

  // 2. Hard Payload Validation & Character Length Bound (1 to 500 characters)
  if (!payload || typeof payload.content !== 'string') {
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Invalid payload format' });
    return;
  }

  const cleanContent = payload.content.trim();
  if (cleanContent.length === 0) {
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Message content cannot be empty' });
    return;
  }

  if (cleanContent.length > 500) {
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Message cannot exceed 500 characters' });
    return;
  }


  // 2. Hard Rate Limit & Anti-Spam Check (Runs before any AI or DB compute)
  const spamCheck = SafetyService.checkSpam(session.anonymousId, cleanContent);
  if (spamCheck.isSpam && spamCheck.penalty) {
    socket.emit(SOCKET_EVENTS.ERROR, {
      message: spamCheck.penalty.message,
      isTimedOut: true,
      timeoutMinutes: spamCheck.penalty.timeoutMinutes,
      remainingSeconds: spamCheck.penalty.timeoutMinutes * 60,
      violationCount: spamCheck.penalty.violationCount,
    });
    // Broadcast timeout to nearby users
    SocketRegistry.broadcastUserTimeout(
      session.anonymousId,
      session.alias,
      spamCheck.penalty.timeoutMinutes,
      spamCheck.penalty.timeoutUntil,
      'Rapid messaging / flood spamming',
      session.latitude,
      session.longitude,
      session.radiusKm
    );
    return;
  }

  // 3. Active Timeout Check
  const timeoutStatus = SafetyService.getTimeoutStatus(session.anonymousId);
  if (timeoutStatus.isTimedOut) {
    socket.emit(SOCKET_EVENTS.ERROR, {
      message: timeoutStatus.message,
      isTimedOut: true,
      remainingSeconds: timeoutStatus.remainingSeconds,
      remainingMinutes: timeoutStatus.remainingMinutes,
    });
    return;
  }

  // 4. Rule-Based & Orbit AI Content Safety Pipeline
  try {
    const moderation = await AiHookService.moderateContent(cleanContent, session.anonymousId);
    if (!moderation.isAllowed) {
      // Record violation and trigger progressive timeout (Strike 1: 5m, Strike 2: 25m, Strike 3: 60m)
      const penalty = SafetyService.recordViolation(session.anonymousId, moderation.reason || 'Policy violation');
      socket.emit(SOCKET_EVENTS.ERROR, {
        message: penalty.message,
        isTimedOut: true,
        timeoutMinutes: penalty.timeoutMinutes,
        remainingSeconds: penalty.timeoutMinutes * 60,
        violationCount: penalty.violationCount,
      });
      // Broadcast timeout to nearby users so participants see yellow badge and faded alias
      SocketRegistry.broadcastUserTimeout(
        session.anonymousId,
        session.alias,
        penalty.timeoutMinutes,
        penalty.timeoutUntil,
        moderation.reason || 'Policy violation',
        session.latitude,
        session.longitude,
        session.radiusKm
      );
      return;
    }
  } catch {
    // If AI engine experiences transient error, fallback rule-based safety already passed
  }

  // 5. Persist to MongoDB & Broadcast to 10 KM Cluster
  try {
    const message = await FeedService.postMessage({
      senderAnonymousId: session.anonymousId,
      senderAlias: session.alias,
      senderAvatarColor: session.avatarColor,
      senderGender: session.gender,
      avatarId: session.avatarId,
      clientMessageId: payload.clientMessageId,
      content: cleanContent,
      replyTo: payload.replyTo,
      latitude: session.latitude,
      longitude: session.longitude,
    });

    // Broadcast only within 10 km
    SocketRegistry.broadcastFeedMessage(message, session.latitude, session.longitude, session.radiusKm);

    // Record for idempotency deduplication
    if (payload.clientMessageId) {
      await IdempotencyService.recordProcessedMessage(payload.clientMessageId, message);
    }
  } catch (err: any) {
    socket.emit(SOCKET_EVENTS.ERROR, { message: err.message || 'Failed to send feed message' });
  }
}

