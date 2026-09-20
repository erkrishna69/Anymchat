'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLocation } from '../context/LocationContext';
import { useSocket } from '../context/SocketContext';
import {
  Radio,
  Moon,
  Sun,
  Shuffle,
  MapPin,
  Wifi,
  WifiOff,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  onOpenMockLocation: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMockLocation }) => {
  const { user, changeAlias } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { location } = useLocation();
  const { isConnected, totalNearbyCount } = useSocket();
  const [isChangingAlias, setIsChangingAlias] = useState(false);

  const handleRandomizeAlias = async () => {
    setIsChangingAlias(true);
    await changeAlias();
    setIsChangingAlias(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b px-4 py-3 sm:px-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand Logo & Proximity Tag */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white shadow-lg shadow-indigo-500/25">
            <Radio className="w-5 h-5 animate-pulse" />
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                AnymChat
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                10 KM Radius
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </span>
              <span>
                {location.isAllowed
                  ? `${totalNearbyCount} online nearby`
                  : 'Location required'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Section: Location Selector, User Alias, Theme Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Location status / tester button */}
          <button
            onClick={onOpenMockLocation}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-700 dark:text-slate-300"
            title="Configure or test coordinates"
          >
            <MapPin className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">
              {location.cityName
                ? location.cityName.split(',')[0]
                : location.isAllowed
                ? 'GPS Active'
                : 'Set Location'}
            </span>
          </button>

          {/* User Alias Pill */}
          {user && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 shadow-sm">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-sm"
                style={{ backgroundColor: user.avatarColor || '#6366F1' }}
              >
                {user.alias.substring(0, 1).toUpperCase()}
              </div>

              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[110px] sm:max-w-[140px] truncate">
                {user.alias}
              </span>

              <button
                onClick={handleRandomizeAlias}
                disabled={isChangingAlias}
                title="Generate new anonymous alias"
                className="p-1 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                <Shuffle
                  className={`w-3.5 h-3.5 ${
                    isChangingAlias ? 'animate-spin text-indigo-500' : ''
                  }`}
                />
              </button>
            </div>
          )}

          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Night/Day Mode"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all shadow-sm"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
