'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { ApiService } from '../services/api';
import { IPublicNearbyUser } from '../types';
import {
  X,
  Send,
  Shield,
  MoreVertical,
  Flag,
  Ban,
  Lock,
  MessageCircle,
} from 'lucide-react';

interface DirectChatDrawerProps {
  user: IPublicNearbyUser | null;
  onClose: () => void;
  onOpenReport: (userId: string, alias: string) => void;
  onOpenBlock: (userId: string, alias: string) => void;
}

export const DirectChatDrawer: React.FC<DirectChatDrawerProps> = ({
  user,
  onClose,
  onOpenReport,
  onOpenBlock,
}) => {
  const { user: currentUser } = useAuth();
  const { directMessages, sendDirectMessage, setTyping, isPartnerTyping } = useSocket();
  const [inputContent, setInputContent] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [initialHistory, setInitialHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch past conversation history when opening drawer
  useEffect(() => {
    if (!user) return;
    setLoadingHistory(true);
    ApiService.getChatHistory(user.anonymousId)
      .then((res) => {
        if (res.success) {
          setInitialHistory(res.data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingHistory(false));
  }, [user]);

  // Combine initial history with live received direct messages
  const allMessages = [
    ...initialHistory,
    ...directMessages.filter(
      (m) =>
        (m.senderAnonymousId === user?.anonymousId &&
          m.recipientAnonymousId === currentUser?.anonymousId) ||
        (m.senderAnonymousId === currentUser?.anonymousId &&
          m.recipientAnonymousId === user?.anonymousId)
    ),
  ];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages, isPartnerTyping]);

  if (!user) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim()) return;
    sendDirectMessage(inputContent.trim());
    setInputContent('');
    setTyping(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputContent(e.target.value);
    setTyping(e.target.value.length > 0);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-md bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-slide-left transition-all">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md"
            style={{ backgroundColor: user.avatarColor || '#6366F1' }}
          >
            {user.alias.substring(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{user.alias}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <Lock className="w-3 h-3 text-emerald-500" />
              <span>1-on-1 Anonymous DM</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Menu for Safety Options */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1 w-44 rounded-xl glass-panel shadow-lg border border-slate-200 dark:border-slate-800 p-1 z-50 bg-white dark:bg-slate-900">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenReport(user.anonymousId, user.alias);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2"
                >
                  <Flag className="w-3.5 h-3.5" />
                  Report User
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenBlock(user.anonymousId, user.alias);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2"
                >
                  <Ban className="w-3.5 h-3.5" />
                  Block User
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/40">
        {loadingHistory ? (
          <div className="flex items-center justify-center h-32 text-xs text-slate-400">
            Loading private conversation...
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 space-y-2">
            <MessageCircle className="w-8 h-8 opacity-40 text-indigo-500" />
            <p className="text-xs">
              Say hello to <strong>{user.alias}</strong>! Neither of you can see each other&apos;s identity or exact coordinates.
            </p>
          </div>
        ) : (
          allMessages.map((msg, i) => {
            const isMine =
              msg.senderAnonymousId === currentUser?.anonymousId || msg.isMine;
            return (
              <div
                key={msg.id || i}
                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                    isMine
                      ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-br-none'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 rounded-bl-none'
                  }`}
                >
                  {msg.content}
                </div>
                <span suppressHydrationWarning className="text-[10px] text-slate-400 mt-1 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            );
          })
        )}

        {isPartnerTyping && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>{user.alias} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center gap-2"
      >
        <input
          type="text"
          placeholder={`Direct message ${user.alias}...`}
          value={inputContent}
          onChange={handleInputChange}
          className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!inputContent.trim()}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white shadow-md transition-all active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
