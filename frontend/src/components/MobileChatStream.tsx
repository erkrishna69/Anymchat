'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { ApiService } from '../services/api';
import { IPublicFeedMessage, IPublicNearbyUser } from '../types';
import { Plus, Smile, Send, MessageSquare, Flag, Ban, Check, Sparkles } from 'lucide-react';

interface MobileChatStreamProps {
  onStartDirectChat: (user: IPublicNearbyUser) => void;
  onOpenReport: (userId: string, alias: string, messageId?: string) => void;
  onOpenBlock: (userId: string, alias: string) => void;
  onOpenPlusMenu: () => void;
}

// Curated avatar palettes for sleek dark mode aesthetics
const AVATAR_GRADIENTS = [
  'from-slate-700 to-slate-900',
  'from-indigo-600 to-slate-900',
  'from-blue-600 to-slate-900',
  'from-purple-600 to-slate-900',
  'from-pink-600 to-slate-900',
  'from-emerald-600 to-slate-900',
  'from-teal-600 to-slate-900',
  'from-amber-600 to-slate-900',
];

// Realistic starter nearby chat messages matching screenshot
const SEED_NEARBY_MESSAGES: IPublicFeedMessage[] = [
  {
    id: 'seed-1',
    senderAnonymousId: 'seed_anon_1',
    senderAlias: 'NightFox_482',
    senderAvatarColor: '#4F46E5',
    content: 'Koi online hai?',
    createdAt: '2026-09-19T17:22:00.000Z',
    proximityTag: 'Nearby (< 10km)',
  },
  {
    id: 'seed-2',
    senderAnonymousId: 'seed_anon_2',
    senderAlias: 'Silent_739',
    senderAvatarColor: '#8B5CF6',
    content: 'haan',
    createdAt: '2026-09-19T17:22:30.000Z',
    proximityTag: 'Nearby (< 10km)',
  },
  {
    id: 'seed-3',
    senderAnonymousId: 'seed_anon_3',
    senderAlias: 'Moon_193',
    senderAvatarColor: '#06B6D4',
    content: 'Anyone from nearby college?',
    createdAt: '2026-09-19T17:23:00.000Z',
    proximityTag: 'Nearby (< 10km)',
  },
  {
    id: 'seed-4',
    senderAnonymousId: 'seed_anon_1',
    senderAlias: 'NightFox_482',
    senderAvatarColor: '#4F46E5',
    content: 'yes',
    createdAt: '2026-09-19T17:23:30.000Z',
    proximityTag: 'Nearby (< 10km)',
  },
  {
    id: 'seed-5',
    senderAnonymousId: 'seed_anon_4',
    senderAlias: 'Cherry_671',
    senderAvatarColor: '#EC4899',
    content: 'kya kar rahe ho sab?',
    createdAt: '2026-09-19T17:24:00.000Z',
    proximityTag: 'Nearby (< 10km)',
  },
  {
    id: 'seed-6',
    senderAnonymousId: 'seed_anon_5',
    senderAlias: 'Pixel_302',
    senderAvatarColor: '#10B981',
    content: 'bas bore ho raha hu 😂',
    createdAt: '2026-09-19T17:24:30.000Z',
    proximityTag: 'Nearby (< 10km)',
  },
  {
    id: 'seed-7',
    senderAnonymousId: 'seed_anon_6',
    senderAlias: 'Zen_884',
    senderAvatarColor: '#3B82F6',
    content: 'koi movie suggest karo',
    createdAt: '2026-09-19T17:25:00.000Z',
    proximityTag: 'Nearby (< 10km)',
  },
  {
    id: 'seed-8',
    senderAnonymousId: 'seed_anon_7',
    senderAlias: 'Star_219',
    senderAvatarColor: '#64748B',
    content: 'arcane dekh lo',
    createdAt: '2026-09-19T17:25:30.000Z',
    proximityTag: 'Nearby (< 10km)',
  },
  {
    id: 'seed-9',
    senderAnonymousId: 'seed_anon_4',
    senderAlias: 'Cherry_671',
    senderAvatarColor: '#EC4899',
    content: '+1',
    createdAt: '2026-09-19T17:26:00.000Z',
    proximityTag: 'Nearby (< 10km)',
  },
  {
    id: 'seed-10',
    senderAnonymousId: 'seed_anon_2',
    senderAlias: 'Silent_739',
    senderAvatarColor: '#8B5CF6',
    content: 'koi music sun raha hai kya?',
    createdAt: '2026-09-19T17:26:30.000Z',
    proximityTag: 'Nearby (< 10km)',
  },
  {
    id: 'seed-11',
    senderAnonymousId: 'seed_anon_8',
    senderAlias: 'Wave_556',
    senderAvatarColor: '#14B8A6',
    content: 'haan lo-fi',
    createdAt: '2026-09-19T17:27:00.000Z',
    proximityTag: 'Nearby (< 10km)',
  },
  {
    id: 'seed-12',
    senderAnonymousId: 'seed_anon_3',
    senderAlias: 'Moon_193',
    senderAvatarColor: '#06B6D4',
    content: 'koi sath chat karega? bored af',
    createdAt: '2026-09-19T17:27:30.000Z',
    proximityTag: 'Nearby (< 10km)',
  },
  {
    id: 'seed-13',
    senderAnonymousId: 'seed_anon_1',
    senderAlias: 'NightFox_482',
    senderAvatarColor: '#4F46E5',
    content: 'hahaha same',
    createdAt: '2026-09-19T17:28:00.000Z',
    proximityTag: 'Nearby (< 10km)',
  },
];

