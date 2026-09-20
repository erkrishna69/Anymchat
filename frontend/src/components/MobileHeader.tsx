'use client';

import React from 'react';
import { useLocation } from '../context/LocationContext';
import { useSocket } from '../context/SocketContext';
import { Users, MoreVertical, Hash } from 'lucide-react';

interface MobileHeaderProps {
  onOpenOnlineUsers: () => void;
  onOpenSettings: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  onOpenOnlineUsers,
  onOpenSettings,
}) => {
  const { location } = useLocation();
  const { totalNearbyCount } = useSocket();

  return (
    <header className="h-14 px-4 bg-[#0B0E14] border-b border-[#1A202C] flex items-center justify-between flex-shrink-0 z-30 select-none">
      {/* Left: Hashtag/Proximity Icon + Nearby Chat Title + Subtitle */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center text-slate-400">
          <Hash className="w-5 h-5 text-slate-300" strokeWidth={2.5} />
        </div>

        <div className="flex flex-col">
          <h1 className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
            Nearby Chat
          </h1>
          <span className="text-[11px] text-slate-400 font-medium leading-none mt-0.5">
            People around you • {location.radiusKm} km
          </span>
        </div>
      </div>

      {/* Right: Online Users Count & Three Dots Menu */}
      <div className="flex items-center gap-3">
        {/* Online Count Pill */}
        <button
          onClick={onOpenOnlineUsers}
          className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors py-1 px-1.5 rounded-lg active:bg-[#161B26]"
        >
          <Users className="w-4 h-4 text-slate-400" />
          <span className="font-medium text-[13px]">{totalNearbyCount} online</span>
        </button>

        {/* 3-dots Menu Button */}
        <button
          onClick={onOpenSettings}
          className="p-1 text-slate-400 hover:text-white rounded-lg active:bg-[#161B26] transition-colors"
          title="Chat Options & Profile"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
