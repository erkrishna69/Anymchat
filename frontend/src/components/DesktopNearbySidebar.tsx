'use client';

import React from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { IPublicNearbyUser } from '../types';
import {
  Users,
  MessageSquare,
  Shuffle,
  MapPin,
  ShieldCheck,
  Sparkles,
  Sliders,
  LogIn,
  LogOut,
  Mail,
} from 'lucide-react';

interface DesktopNearbySidebarProps {
  onStartDirectChat: (user: IPublicNearbyUser) => void;
  onOpenMockLocation: () => void;
  onOpenAuth: () => void;
}

export const DesktopNearbySidebar: React.FC<DesktopNearbySidebarProps> = ({
  onStartDirectChat,
  onOpenMockLocation,
  onOpenAuth,
}) => {
  const { nearbyUsers, totalNearbyCount } = useSocket();
  const { user: currentUser, changeAlias, isLoggedInWithAccount, logout } = useAuth();
  const { location, setCustomRadius, requestLocation } = useLocation();

  const radii = [1, 5, 10, 25];

  const otherUsers = nearbyUsers.filter(
    (u) => u.anonymousId !== currentUser?.anonymousId
  );

  return (
    <aside className="h-full flex flex-col bg-[#0E121B] border-l border-[#1A202C] overflow-hidden select-none">
      {/* Current User Identity Card */}
      {currentUser && (
        <div className="p-4 border-b border-[#1A202C] bg-[#111622]/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold ring-1 ring-white/10 shadow-sm flex-shrink-0"
                style={{ backgroundColor: currentUser.avatarColor || '#6366F1' }}
              >
                {currentUser.alias.substring(0, 1).toUpperCase()}
              </div>
              <div className="truncate">
                <div className="text-[11px] text-slate-400 font-medium">Your Identity</div>
                <div className="text-xs font-bold text-white truncate">{currentUser.alias}</div>
              </div>
            </div>

            <button
              onClick={() => changeAlias()}
              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-[#161C2A] rounded-lg transition-colors flex-shrink-0"
              title="Shuffle alias"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Account status: Log In or Logged In Email */}
          <div className="mt-3 pt-2.5 border-t border-[#1C2436] flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0 text-xs">
              <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <span className="truncate text-slate-400 text-[11px]">
                {isLoggedInWithAccount ? currentUser.email : 'Guest Session'}
              </span>
            </div>

            {isLoggedInWithAccount ? (
              <button
                onClick={() => logout()}
                className="text-[11px] text-rose-400 hover:underline flex items-center gap-1 flex-shrink-0"
              >
                <LogOut className="w-3 h-3" />
                <span>Logout</span>
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="text-[11px] text-indigo-400 hover:underline font-semibold flex items-center gap-1 flex-shrink-0"
              >
                <LogIn className="w-3 h-3" />
                <span>Login / Signup</span>
              </button>
            )}
          </div>

          {/* Fixed 10 KM Range Indicator */}
          <div className="mt-3 pt-3 border-t border-[#1C2436] flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Proximity Range</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 font-bold text-[11px] border border-indigo-500/30">
              10 KM Radius
            </span>
          </div>

          {/* Location status trigger */}
          <div className="mt-2.5 flex items-center gap-1.5">
            <button
              onClick={onOpenMockLocation}
              className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#161C2A] hover:bg-[#1C2436] text-[11px] text-slate-300 font-medium flex items-center justify-center gap-1.5 border border-[#212A3D] transition-colors"
            >
              <MapPin className="w-3 h-3 text-indigo-400" />
              <span className="truncate">
                {location.cityName ? location.cityName.split(',')[0] : 'Set Location'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Nearby Active Users Header */}
      <div className="px-4 py-3 border-b border-[#1A202C] flex items-center justify-between bg-[#0B0E14]/40">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Nearby Users
          </span>
        </div>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {totalNearbyCount} Online
        </span>
      </div>

      {/* Online Users List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {otherUsers.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <Sparkles className="w-6 h-6 mx-auto opacity-30 text-indigo-400" />
            <p className="text-xs">No one else nearby right now.</p>
            <p className="text-[10px] text-slate-600">
              Open another tab or simulate location to test!
            </p>
          </div>
        ) : (
          otherUsers.map((user) => (
            <div
              key={user.anonymousId}
              className="p-2.5 rounded-xl bg-[#131824]/60 hover:bg-[#161D2E] border border-transparent hover:border-[#212A3D] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ring-1 ring-white/10 flex-shrink-0"
                  style={{ backgroundColor: user.avatarColor || '#6366F1' }}
                >
                  {user.alias.substring(0, 1).toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                    {user.alias}
                  </div>
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Nearby</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onStartDirectChat(user)}
                className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-all opacity-80 group-hover:opacity-100 flex-shrink-0"
              >
                <MessageSquare className="w-3 h-3" />
                <span>DM</span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Safety / Privacy Guarantee */}
      <div className="p-3 border-t border-[#1A202C] bg-[#0A0D13] text-[10px] text-slate-500 flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
        <span>10 km Anonymous Circle &middot; No exact GPS leaked</span>
      </div>
    </aside>
  );
};
