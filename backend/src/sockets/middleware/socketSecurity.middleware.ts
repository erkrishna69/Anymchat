import { Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../../constants/events/socketEvents.constants';

// In-memory buckets for socket connections and events
const connectionTimestamps = new Map<string, number[]>(); // IP -> timestamps
const socketEventTimestamps = new Map<string, number[]>(); // socketId -> timestamps

// Periodic cleanup of stale socket data every 3 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of connectionTimestamps.entries()) {
    const recent = list.filter((t) => now - t < 60 * 1000);
    if (recent.length === 0) connectionTimestamps.delete(ip);
    else connectionTimestamps.set(ip, recent);
  }
  for (const [socketId, list] of socketEventTimestamps.entries()) {
    const recent = list.filter((t) => now - t < 10 * 1000);
    if (recent.length === 0) socketEventTimestamps.delete(socketId);
    else socketEventTimestamps.set(socketId, recent);
  }
}, 3 * 60 * 1000).unref?.();

export function getSocketIp(socket: Socket): string {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return socket.handshake.address || socket.conn.remoteAddress || 'unknown_ip';
}

/**
 * Validates connection handshake rate (Max 25 connection handshakes / min per IP)
 */
export function checkSocketConnectionRate(socket: Socket): boolean {
  const ip = getSocketIp(socket);
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxHandshakes = 25;

  const timestamps = connectionTimestamps.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < windowMs);

  if (recent.length >= maxHandshakes) {
    return false;
  }

  recent.push(now);
  connectionTimestamps.set(ip, recent);
  return true;
}

/**
 * Socket Event Rate Limiter (Max 15 events per second per socket)
 */
export function checkSocketEventRate(socket: Socket): boolean {
  const now = Date.now();
  const windowMs = 1000; // 1 second
  const maxEventsPerSec = 15;

  const timestamps = socketEventTimestamps.get(socket.id) || [];
  const recent = timestamps.filter((t) => now - t < windowMs);

  if (recent.length >= maxEventsPerSec) {
    socket.emit(SOCKET_EVENTS.ERROR, {
      message: 'Event flood detected. Please slow down.',
      isFlood: true,
    });
    return false;
  }

  recent.push(now);
  socketEventTimestamps.set(socket.id, recent);
  return true;
}

/**
 * Payload size guard: Rejects any payload larger than maxBytes (default 4KB)
 */
export function validatePayloadSize(payload: any, maxBytes: number = 4096): boolean {
  if (!payload) return true;
  try {
    const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return Buffer.byteLength(str, 'utf8') <= maxBytes;
  } catch {
    return false;
  }
}

export function cleanupSocketSecurity(socketId: string): void {
  socketEventTimestamps.delete(socketId);
}
