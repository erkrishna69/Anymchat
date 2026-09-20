'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Smile, Send, AlertTriangle, X, Clock, Reply, ChevronDown } from 'lucide-react';
import { IConversation, IMessageItem } from './types';
import { MessageItem } from './MessageItem';
import { EmojiPicker } from './EmojiPicker';

interface MinimalChatViewProps {
  chat?: IConversation;
  messages: IMessageItem[];
  onSendMessage: (
    content: string,
    replyTo?: { messageId: string; senderAlias: string; content: string }
  ) => void;
  headerTitle?: string;
  onlineCount?: number;
  rightAction?: React.ReactNode;
  errorMessage?: string | null;
  onClearError?: () => void;
  isTimedOut?: boolean;
  timeoutRemainingSec?: number;
  isUserTimedOut?: (anonymousId?: string) => boolean;
  currentUserAlias?: string;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected' | 'offline';
}

export const MinimalChatView: React.FC<MinimalChatViewProps> = ({
  chat,
  messages,
  onSendMessage,
  headerTitle = 'AnymChat',
  onlineCount = 1,
  rightAction,
  errorMessage,
  onClearError,
  isTimedOut = false,
  timeoutRemainingSec = 0,
  isUserTimedOut,
  currentUserAlias,
  connectionStatus = 'connected',
}) => {
  const [inputText, setInputText] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<IMessageItem | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [newMessagesWhileScrolled, setNewMessagesWhileScrolled] = useState(0);
  const [repliesToMeWhileScrolled, setRepliesToMeWhileScrolled] = useState(0);
  const [activeReplyToast, setActiveReplyToast] = useState<{
    senderAlias: string;
    content: string;
    messageId: string;
  } | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const scrollToBottom = useCallback((smooth = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
      });
      setShowScrollBottom(false);
      setNewMessagesWhileScrolled(0);
      setRepliesToMeWhileScrolled(0);
      setActiveReplyToast(null);
    }
  }, []);

  // Smart Scroll Anchoring & Reply to Me Detection
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isAwayFromBottom = distanceFromBottom > 130;
    setShowScrollBottom(isAwayFromBottom);
    if (!isAwayFromBottom) {
      setNewMessagesWhileScrolled(0);
      setRepliesToMeWhileScrolled(0);
      setActiveReplyToast(null);
    }
  };

  // Scroll on message updates without aggressive jumping if reading history
  useEffect(() => {
    const el = scrollContainerRef.current;
    const countDiff = messages.length - prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    if (!el) {
      scrollToBottom();
      return;
    }

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const latestMessage = messages[messages.length - 1];

    // Check if the newest message is a reply to the current user
    const isNewReplyToMe = Boolean(
      latestMessage &&
        !latestMessage.isSelf &&
        latestMessage.replyTo &&
        currentUserAlias &&
        (latestMessage.replyTo.senderAlias.toLowerCase() === currentUserAlias.toLowerCase() ||
          latestMessage.replyTo.senderAlias.toLowerCase() === 'you')
    );

    if (countDiff > 0 && isNewReplyToMe) {
      setActiveReplyToast({
        senderAlias: latestMessage.senderAlias,
        content: latestMessage.content,
        messageId: latestMessage.id,
      });
    }

    // If user is already near bottom, auto-scroll smoothly
    if (distanceFromBottom < 160) {
      scrollToBottom(false);
    } else if (countDiff > 0) {
      // User is scrolled up; track new messages & replies
      setNewMessagesWhileScrolled((prev) => prev + countDiff);
      if (isNewReplyToMe) {
        setRepliesToMeWhileScrolled((prev) => prev + 1);
      }
    }
  }, [messages, currentUserAlias, scrollToBottom]);

  // Jump to quoted message on click
  const handleJumpToMessage = (targetMessageId: string) => {
    const targetElement = document.getElementById(`msg-${targetMessageId}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(targetMessageId);
      setTimeout(() => setHighlightedMessageId(null), 1600);
      setActiveReplyToast(null);
    }
  };

  const handleStartReply = (msg: IMessageItem) => {
    if (isTimedOut) return;
    setReplyingTo(msg);
    inputRef.current?.focus();
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTimedOut) return;
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const replyData = replyingTo
      ? {
          messageId: replyingTo.id,
          senderAlias: replyingTo.senderAlias,
          content: replyingTo.content,
        }
      : undefined;

    onSendMessage(trimmed, replyData);
    setInputText('');
    setReplyingTo(null);
    scrollToBottom(false);
  };

  const handleSelectEmoji = (emoji: string) => {
    if (isTimedOut) return;
    setInputText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080B10] text-[#F0F4F8] select-none relative overflow-hidden">
      {/* Top Header */}
      <header className="h-14 bg-[#080B10] border-b border-[#1C2534] px-4 md:px-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[15px] font-semibold truncate ${
                  isTimedOut ? 'text-zinc-500 opacity-60' : 'text-[#F0F4F8]'
                }`}
              >
                {chat?.name || headerTitle}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-[#57657A]">
                <span
                  className={`w-2 h-2 rounded-full inline-block ${
                    connectionStatus === 'connected'
                      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                      : connectionStatus === 'offline'
                      ? 'bg-rose-500'
                      : 'bg-amber-500 animate-pulse'
                  }`}
                />
                <span className={connectionStatus !== 'connected' ? 'text-amber-400/90 font-medium' : ''}>
                  {connectionStatus === 'connected'
                    ? `${onlineCount} online`
                    : connectionStatus === 'offline'
                    ? 'Offline'
                    : 'Connecting...'}
                </span>
              </span>
              {isTimedOut && (
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/40 animate-pulse">
                  <Clock className="w-2.5 h-2.5" />
                  <span>Timed Out ({formatTime(timeoutRemainingSec)})</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {rightAction && <div className="flex items-center gap-2">{rightAction}</div>}
      </header>

      {/* Reconnecting / Offline Top Status Strip */}
      {connectionStatus !== 'connected' && (
        <div
          className={`px-4 py-1.5 text-xs flex items-center justify-center gap-2 border-b animate-in fade-in duration-200 z-20 select-none ${
            connectionStatus === 'offline'
              ? 'bg-rose-950/90 text-rose-300 border-rose-900/50'
              : 'bg-amber-950/90 text-amber-300 border-amber-900/50'
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                connectionStatus === 'offline' ? 'bg-rose-400' : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                connectionStatus === 'offline' ? 'bg-rose-500' : 'bg-amber-500'
              }`}
            />
          </span>
          <span className="font-medium">
            {connectionStatus === 'offline'
              ? 'No internet connection · Waiting for network...'
              : 'Connecting to AnymChat server...'}
          </span>
        </div>
      )}

      {/* Floating Instant Reply Notification Banner (Top) */}
      {activeReplyToast && (
        <div className="absolute top-16 left-4 right-4 md:left-6 md:right-6 z-30 flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#091629]/95 border border-[#38BDF8]/60 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-3 duration-200">
          <div
            onClick={() => handleJumpToMessage(activeReplyToast.messageId)}
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-[#0E2744] flex items-center justify-center text-[#38BDF8] shrink-0">
              <Reply className="w-3.5 h-3.5 rotate-180 scale-y-[-1]" />
            </div>
            <div className="truncate text-xs">
              <span className="font-semibold text-[#38BDF8]">
                @{activeReplyToast.senderAlias} replied to you
              </span>
              <p className="text-[11px] text-[#94A3B8] truncate">
                {activeReplyToast.content}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleJumpToMessage(activeReplyToast.messageId)}
              className="text-xs font-semibold px-2 py-1 rounded bg-[#38BDF8]/20 hover:bg-[#38BDF8]/30 text-[#38BDF8] transition-colors cursor-pointer"
            >
              View
            </button>
            <button
              type="button"
              onClick={() => setActiveReplyToast(null)}
              className="p-1 text-[#64748B] hover:text-[#F0F4F8] rounded-md transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Messages Stream */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 md:px-6 py-4 flex flex-col space-y-3.5 relative"
      >
        {messages.length === 0 ? (
          <div className="my-auto text-center text-xs text-[#57657A]">
            No messages yet. Say hello to start the chat!
          </div>
        ) : (
          messages.map((msg, index) => {
            const isSenderTimedOut =
              (msg.isSelf && isTimedOut) ||
              (!!msg.senderId && (isUserTimedOut?.(msg.senderId) ?? false));

            return (
              <MessageItem
                key={msg.id || index}
                message={msg}
                currentUserAlias={currentUserAlias}
                isSenderTimedOut={isSenderTimedOut}
                onReply={handleStartReply}
                onJumpToMessage={handleJumpToMessage}
                isHighlighted={highlightedMessageId === msg.id}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating "Jump to Latest" Button with Unread & Reply Badge */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          className={`absolute bottom-24 right-6 md:right-8 z-30 flex items-center gap-1.5 px-3 py-2 rounded-full shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer animate-in fade-in slide-in-from-bottom-3 ${
            repliesToMeWhileScrolled > 0
              ? 'bg-[#0E2744]/95 border border-[#38BDF8] text-[#38BDF8] ring-2 ring-[#38BDF8]/40 animate-pulse'
              : 'bg-[#10192A]/90 hover:bg-[#162238] border border-[#38BDF8]/40 text-[#F0F4F8]'
          }`}
          title="Jump to latest messages"
        >
          {repliesToMeWhileScrolled > 0 ? (
            <>
              <Reply className="w-3.5 h-3.5 rotate-180 scale-y-[-1] text-[#38BDF8]" />
              <span className="text-xs font-bold text-[#38BDF8]">
                {repliesToMeWhileScrolled} reply to you!
              </span>
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 text-[#38BDF8] animate-bounce" />
              {newMessagesWhileScrolled > 0 ? (
                <span className="text-xs font-semibold text-[#38BDF8]">
                  {newMessagesWhileScrolled} new
                </span>
              ) : (
                <span className="text-xs font-medium text-[#94A3B8]">Latest</span>
              )}
            </>
          )}
        </button>
      )}

      {/* Bottom Input Area */}
      <div className="relative p-4 md:px-6 bg-[#080B10] shrink-0">
        {/* Active Reply Banner (Above Input Pill) */}
        {replyingTo && !isTimedOut && (
          <div className="mb-2 px-3.5 py-2 rounded-xl bg-[#0F1726] border border-[#233550] flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-150 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <Reply className="w-4 h-4 text-[#38BDF8] shrink-0" />
              <div className="truncate text-xs">
                <span className="font-semibold text-[#38BDF8]">
                  Replying to @{replyingTo.senderAlias}
                </span>
                <p className="text-[11px] text-[#94A3B8] truncate mt-0.5">
                  {replyingTo.content}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancelReply}
              className="p-1 text-[#94A3B8] hover:text-[#F0F4F8] rounded-md transition-colors cursor-pointer shrink-0 ml-2"
              title="Cancel reply"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Orbit AI Error / Live Timeout Countdown Banner */}
        {isTimedOut && timeoutRemainingSec > 0 ? (
          <div className="mb-2.5 px-3.5 py-2.5 rounded-xl bg-[#241A0A] border border-[#5A3E12] text-xs text-amber-300 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 shadow-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <div className="truncate">
                <span className="font-semibold text-amber-200">Orbit AI Timeout Active</span>
                <p className="text-[11px] text-amber-300/80 truncate">
                  {errorMessage || 'You are temporarily timed out from sending messages.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 pl-2">
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-[#3A2A0F] text-amber-300 border border-[#785318]">
                ⏳ {formatTime(timeoutRemainingSec)}
              </span>
            </div>
          </div>
        ) : errorMessage ? (
          <div className="mb-2.5 px-3.5 py-2.5 rounded-xl bg-[#241A0A] border border-[#5A3E12] text-xs text-amber-300 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 shadow-xl">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-medium leading-tight">{errorMessage}</span>
            </div>
            {onClearError && (
              <button
                type="button"
                onClick={onClearError}
                className="p-1 text-amber-400 hover:text-white rounded-md transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : null}

        {/* Emoji Picker Popover */}
        {isEmojiPickerOpen && (
          <div className="absolute bottom-20 right-4 md:right-8 z-50">
            <EmojiPicker
              onSelectEmoji={handleSelectEmoji}
              onClose={() => setIsEmojiPickerOpen(false)}
            />
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className={`bg-[#121722] border rounded-full px-4 py-2.5 flex items-center gap-3 transition-all shadow-lg ${
            isTimedOut
              ? 'border-amber-900/40 opacity-60 bg-[#14120B]'
              : 'border-[#1E293B] hover:border-[#2E3C52] focus-within:border-[#38BDF8]'
          }`}
        >
          {/* Plus action button */}
          <button
            type="button"
            disabled={isTimedOut}
            className="text-[#94A3B8] hover:text-[#F0F4F8] disabled:opacity-30 p-0.5 transition-colors cursor-pointer"
            title="Attach or options"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            disabled={isTimedOut}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isTimedOut
                ? `Timed out by Orbit AI (${formatTime(timeoutRemainingSec)} remaining)...`
                : replyingTo
                ? `Replying to @${replyingTo.senderAlias}...`
                : 'Type a message (Swipe message to reply)...'
            }
            className="flex-1 bg-transparent text-[14px] text-[#F0F4F8] placeholder-[#64748B] focus:outline-none disabled:cursor-not-allowed"
          />

          {/* Emoji button */}
          <button
            type="button"
            disabled={isTimedOut}
            onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
            className={`p-0.5 transition-colors cursor-pointer disabled:opacity-30 ${
              isEmojiPickerOpen
                ? 'text-[#38BDF8]'
                : 'text-[#94A3B8] hover:text-[#F0F4F8]'
            }`}
            title="Choose emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Send button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isTimedOut}
            className="text-[#818CF8] hover:text-[#A5B4FC] disabled:opacity-30 p-1 transition-colors cursor-pointer"
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
