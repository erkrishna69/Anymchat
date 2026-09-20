'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useLocation } from './LocationContext';
import { IPublicFeedMessage, IPublicDirectMessage, IPublicNearbyUser } from '../types';
import { getAuthToken } from '../services/api';

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
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const BACKEND_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5050';

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

  // Connect socket with robust auto-reconnection and network listeners
  useEffect(() => {
    if (!user) return;

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
      // Immediately resend location on connection/reconnection
      if (location.latitude !== null && location.longitude !== null) {
        socket.emit('location:update', {
          latitude: location.latitude,
          longitude: location.longitude,
          radiusKm: location.radiusKm,
        });
      }
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (!navigator.onLine) {
        setConnectionStatus('offline');
      } else {
        setConnectionStatus('disconnected');
      }
    });

    socket.io.on('reconnect_attempt', () => {
      if (navigator.onLine) {
        setConnectionStatus('connecting');
      }
    });

    socket.io.on('reconnect', () => {
      setIsConnected(true);
      setConnectionStatus('connected');
    });

    socket.io.on('reconnect_error', () => {
      if (!navigator.onLine) {
        setConnectionStatus('offline');
      } else {
        setConnectionStatus('disconnected');
      }
    });

    // Handle device network online / offline transitions (e.g. WiFi -> 4G switch)
    const handleOnline = () => {
      setConnectionStatus('connecting');
      if (!socket.connected) {
        socket.connect();
      }
    };

    const handleOffline = () => {
      setConnectionStatus('offline');
      setIsConnected(false);
    };

    // Handle mobile screen unlock / tab focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !socket.connected) {
        setConnectionStatus('connecting');
        socket.connect();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    socket.on('feed:received', (message: IPublicFeedMessage) => {
      const cutoff24h = Date.now() - 24 * 60 * 60 * 1000;
      const msgTime = new Date(message.createdAt).getTime();
      if (msgTime < cutoff24h) return;

      setFeedMessages((prev) => {
        // Prevent duplicate messages & keep bounded memory window
        if (prev.some((m) => m.id === message.id)) return prev;
        const next = [message, ...prev].filter(
          (m) => new Date(m.createdAt).getTime() >= cutoff24h
        );
        return next.length > 150 ? next.slice(0, 150) : next;
      });
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
      setDirectMessages((prev) => {
        const next = [...prev, msg];
        return next.length > 100 ? next.slice(-100) : next;
      });
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

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      socket.disconnect();
    };
  }, [user]);

  // Sync location changes over socket
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

  const openDirectChat = (targetUser: IPublicNearbyUser) => {
    setActiveDirectChatUser(targetUser);
    setDirectMessages([]);
    setIsPartnerTyping(false);
  };

  const closeDirectChat = () => {
    setActiveDirectChatUser(null);
    setDirectMessages([]);
    setIsPartnerTyping(false);
  };

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
