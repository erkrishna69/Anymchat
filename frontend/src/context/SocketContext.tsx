'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useLocation } from './LocationContext';
import { IPublicFeedMessage, IPublicDirectMessage, IPublicNearbyUser } from '../types';
import { getAuthToken, ApiService } from '../services/api';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'offline';

interface SocketContextType {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  feedMessages: IPublicFeedMessage[];
  nearbyUsers: IPublicNearbyUser[];
  totalNearbyCount: number;
  activeDirectChatUser: IPublicNearbyUser | null;
  directMessages: IPublicDirectMessage[];
  isPartnerTyping: boolean;
  isDirectLoading: boolean;
  socketError: string | null;
  isTimedOut: boolean;
  timeoutRemainingSec: number;
  timedOutUsers: Record<string, { timeoutUntil: number; alias: string }>;
  isUserTimedOut: (anonymousId?: string) => boolean;
  clearSocketError: () => void;
  sendFeedMessage: (
    content: string,
    replyTo?: { messageId: string; senderAlias: string; content: string }
  ) => void;
  openDirectChat: (user: IPublicNearbyUser) => void;
  closeDirectChat: () => void;
  sendDirectMessage: (content: string) => void;
  setTyping: (isTyping: boolean) => void;
  removeMessageFromView: (messageId: string) => void;
  removeUserFromNearby: (anonymousId: string) => void;
  refreshFeed: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const BACKEND_URL = process.env.NEXT_PUBLIC_SOCKET_URL;
const FEED_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_FEED_MESSAGES = 200;
const MAX_DIRECT_MESSAGES = 150;

/**
 * Deterministically merges and sorts feed messages by createdAt timestamp (newest first).
 * Enforces strict deduplication by message ID and 24-Hour Ephemeral Retention.
 */
function mergeFeedMessages(
  existing: IPublicFeedMessage[],
  incoming: IPublicFeedMessage[]
): IPublicFeedMessage[] {
  const cutoff24h = Date.now() - FEED_TTL_MS;
  const messageMap = new Map<string, IPublicFeedMessage>();

  const processMessage = (m: IPublicFeedMessage) => {
    if (!m || !m.id) return;
    const createdAtIso = m.createdAt || new Date().toISOString();
    const parsedTime = new Date(createdAtIso).getTime();
    const validTime = isNaN(parsedTime) ? Date.now() : parsedTime;

    if (validTime >= cutoff24h) {
      messageMap.set(m.id, {
        ...m,
        createdAt: isNaN(parsedTime) ? new Date(validTime).toISOString() : m.createdAt,
      });
    }
  };

  for (const m of existing) processMessage(m);
  for (const m of incoming) processMessage(m);

  // Sort descending: newest at index 0
  const sorted = Array.from(messageMap.values()).sort((a, b) => {
    const tA = new Date(a.createdAt || 0).getTime() || 0;
    const tB = new Date(b.createdAt || 0).getTime() || 0;
    return tB - tA;
  });

  return sorted.length > MAX_FEED_MESSAGES ? sorted.slice(0, MAX_FEED_MESSAGES) : sorted;
}

/**
 * Deterministically merges direct chat messages by createdAt timestamp (oldest first).
 */
function mergeDirectMessages(
  existing: IPublicDirectMessage[],
  incoming: IPublicDirectMessage[]
): IPublicDirectMessage[] {
  const cutoff24h = Date.now() - FEED_TTL_MS;
  const messageMap = new Map<string, IPublicDirectMessage>();

  const processMessage = (m: IPublicDirectMessage) => {
    if (!m || !m.id) return;
    const createdAtIso = m.createdAt || new Date().toISOString();
    const parsedTime = new Date(createdAtIso).getTime();
    const validTime = isNaN(parsedTime) ? Date.now() : parsedTime;

    if (validTime >= cutoff24h) {
      messageMap.set(m.id, {
        ...m,
        createdAt: isNaN(parsedTime) ? new Date(validTime).toISOString() : m.createdAt,
      });
    }
  };

  for (const m of existing) processMessage(m);
  for (const m of incoming) processMessage(m);

  // Sort ascending: oldest to newest
  const sorted = Array.from(messageMap.values()).sort((a, b) => {
    const tA = new Date(a.createdAt || 0).getTime() || 0;
    const tB = new Date(b.createdAt || 0).getTime() || 0;
    return tA - tB;
  });

  return sorted.length > MAX_DIRECT_MESSAGES ? sorted.slice(-MAX_DIRECT_MESSAGES) : sorted;
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { location } = useLocation();

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [feedMessages, setFeedMessages] = useState<IPublicFeedMessage[]>([]);
  const [nearbyUsers, setNearbyUsers] = useState<IPublicNearbyUser[]>([]);
  const [totalNearbyCount, setTotalNearbyCount] = useState(0);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [isTimedOut, setIsTimedOut] = useState<boolean>(false);
  const [timeoutEndsAt, setTimeoutEndsAt] = useState<number | null>(null);
  const [timeoutRemainingSec, setTimeoutRemainingSec] = useState<number>(0);
  const [timedOutUsers, setTimedOutUsers] = useState<Record<string, { timeoutUntil: number; alias: string }>>({});

  // Direct chat state
  const [activeDirectChatUser, setActiveDirectChatUser] = useState<IPublicNearbyUser | null>(null);
  const [directMessages, setDirectMessages] = useState<IPublicDirectMessage[]>([]);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [isDirectLoading, setIsDirectLoading] = useState(false);

  // Anti-race sequence tracking
  const feedFetchSeqRef = useRef<number>(0);
  const directChatSeqRef = useRef<number>(0);
  const activeUserRef = useRef<IPublicNearbyUser | null>(null);
  activeUserRef.current = activeDirectChatUser;

  // Full clean-up on user logout to prevent cross-account state leakage
  useEffect(() => {
    if (!user) {
      setFeedMessages([]);
      setNearbyUsers([]);
      setTotalNearbyCount(0);
      setActiveDirectChatUser(null);
      setDirectMessages([]);
      setTimedOutUsers({});
      setIsTimedOut(false);
      setSocketError(null);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    }
  }, [user]);

  // Countdown timer for active timeout & pruning expired timedOutUsers
  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      if (timeoutEndsAt) {
        const diff = Math.max(0, Math.ceil((timeoutEndsAt - now) / 1000));
        setTimeoutRemainingSec(diff);
        if (diff <= 0) {
          setTimeoutEndsAt(null);
          setIsTimedOut(false);
          setSocketError(null);
        }
      } else {
        setTimeoutRemainingSec(0);
        setIsTimedOut(false);
      }

      // Prune expired entries from timedOutUsers
      setTimedOutUsers((prev) => {
        let changed = false;
        const next: Record<string, { timeoutUntil: number; alias: string }> = {};
        for (const [id, data] of Object.entries(prev)) {
          if (data.timeoutUntil > now) {
            next[id] = data;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [timeoutEndsAt]);

  // Feed sync helper with anti-race sequence guard
  const syncNearbyFeed = useCallback(async (lat: number, lng: number, rad: number) => {
    const seq = ++feedFetchSeqRef.current;
    try {
      const res = await ApiService.getNearbyFeed(lat, lng, rad);
      if (seq === feedFetchSeqRef.current && res && res.data && Array.isArray(res.data.messages)) {
        setFeedMessages((prev) => mergeFeedMessages(prev, res.data.messages));
      }
    } catch (err) {
      console.warn('Feed sync error:', err);
    }
  }, []);

  const refreshFeed = useCallback(async () => {
    if (location.latitude !== null && location.longitude !== null) {
      await syncNearbyFeed(location.latitude, location.longitude, location.radiusKm);
    }
  }, [location.latitude, location.longitude, location.radiusKm, syncNearbyFeed]);

  // Keep stable refs to avoid re-triggering socket connection effect
  const locationRef = useRef(location);
  locationRef.current = location;
  const syncNearbyFeedRef = useRef(syncNearbyFeed);
  syncNearbyFeedRef.current = syncNearbyFeed;

  // Connect socket with robust auto-reconnection and network listeners
  useEffect(() => {
    if (!user?.anonymousId) return;

    const token = getAuthToken();
    const socket = io(BACKEND_URL, {
      auth: { token },
      query: { alias: user.alias, avatarColor: user.avatarColor },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
      reconnectionDelayMax: 3500,
      randomizationFactor: 0.3,
      timeout: 10000,
    });

    socketRef.current = socket;
    setConnectionStatus(navigator.onLine ? 'connecting' : 'offline');

    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionStatus('connected');

      // Immediately sync location on connection/reconnection
      const loc = locationRef.current;
      if (loc.latitude !== null && loc.longitude !== null) {
        socket.emit('location:update', {
          latitude: loc.latitude,
          longitude: loc.longitude,
          radiusKm: loc.radiusKm,
        });
        syncNearbyFeedRef.current(loc.latitude, loc.longitude, loc.radiusKm);
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setConnectionStatus(navigator.onLine ? 'disconnected' : 'offline');
    });

    socket.io.on('reconnect', () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      const loc = locationRef.current;
      if (loc.latitude !== null && loc.longitude !== null) {
        socket.emit('location:update', {
          latitude: loc.latitude,
          longitude: loc.longitude,
          radiusKm: loc.radiusKm,
        });
        syncNearbyFeedRef.current(loc.latitude, loc.longitude, loc.radiusKm);
      }
      // Re-sync direct chat if currently viewing one
      if (activeUserRef.current) {
        ApiService.getChatHistory(activeUserRef.current.anonymousId)
          .then((res) => {
            if (res && res.data && Array.isArray(res.data)) {
              setDirectMessages((prev) => mergeDirectMessages(prev, res.data));
            }
          })
          .catch(() => {});
      }
    });

    // Realtime incoming feed message
    socket.on('feed:received', (message: IPublicFeedMessage) => {
      setFeedMessages((prev) => mergeFeedMessages(prev, [message]));
    });

    // Bulk feed history received over socket
    socket.on('feed:history', (data: { messages: IPublicFeedMessage[] }) => {
      if (data && Array.isArray(data.messages)) {
        setFeedMessages((prev) => mergeFeedMessages(prev, data.messages));
      }
    });

    socket.on('nearby:users', (data: { totalNearby: number; users: IPublicNearbyUser[] }) => {
      setTotalNearbyCount(data.totalNearby);
      setNearbyUsers(data.users || []);
      if (data.users && data.users.length > 0) {
        setTimedOutUsers((prev) => {
          const next = { ...prev };
          for (const u of data.users) {
            if (u.isTimedOut && u.timeoutUntil && u.timeoutUntil > Date.now()) {
              next[u.anonymousId] = { timeoutUntil: u.timeoutUntil, alias: u.alias };
            }
          }
          return next;
        });
      }
    });

    socket.on('direct:received', (msg: IPublicDirectMessage) => {
      // Only append if the message belongs to the current conversation
      if (
        activeUserRef.current &&
        (msg.senderAnonymousId === activeUserRef.current.anonymousId ||
          msg.recipientAnonymousId === activeUserRef.current.anonymousId)
      ) {
        setDirectMessages((prev) => mergeDirectMessages(prev, [msg]));
      }
    });

    socket.on('orbit:user_timeout', (data: { anonymousId: string; alias: string; timeoutMinutes: number; timeoutUntil: number; reason?: string }) => {
      setTimedOutUsers((prev) => ({
        ...prev,
        [data.anonymousId]: {
          timeoutUntil: data.timeoutUntil,
          alias: data.alias,
        },
      }));

      if (user && data.anonymousId === user.anonymousId) {
        setIsTimedOut(true);
        setTimeoutEndsAt(data.timeoutUntil);
        setSocketError(`🛡️ [Orbit AI] You are timed out for ${data.timeoutMinutes} minutes.`);
      }
    });

    const handleIncomingError = (err: any) => {
      const errMsg = typeof err === 'string' ? err : err?.message || 'Action rejected';
      setSocketError(errMsg);
      if (err?.isTimedOut) {
        setIsTimedOut(true);
        const seconds = err.remainingSeconds || (err.timeoutMinutes ? err.timeoutMinutes * 60 : 300);
        setTimeoutEndsAt(Date.now() + seconds * 1000);
      }
    };

    socket.on('socket:error', handleIncomingError);
    socket.on('error', handleIncomingError);

    // Network listeners
    const handleOnline = () => {
      setConnectionStatus('connecting');
      if (!socket.connected) socket.connect();
    };

    const handleOffline = () => {
      setConnectionStatus('offline');
      setIsConnected(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !socket.connected) {
        setConnectionStatus('connecting');
        socket.connect();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      socket.disconnect();
    };
  }, [user?.anonymousId]);

  // Initial feed sync whenever location is ready/changed
  useEffect(() => {
    if (!user || location.latitude === null || location.longitude === null) return;
    syncNearbyFeed(location.latitude, location.longitude, location.radiusKm);
  }, [user, location.latitude, location.longitude, location.radiusKm, syncNearbyFeed]);

  // Sync location changes over active socket
  useEffect(() => {
    if (socketRef.current && socketRef.current.connected) {
      if (location.latitude !== null && location.longitude !== null) {
        socketRef.current.emit('location:update', {
          latitude: location.latitude,
          longitude: location.longitude,
          radiusKm: location.radiusKm,
        });
      }
    }
  }, [location.latitude, location.longitude, location.radiusKm]);

  const clearSocketError = () => {
    setSocketError(null);
  };

  const sendFeedMessage = (
    content: string,
    replyTo?: { messageId: string; senderAlias: string; content: string }
  ) => {
    if (!socketRef.current || !socketRef.current.connected) return;
    setSocketError(null);
    socketRef.current.emit('feed:send', { content, replyTo });
  };

  const openDirectChat = useCallback((targetUser: IPublicNearbyUser) => {
    const seq = ++directChatSeqRef.current;
    setActiveDirectChatUser(targetUser);
    setDirectMessages([]);
    setIsPartnerTyping(false);
    setIsDirectLoading(true);

    ApiService.getChatHistory(targetUser.anonymousId)
      .then((res) => {
        // Only update state if user is still on this conversation
        if (seq === directChatSeqRef.current && res && res.data && Array.isArray(res.data)) {
          setDirectMessages(res.data);
        }
      })
      .catch((err) => {
        console.warn('Direct chat history fetch error:', err);
      })
      .finally(() => {
        if (seq === directChatSeqRef.current) {
          setIsDirectLoading(false);
        }
      });
  }, []);

  const closeDirectChat = useCallback(() => {
    directChatSeqRef.current++;
    setActiveDirectChatUser(null);
    setDirectMessages([]);
    setIsPartnerTyping(false);
    setIsDirectLoading(false);
  }, []);

  const sendDirectMessage = (content: string) => {
    if (!socketRef.current || !activeDirectChatUser) return;
    socketRef.current.emit('direct:send', {
      recipientAnonymousId: activeDirectChatUser.anonymousId,
      content,
    });
  };

  const setTyping = (isTyping: boolean) => {
    if (!socketRef.current || !activeDirectChatUser) return;
    socketRef.current.emit('direct:typing', {
      recipientAnonymousId: activeDirectChatUser.anonymousId,
      isTyping,
    });
  };

  const removeMessageFromView = (messageId: string) => {
    setFeedMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  const removeUserFromNearby = (anonymousId: string) => {
    setNearbyUsers((prev) => prev.filter((u) => u.anonymousId !== anonymousId));
    setFeedMessages((prev) => prev.filter((m) => m.senderAnonymousId !== anonymousId));
    if (activeDirectChatUser?.anonymousId === anonymousId) {
      closeDirectChat();
    }
  };

  const isUserTimedOut = (anonymousId?: string): boolean => {
    if (!anonymousId) return false;
    if (user && anonymousId === user.anonymousId) return isTimedOut;
    const entry = timedOutUsers[anonymousId];
    return !!(entry && entry.timeoutUntil > Date.now());
  };

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        connectionStatus,
        feedMessages,
        nearbyUsers,
        totalNearbyCount,
        activeDirectChatUser,
        directMessages,
        isPartnerTyping,
        isDirectLoading,
        socketError,
        isTimedOut,
        timeoutRemainingSec,
        timedOutUsers,
        isUserTimedOut,
        clearSocketError,
        sendFeedMessage,
        openDirectChat,
        closeDirectChat,
        sendDirectMessage,
        setTyping,
        removeMessageFromView,
        removeUserFromNearby,
        refreshFeed,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
