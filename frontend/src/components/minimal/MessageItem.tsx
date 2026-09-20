'use client';

import React, { useState, useRef } from 'react';
import { Reply, CornerDownRight } from 'lucide-react';
import { IMessageItem } from './types';
import { getAvatarUrl, resolveGender, getGenderStyles } from '../../lib/avatarMapping';

interface MessageItemProps {
  message: IMessageItem;
  isTimedOut?: boolean;
  isSenderTimedOut?: boolean;
  currentUserAlias?: string;
  onReply: (msg: IMessageItem) => void;
  onJumpToMessage?: (messageId: string) => void;
  isHighlighted?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isSenderTimedOut = false,
  currentUserAlias,
  onReply,
  onJumpToMessage,
  isHighlighted = false,
}) => {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const avatarSrc = getAvatarUrl(
    message.senderAlias,
    message.avatarId,
    message.avatarUrl
  );
  const gender = resolveGender(message.senderAlias, message.senderGender);
  const genderStyles = getGenderStyles(gender);

  const isReplyToMe = Boolean(
    !message.isSelf &&
      message.replyTo &&
      currentUserAlias &&
      message.replyTo.senderAlias &&
      (message.replyTo.senderAlias.toLowerCase() === currentUserAlias.toLowerCase() ||
        message.replyTo.senderAlias.toLowerCase() === 'you')
  );

  // Touch Swipe to Reply Gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - touchStartRef.current.x;
    const diffY = touch.clientY - touchStartRef.current.y;

    // Only swipe horizontally to the right
    if (Math.abs(diffX) > Math.abs(diffY) && diffX > 0) {
      // Elastic resistance
      const clamped = Math.min(65, diffX * 0.55);
      setDragOffset(clamped);
    }
  };

  const handleTouchEnd = () => {
    if (dragOffset >= 42) {
      onReply(message);
    }
    setDragOffset(0);
    setIsDragging(false);
    touchStartRef.current = null;
  };

  return (
    <div
      id={`msg-${message.id}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={() => onReply(message)}
      className={`relative group -mx-2 px-2.5 py-2 rounded-xl transition-all duration-200 select-none ${
        isHighlighted
          ? 'bg-[#14233D] ring-2 ring-[#38BDF8] shadow-lg'
          : isReplyToMe
          ? 'bg-[#0B182B]/90 border-l-2 border-[#38BDF8] ring-1 ring-[#38BDF8]/30 shadow-md'
          : genderStyles.hoverBg
      }`}
    >
      {/* Background Swipe Reveal Icon (Cyan Reply Arrow) */}
      {dragOffset > 0 && (
        <div
          className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-[#0D2238] border border-[#38BDF8]/50 text-[#38BDF8] pointer-events-none transition-opacity"
          style={{
            opacity: Math.min(1, dragOffset / 35),
            transform: `translateY(-50%) scale(${Math.min(1.15, 0.6 + dragOffset / 50)})`,
          }}
        >
          <Reply className="w-4 h-4" />
        </div>
      )}

      {/* Main Message Content Card (Slidable on Touch) */}
      <div
        className="flex items-start gap-3.5 relative"
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)',
          willChange: 'transform',
        }}
      >
        {/* Round Avatar with Gender Ring */}
        <img
          src={avatarSrc}
          alt={message.senderAlias || 'Avatar'}
          className={`w-10 h-10 rounded-full object-cover shrink-0 select-none ${genderStyles.avatarBorder}`}
        />

        {/* Sender Header & Message Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          {/* Quoted Reply Block (if this message is replying to another message) */}
          {message.replyTo && (
            <div
              onClick={() => message.replyTo?.messageId && onJumpToMessage?.(message.replyTo.messageId)}
              className={`mb-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-l-2 text-[11px] transition-colors cursor-pointer group/quote max-w-md truncate shadow-sm ${
                isReplyToMe
                  ? 'bg-[#0E2038] border-[#38BDF8] text-[#93C5FD] hover:bg-[#132A4A]'
                  : 'bg-[#0E1522]/90 border-[#38BDF8] text-[#94A3B8] hover:text-[#F0F4F8] hover:bg-[#131E30]'
              }`}
              title="Click to jump to original message"
            >
              <CornerDownRight className="w-3 h-3 text-[#38BDF8] shrink-0" />
              <span className="font-bold text-[#38BDF8] truncate">
                {isReplyToMe ? 'Replying to You' : `@${message.replyTo.senderAlias || 'Anonymous'}`}
              </span>
              <span className="text-[#64748B] truncate">
                {message.replyTo.content || ''}
              </span>
            </div>
          )}

          {/* Sender metadata header */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span
              className={`text-[14px] font-semibold transition-colors ${
                isSenderTimedOut ? 'text-zinc-500 opacity-60' : genderStyles.nameColor
              }`}
            >
              {message.isSelf ? 'You' : message.senderAlias || 'Anonymous'}
            </span>

            {/* Replied to You Badge */}
            {isReplyToMe && (
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/40 flex items-center gap-1 select-none shadow-sm">
                <Reply className="w-2.5 h-2.5 rotate-180 scale-y-[-1]" />
                <span>Replied to you</span>
              </span>
            )}

            {/* Timed Out badge */}
            {isSenderTimedOut && (
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-400 border border-amber-800/40 select-none">
                Timed Out
              </span>
            )}

            {/* Timestamp */}
            <span className="text-[11px] text-[#64748B] font-mono">
              {message.timestamp || 'Just now'}
            </span>

            {/* Gender tags */}
            {gender === 'male' && (
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-sky-950/60 text-sky-400 border border-sky-800/40 select-none">
                M
              </span>
            )}
            {gender === 'female' && (
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-pink-950/60 text-pink-400 border border-pink-800/40 select-none">
                F
              </span>
            )}
          </div>

          {/* Message Content in crisp colored typography */}
          <div
            className={`text-[14px] leading-snug mt-0.5 break-words select-text ${genderStyles.textColor}`}
          >
            {message.content}
          </div>
        </div>

        {/* Desktop Floating Action Bar on Hover */}
        <div className="absolute right-0 top-0 hidden md:group-hover:flex items-center gap-1 bg-[#101622]/95 border border-[#1E293B] px-1.5 py-0.5 rounded-lg shadow-xl backdrop-blur-sm -translate-y-2 animate-in fade-in zoom-in-95 duration-150">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReply(message);
            }}
            className="flex items-center gap-1 text-[11px] text-[#94A3B8] hover:text-[#38BDF8] px-1.5 py-1 rounded hover:bg-[#1A2333] transition-colors cursor-pointer"
            title="Reply (or double-click message)"
          >
            <Reply className="w-3.5 h-3.5" />
            <span>Reply</span>
          </button>
        </div>
      </div>
    </div>
  );
};
