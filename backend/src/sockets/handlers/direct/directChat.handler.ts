import { Socket } from 'socket.io';
import { SendDirectMessagePayload, TypingDirectPayload } from '../../../types/socket/socketPayload.types';
import { PresenceService } from '../../../services/presence/presence.service';
import { DirectChatService } from '../../../services/direct/directChat.service';
import { SafetyService } from '../../../services/safety/safety.service';
import { SocketRegistry } from '../../registry/socketRegistry';
import { SOCKET_EVENTS } from '../../../constants/events/socketEvents.constants';
import { AiHookService } from '../../../services/ai/aiHook.service';
import { IdempotencyService } from '../../../services/dedup/idempotency.service';

export async function handleDirectMessage(socket: Socket, payload: SendDirectMessagePayload): Promise<void> {
  const session = PresenceService.getSessionBySocketId(socket.id);
  if (!session) {
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Session not initialized' });
    return;
  }

  // 1. Message Deduplication Check (Prevents duplicate messages during reconnect storms)
  if (payload.clientMessageId) {
    const cached = await IdempotencyService.getProcessedMessage(payload.clientMessageId);
    if (cached) {
      socket.emit(SOCKET_EVENTS.DIRECT_MESSAGE_RECEIVED, {
        ...cached,
        isMine: true,
      });
      return;
    }
  }

  // 2. Hard Payload Validation & Character Length Bound (1 to 500 characters)
  if (!payload || !payload.recipientAnonymousId || typeof payload.content !== 'string') {
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Invalid direct message payload format' });
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
    if (session.latitude !== undefined && session.longitude !== undefined) {
      SocketRegistry.broadcastUserTimeout(
        session.anonymousId,
        session.alias,
        spamCheck.penalty.timeoutMinutes,
        spamCheck.penalty.timeoutUntil,
        'Rapid messaging / spamming',
        session.latitude,
        session.longitude,
        session.radiusKm
      );
    }
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
      if (session.latitude !== undefined && session.longitude !== undefined) {
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
      }
      return;
    }
  } catch {
    // If AI fails, rule-based filter already protected system
  }

  // 5. Persist Direct Message and Deliver
  try {
    const result = await DirectChatService.sendMessage(
      session.anonymousId,
      payload.recipientAnonymousId,
      cleanContent,
      payload.clientMessageId
    );

    if (!result.success || !result.message) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: result.error || 'Failed to send message' });
      return;
    }

    // Echo back to sender
    socket.emit(SOCKET_EVENTS.DIRECT_MESSAGE_RECEIVED, {
      ...result.message,
      isMine: true,
    });

    // Deliver to recipient
    SocketRegistry.sendDirectMessage(payload.recipientAnonymousId, {
      ...result.message,
      isMine: false,
    });

    // Record for idempotency deduplication
    if (payload.clientMessageId) {
      await IdempotencyService.recordProcessedMessage(payload.clientMessageId, result.message);
    }
  } catch (err: any) {
    socket.emit(SOCKET_EVENTS.ERROR, { message: err.message || 'Direct message error' });
  }
}


export function handleTypingIndicator(socket: Socket, payload: TypingDirectPayload): void {
  const session = PresenceService.getSessionBySocketId(socket.id);
  if (!session) return;
  if (!payload || !payload.recipientAnonymousId) return;

  SocketRegistry.sendTypingIndicator(
    payload.recipientAnonymousId,
    session.anonymousId,
    !!payload.isTyping
  );
}
