'use client';

import React from 'react';

export type NavTab = 'chats' | 'rooms' | 'settings';

interface MinimalBottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const MinimalBottomNav: React.FC<MinimalBottomNavProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <nav className="h-14 w-full bg-[#080B10] border-t border-[#1C2534] grid grid-cols-3 items-center select-none z-10">
      <button
        type="button"
        onClick={() => onTabChange('chats')}
        className={`h-full flex items-center justify-center text-sm transition-colors ${
          activeTab === 'chats'
            ? 'text-[#F0F4F8] font-semibold'
            : 'text-[#57657A] hover:text-[#94A3B8]'
        }`}
      >
        Chats
      </button>

      <button
        type="button"
        onClick={() => onTabChange('rooms')}
        className={`h-full flex items-center justify-center text-sm transition-colors ${
          activeTab === 'rooms'
            ? 'text-[#F0F4F8] font-semibold'
            : 'text-[#57657A] hover:text-[#94A3B8]'
        }`}
      >
        Rooms
      </button>

      <button
        type="button"
        onClick={() => onTabChange('settings')}
        className={`h-full flex items-center justify-center text-sm transition-colors ${
          activeTab === 'settings'
            ? 'text-[#F0F4F8] font-semibold'
            : 'text-[#57657A] hover:text-[#94A3B8]'
        }`}
      >
        Settings
      </button>
    </nav>
  );
};
