'use client';

import React from 'react';
import { IConversation } from './types';

interface MinimalRoomListProps {
  rooms: IConversation[];
  activeChatId: string | null;
  onSelectRoom: (room: IConversation) => void;
  searchQuery?: string;
}

export const MinimalRoomList: React.FC<MinimalRoomListProps> = ({
  rooms,
  activeChatId,
  onSelectRoom,
  searchQuery = '',
}) => {
  const filtered = rooms.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.snippet.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#080B10] overflow-y-auto select-none">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-[19px] font-semibold text-[#F0F4F8] tracking-tight">
          Rooms
        </h1>
      </div>

      <div className="flex flex-col divide-y divide-[#141A24]">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#57657A]">
            No rooms found
          </div>
        ) : (
          filtered.map((room) => {
            const isSelected = activeChatId === room.id;
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => onSelectRoom(room)}
                className={`w-full px-4 py-3.5 flex items-center gap-3 text-left transition-colors ${
                  isSelected
                    ? 'bg-[#101622]'
                    : 'hover:bg-[#0C1018]'
                }`}
              >
                {/* Minimal Room Badge */}
                <div className="w-8 h-8 rounded border border-[#1C2534] bg-[#0E131A] text-xs font-mono font-medium text-[#94A3B8] flex items-center justify-center flex-shrink-0">
                  {room.badge}
                </div>

                {/* Room Info */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-baseline justify-between mb-0.5">
                    <span className="text-[14px] font-medium text-[#F0F4F8] truncate">
                      {room.name}
                    </span>
                    <span className="text-[11px] text-[#57657A] flex-shrink-0 ml-2">
                      {room.timestamp}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#8A99AD] truncate leading-tight">
                    {room.snippet}
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
