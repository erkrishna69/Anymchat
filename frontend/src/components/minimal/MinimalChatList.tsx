'use client';

import React from 'react';
import { IConversation } from './types';

interface MinimalChatListProps {
  conversations: IConversation[];
  activeChatId: string | null;
  onSelectChat: (conv: IConversation) => void;
  searchQuery?: string;
}

export const MinimalChatList: React.FC<MinimalChatListProps> = ({
  conversations,
  activeChatId,
  onSelectChat,
  searchQuery = '',
}) => {
  const filtered = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.snippet.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#080B10] overflow-y-auto select-none">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-[19px] font-semibold text-[#F0F4F8] tracking-tight">
          Chats
        </h1>
      </div>

      <div className="flex flex-col divide-y divide-[#141A24]">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#57657A]">
            No conversations found
          </div>
        ) : (
          filtered.map((conv) => {
            const isSelected = activeChatId === conv.id;
            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelectChat(conv)}
                className={`w-full px-4 py-3.5 flex items-center gap-3 text-left transition-colors ${
                  isSelected
                    ? 'bg-[#101622]'
                    : 'hover:bg-[#0C1018]'
                }`}
              >
                {/* Minimal Badge [A], [B], [C] */}
                <div className="w-8 h-8 rounded border border-[#1C2534] bg-[#0E131A] text-xs font-mono font-medium text-[#94A3B8] flex items-center justify-center flex-shrink-0">
                  {conv.badge}
                </div>

                {/* Name & Snippet */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-baseline justify-between mb-0.5">
                    <span className="text-[14px] font-medium text-[#F0F4F8] truncate">
                      {conv.name}
                    </span>
                    <span className="text-[11px] text-[#57657A] flex-shrink-0 ml-2">
                      {conv.timestamp}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#8A99AD] truncate leading-tight">
                    {conv.snippet}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