export const MobileChatStream: React.FC<MobileChatStreamProps> = ({
  onStartDirectChat,
  onOpenReport,
  onOpenBlock,
  onOpenPlusMenu,
}) => {
  const { user: currentUser } = useAuth();
  const { location } = useLocation();
  const { feedMessages, sendFeedMessage } = useSocket();
  const [initialFeed, setInitialFeed] = useState<IPublicFeedMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<IPublicFeedMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Common quick emojis
  const QUICK_EMOJIS = ['😂', '🔥', '👀', '✨', '👋', '💀', '💯', '🙌'];

  // Fetch backend messages when location is available
  useEffect(() => {
    if (location.latitude !== null && location.longitude !== null) {
      ApiService.getNearbyFeed(location.latitude, location.longitude, location.radiusKm)
        .then((res) => {
          if (res.success && res.data && res.data.messages.length > 0) {
            setInitialFeed(res.data.messages);
          }
        })
        .catch((err) => console.error('Error fetching feed:', err));
    }
  }, [location.latitude, location.longitude, location.radiusKm]);

  // Combine seeds + server feed + socket live messages
  const messageMap = new Map<string, IPublicFeedMessage>();
  const cutoff24h = Date.now() - 24 * 60 * 60 * 1000;

  // Add initial server messages
  for (const msg of initialFeed) {
    if (new Date(msg.createdAt).getTime() >= cutoff24h) {
      messageMap.set(msg.id, msg);
    }
  }

  // Add real-time live socket messages
  for (const msg of feedMessages) {
    if (new Date(msg.createdAt).getTime() >= cutoff24h) {
      messageMap.set(msg.id, msg);
    }
  }

  // Fallback seed messages only if feed is completely empty
  if (messageMap.size === 0) {
    for (const msg of SEED_NEARBY_MESSAGES) {
      messageMap.set(msg.id, {
        ...msg,
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      });
    }
  }

  // Sort chronological (oldest to newest for chat flow) and keep latest 100 in DOM buffer
  const sortedMessages = Array.from(messageMap.values())
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-100);

  // Auto-scroll to bottom on mount or new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sortedMessages.length]);


  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const contentToSend = inputText.trim();
    setInputText('');
    setShowEmojiPicker(false);

    // 1. Socket realtime spatial broadcast
    sendFeedMessage(contentToSend);

    // 2. Persist to backend database if coordinates are available
    if (location.latitude !== null && location.longitude !== null) {
      try {
        await ApiService.postFeedMessage(contentToSend, location.latitude, location.longitude);
      } catch (err) {
        console.error('Failed to persist feed message:', err);
      }
    }
  };

  const formatMessageTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Assign stable gradient index based on alias
  const getAvatarGradient = (alias: string) => {
    let hash = 0;
    for (let i = 0; i < alias.length; i++) {
      hash = alias.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % AVATAR_GRADIENTS.length;
    return AVATAR_GRADIENTS[idx];
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0B0E14] overflow-hidden relative">
      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto px-3.5 py-2 space-y-4">
        {sortedMessages.map((msg) => {
          const isMine = msg.senderAnonymousId === currentUser?.anonymousId;
          const gradient = getAvatarGradient(msg.senderAlias);

          return (
            <div
              key={msg.id}
              onClick={() => !isMine && setSelectedMessage(msg)}
              className="flex items-start gap-3 py-1 px-1 rounded-xl transition-colors active:bg-[#121722]/60 cursor-pointer select-text"
            >
              {/* Circular Avatar */}
              <div
                className={`w-10 h-10 rounded-full bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-semibold text-xs shadow-sm flex-shrink-0 ring-1 ring-white/10`}
                style={{
                  backgroundColor: msg.senderAvatarColor || undefined,
                }}
              >
                {msg.senderAlias.substring(0, 1).toUpperCase()}
              </div>

              {/* Message Details */}
              <div className="flex-1 min-w-0">
                {/* Username + Time */}
                <div className="flex items-baseline gap-2">
                  <span
                    className={`font-bold text-[14px] leading-tight ${
                      isMine ? 'text-indigo-400' : 'text-slate-100'
                    }`}
                  >
                    {isMine ? 'You' : msg.senderAlias}
                  </span>
                  <span suppressHydrationWarning className="text-[11px] text-slate-500 font-normal">
                    {isMounted ? formatMessageTime(msg.createdAt) : ''}
                  </span>
                </div>

                {/* Message Content */}
                <p className="text-[14px] text-slate-300 leading-snug mt-0.5 break-words">
                  {msg.content}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Quick Emoji Bar when open */}
      {showEmojiPicker && (
        <div className="mx-4 mb-2 p-2 bg-[#161B26] border border-[#232B3E] rounded-2xl flex items-center justify-between shadow-2xl animate-fade-in z-20">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                setInputText((prev) => prev + emoji);
                setShowEmojiPicker(false);
              }}
              className="text-lg p-1.5 hover:scale-125 transition-transform active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Bottom Floating/Docked Input Bar matching Screenshot */}
      <div className="p-3 bg-[#0B0E14] border-t border-[#161B26]">
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 bg-[#131822] border border-[#1F2633] rounded-2xl px-3 py-2 shadow-inner focus-within:border-slate-600 transition-colors"
        >
          {/* Plus button */}
          <button
            type="button"
            onClick={onOpenPlusMenu}
            className="p-1 text-slate-400 hover:text-white rounded-lg active:scale-95 transition-all flex-shrink-0"
            title="Options & Location"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            maxLength={500}
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none px-1"
          />

          {/* Emoji button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1 text-slate-400 hover:text-white rounded-lg active:scale-95 transition-all flex-shrink-0"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Send button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-1.5 text-slate-400 hover:text-indigo-400 disabled:opacity-30 rounded-lg active:scale-95 transition-all flex-shrink-0"
          >
            <Send className="w-4 h-4 text-slate-300" />
          </button>
        </form>
      </div>

      {/* Message Tap Quick Sheet (DM, Report, Block) */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center p-0 animate-fade-in">
          <div className="w-full max-w-md bg-[#131822] border-t border-[#232B3E] rounded-t-3xl p-5 shadow-2xl space-y-3 animate-slide-up">
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-2" />

            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: selectedMessage.senderAvatarColor || '#4F46E5' }}
              >
                {selectedMessage.senderAlias.substring(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-white text-base">
                  {selectedMessage.senderAlias}
                </div>
                <div className="text-xs text-slate-400">
                  Nearby &middot; Active in 10 km circle
                </div>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <button
                onClick={() => {
                  const target = {
                    anonymousId: selectedMessage.senderAnonymousId,
                    alias: selectedMessage.senderAlias,
                    avatarColor: selectedMessage.senderAvatarColor,
                    interests: [],
                    isOnline: true,
                    proximityTag: 'Nearby',
                  };
                  setSelectedMessage(null);
                  onStartDirectChat(target);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-semibold text-sm transition-all"
              >
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <span>Chat Privately (Anonymous DM)</span>
              </button>

              <button
                onClick={() => {
                  const id = selectedMessage.senderAnonymousId;
                  const alias = selectedMessage.senderAlias;
                  const msgId = selectedMessage.id;
                  setSelectedMessage(null);
                  onOpenReport(id, alias, msgId);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/60 text-amber-400 font-medium text-sm transition-all"
              >
                <Flag className="w-4 h-4" />
                <span>Report Message</span>
              </button>

              <button
                onClick={() => {
                  const id = selectedMessage.senderAnonymousId;
                  const alias = selectedMessage.senderAlias;
                  setSelectedMessage(null);
                  onOpenBlock(id, alias);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/60 text-rose-400 font-medium text-sm transition-all"
              >
                <Ban className="w-4 h-4" />
                <span>Block User</span>
              </button>
            </div>

            <button
              onClick={() => setSelectedMessage(null)}
              className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/50 rounded-xl"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
