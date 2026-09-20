'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { ApiService } from '../services/api';
import { IPublicFeedMessage, IPublicNearbyUser } from '../types';
import {
  Send,
  MessageSquare,
  MoreVertical,
  Flag,
  Ban,
  Shield,
  Clock,
  Sparkles,
  Lock,
} from 'lucide-react';

interface FeedChatProps {
  onStartDirectChat: (user: IPublicNearbyUser) => void;
  onOpenReport: (userId: string, alias: string, messageId?: string) => void;
  onOpenBlock: (userId: string, alias: string) => void;
}

export const FeedChat: React.FC<FeedChatProps> = ({
  onStartDirectChat,
  onOpenReport,
  onOpenBlock,
}) => {
  const { user: currentUser } = useAuth();
  const { location } = useLocation();
  const { feedMessages, sendFeedMessage } = useSocket();
  const [initialFeed, setInitialFeed] = useState<IPublicFeedMessage[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [content, setContent] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial feed when location coordinates are ready
  useEffect(() => {
    if (location.latitude !== null && location.longitude !== null) {
      setLoadingFeed(true);
      ApiService.getNearbyFeed(location.latitude, location.longitude, location.radiusKm)
        .then((res) => {
          if (res.success && res.data) {
            setInitialFeed(res.data.messages);
          }
        })
        .catch((err) => console.error('Feed fetch error:', err))
        .finally(() => setLoadingFeed(false));
    }
  }, [location.latitude, location.longitude, location.radiusKm]);

  // Combine initial fetched messages with live received socket messages
  const allMessagesMap = new Map<string, IPublicFeedMessage>();
  const cutoff24h = Date.now() - 24 * 60 * 60 * 1000;

  // Add initial feed (within 24 hours)
  for (const m of initialFeed) {
    if (new Date(m.createdAt).getTime() >= cutoff24h) {
      allMessagesMap.set(m.id, m);
    }
  }
  // Add live socket messages (within 24 hours)
  for (const m of feedMessages) {
    if (new Date(m.createdAt).getTime() >= cutoff24h) {
      allMessagesMap.set(m.id, m);
    }
  }

  // Sort chronological (oldest to newest for chat flow) and keep latest 100 in DOM buffer
  const sortedMessages = Array.from(allMessagesMap.values())
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-100);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sortedMessages.length]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    if (!location.isAllowed || location.latitude === null || location.longitude === null) {
      alert('Please allow location first so we know which 10 KM circle to broadcast to!');
      return;
    }

    setIsSending(true);
    try {
      // 1. Send via Socket for instant spatial broadcast
      sendFeedMessage(content.trim());
      // 2. Also persist via REST API
      await ApiService.postFeedMessage(content.trim(), location.latitude, location.longitude);
      setContent('');
    } catch (err: any) {
      console.error('Failed to post message:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden h-full min-h-[500px]">
      {/* Feed Stream Header */}
      <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
        <div>
          <h1 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            Local Proximity Feed
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              Live &middot; Within {location.radiusKm} KM
            </span>
          </h1>
          <p className="text-[11px] text-slate-500">
            Messages are visible only to active anonymous users within your radius.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span>Coordinates Protected</span>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/40 dark:bg-slate-950/20">
        {!location.isAllowed ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Location Required to Access Nearby Feed
            </h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Please click &quot;Allow GPS Location&quot; or &quot;Simulate City&quot; above to see conversations within 10 km of you.
            </p>
          </div>
        ) : loadingFeed ? (
          <div className="flex items-center justify-center h-48 text-xs text-slate-400">
            Scanning 10 KM radius for messages...
          </div>
        ) : sortedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-2 text-slate-400">
            <MessageSquare className="w-10 h-10 opacity-30 text-indigo-500" />
            <p className="text-xs font-medium">No messages nearby yet.</p>
            <p className="text-[11px] text-slate-500">
              Be the first to break the ice! Say &quot;Koi online hai?&quot; below.
            </p>
          </div>
        ) : (
          sortedMessages.map((msg) => {
            const isMine = msg.senderAnonymousId === currentUser?.anonymousId;
            const isMenuOpen = activeMenuId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 group transition-all ${
                  isMine ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0"
                  style={{ backgroundColor: msg.senderAvatarColor || '#6366F1' }}
                >
                  {msg.senderAlias.substring(0, 1).toUpperCase()}
                </div>

                {/* Message Body */}
                <div className={`max-w-[85%] sm:max-w-[70%] space-y-1`}>
                  {/* Author meta */}
                  <div
                    className={`flex items-center gap-2 text-[11px] text-slate-500 ${
                      isMine ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {isMine ? 'You' : msg.senderAlias}
                    </span>
                    <span className="text-[10px] text-indigo-500/80 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.2 rounded">
                      Nearby
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Bubble */}
                  <div className="relative">
                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm transition-all ${
                        isMine
                          ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-tr-none'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-none'
                      }`}
                    >
                      {msg.content}
                    </div>

                    {/* Action buttons on hover */}
                    {!isMine && (
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-white/90 dark:bg-slate-900/90 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-0.5">
                        <button
                          onClick={() =>
                            onStartDirectChat({
                              anonymousId: msg.senderAnonymousId,
                              alias: msg.senderAlias,
                              avatarColor: msg.senderAvatarColor,
                              interests: [],
                              isOnline: true,
                              proximityTag: 'Nearby',
                            })
                          }
                          className="p-1 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded"
                          title={`Chat 1-on-1 with ${msg.senderAlias}`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() =>
                            setActiveMenuId(isMenuOpen ? null : msg.id)
                          }
                          className="p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded"
                          title="More options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Dropdown Menu */}
                    {isMenuOpen && (
                      <div className="absolute right-0 top-8 z-20 w-36 rounded-xl glass-panel shadow-xl border border-slate-200 dark:border-slate-800 p-1 bg-white dark:bg-slate-900">
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            onOpenReport(
                              msg.senderAnonymousId,
                              msg.senderAlias,
                              msg.id
                            );
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-amber-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1.5"
                        >
                          <Flag className="w-3.5 h-3.5" />
                          Report
                        </button>
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            onOpenBlock(msg.senderAnonymousId, msg.senderAlias);
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1.5"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Block User
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md flex items-center gap-2"
      >
        <input
          type="text"
          placeholder={
            location.isAllowed
              ? 'Write something to everyone within 10 km...'
              : 'Enable location to chat...'
          }
          disabled={!location.isAllowed || isSending}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={500}
          className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={!location.isAllowed || !content.trim() || isSending}
          className="px-4 sm:px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-600/25 flex items-center gap-2 transition-all active:scale-95 flex-shrink-0"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
};
