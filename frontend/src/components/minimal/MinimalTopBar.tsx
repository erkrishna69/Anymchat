'use client';

import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

interface MinimalTopBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  appName?: string;
  onLogout?: () => void;
}

export const MinimalTopBar: React.FC<MinimalTopBarProps> = ({
  searchQuery,
  onSearchChange,
  appName = 'ANYMCHAT',
  onLogout,
}) => {
  const [isSearching, setIsSearching] = useState(false);

  return (
    <header className="h-14 w-full bg-[#080B10] border-b border-[#1C2534] px-4 flex items-center justify-between select-none z-10">
      {isSearching ? (
        <div className="flex items-center w-full gap-2">
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="flex-1 bg-[#0E131C] border border-[#1C2534] text-[#F0F4F8] text-sm px-3 py-1.5 rounded focus:outline-none focus:border-[#2E3C52] placeholder-[#57657A]"
          />
          <button
            type="button"
            onClick={() => {
              setIsSearching(false);
              onSearchChange('');
            }}
            className="text-xs text-[#94A3B8] hover:text-[#F0F4F8] px-2 py-1"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-wider uppercase text-[#F0F4F8]">
              {appName}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsSearching(true)}
              className="flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#F0F4F8] px-2 py-1 rounded hover:bg-[#0E131C] transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="text-xs text-[#8A99AD] hover:text-rose-400 px-2 py-1 rounded hover:bg-[#141C28] transition-colors"
                title="Log out"
              >
                Log out
              </button>
            )}
          </div>
        </>
      )}
    </header>
  );
};
