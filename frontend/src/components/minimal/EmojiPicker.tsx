'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

interface EmojiCategory {
  id: string;
  name: string;
  icon: string;
  emojis: string[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    name: 'Smileys',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊',
      '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝',
      '🤑', '🤗', '🫣', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '😏',
      '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
      '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎',
      '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '🥹', '😦',
      '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩',
      '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡',
      '👻', '👽', '👾', '🤖',
    ],
  },
  {
    id: 'gestures',
    name: 'Gestures',
    icon: '👍',
    emojis: [
      '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🫰', '🤟', '🤘', '🤙',
      '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👋', '🤚', '🖐️', '✋', '🖖',
      '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🫡',
    ],
  },
  {
    id: 'reactions',
    name: 'Reactions & Hearts',
    icon: '🔥',
    emojis: [
      '🔥', '✨', '💯', '⚡', '💥', '💫', '🌟', '💢', '❤️', '🧡', '💛', '💚',
      '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
      '💘', '💝', '👀', '👁️', '💬', '🗯️', '💭', '☕', '🍻', '🥂', '🎉', '🚀',
    ],
  },
  {
    id: 'fun',
    name: 'Fun & Games',
    icon: '🎮',
    emojis: [
      '🎮', '🕹️', '🎲', '🎧', '🎤', '🎬', '🎨', '🎯', '🎳', '🏆', '🥇', '🥈',
      '🥉', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎱', '🏓', '🥊', '🛹', '👾',
      '🃏', '🎪', '🎟️', '🎫',
    ],
  },
  {
    id: 'food',
    name: 'Food & Vibes',
    icon: '🍕',
    emojis: [
      '🍕', '🍔', '🍟', '🌭', '🍿', '🥓', '🍳', '🧇', '🥞', '🥐', '🍞', '🧀',
      '🥗', '🥪', '🌮', '🌯', '🍫', '🍬', '🍭', '🍩', '🍪', '🍰', '🧁', '🍦',
      '🍺', '🍷', '🍸', '🍹', '🧃', '🥤', '🧋', '🌙', '⭐', '☁️', '🌹', '🍀',
    ],
  },
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onSelectEmoji,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<string>('smileys');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Filtered emojis if searching
  const displayedEmojis = useMemo(() => {
    if (!searchQuery.trim()) {
      const current = EMOJI_CATEGORIES.find((c) => c.id === activeTab);
      return current ? current.emojis : EMOJI_CATEGORIES[0].emojis;
    }

    // In a flat list when searching
    const all = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
    // Simple filter
    return Array.from(new Set(all));
  }, [activeTab, searchQuery]);

  return (
    <div
      ref={pickerRef}
      className="bg-[#0E131C] border border-[#1E293B] rounded-xl shadow-2xl p-3 w-80 max-w-[92vw] z-50 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-100 select-none text-[#F0F4F8]"
    >
      {/* Search & Close Bar */}
      <div className="flex items-center gap-2 pb-1 border-b border-[#1C2534]">
        <div className="flex-1 flex items-center gap-2 bg-[#080B10] border border-[#1C2534] rounded-md px-2.5 py-1 focus-within:border-[#38BDF8]">
          <Search className="w-3.5 h-3.5 text-[#64748B]" />
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search emoji..."
            className="w-full bg-transparent text-xs text-[#F0F4F8] placeholder-[#57657A] focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[#64748B] hover:text-[#F0F4F8] p-1 rounded hover:bg-[#141C28] transition-colors cursor-pointer"
          title="Close emoji picker"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Category Pills */}
      {!searchQuery && (
        <div className="flex items-center justify-between gap-1 px-0.5">
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveTab(cat.id)}
              className={`p-1.5 rounded text-sm transition-colors cursor-pointer flex items-center justify-center ${
                activeTab === cat.id
                  ? 'bg-[#1E293B] text-white ring-1 ring-[#38BDF8]'
                  : 'hover:bg-[#141C28] text-[#8A99AD]'
              }`}
              title={cat.name}
            >
              <span>{cat.icon}</span>
            </button>
          ))}
        </div>
      )}

      {/* Emojis Grid */}
      <div className="h-56 overflow-y-auto pr-1 grid grid-cols-8 gap-1 scrollbar-thin">
        {displayedEmojis.map((emoji, idx) => (
          <button
            key={`${emoji}-${idx}`}
            type="button"
            onClick={() => onSelectEmoji(emoji)}
            className="h-8 w-8 rounded flex items-center justify-center text-lg hover:bg-[#1C2534] hover:scale-125 transition-transform duration-75 cursor-pointer"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
