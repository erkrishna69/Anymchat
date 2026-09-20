'use client';

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import {
  X,
  Shuffle,
  MapPin,
  Sliders,
  ShieldCheck,
  UserCheck,
  LogIn,
  LogOut,
  Mail,
} from 'lucide-react';

interface MobileSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMockLocation: () => void;
  onOpenAuth: () => void;
}

export const MobileSettingsSheet: React.FC<MobileSettingsSheetProps> = ({
  isOpen,
  onClose,
  onOpenMockLocation,
  onOpenAuth,
}) => {
  const { user, changeAlias, isLoggedInWithAccount, logout } = useAuth();
  const { location, setCustomRadius, requestLocation } = useLocation();

  if (!isOpen) return null;

  const radii = [1, 5, 10, 25];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-md bg-[#111622] border-t sm:border border-[#1F2737] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-slide-up space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1C2436]">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            Chat & Identity Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Account Authentication Banner */}
        <div className="p-3 rounded-2xl bg-[#161C2A] border border-[#212A3D] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 flex-shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="text-[11px] text-slate-400">
                {isLoggedInWithAccount ? 'Registered Account' : 'Guest Session'}
              </div>
              <div className="text-xs font-bold text-white truncate">
                {isLoggedInWithAccount ? user?.email : 'No account linked'}
              </div>
            </div>
          </div>

          {isLoggedInWithAccount ? (
            <button
              onClick={async () => {
                await logout();
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-all flex-shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          ) : (
            <button
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm flex-shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In / Sign Up</span>
            </button>
          )}
        </div>

        {/* Anonymous Identity Card */}
        {user && (
          <div className="p-3.5 rounded-2xl bg-[#161C2A] border border-[#212A3D] flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ring-1 ring-white/10 flex-shrink-0"
                style={{ backgroundColor: user.avatarColor || '#6366F1' }}
              >
                {user.alias.substring(0, 1).toUpperCase()}
              </div>
              <div className="truncate">
                <div className="text-xs text-slate-400">Your Anonymous Persona</div>
                <div className="text-sm font-bold text-white truncate">{user.alias}</div>
              </div>
            </div>

            <button
              onClick={() => changeAlias()}
              className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-medium text-xs flex items-center gap-1.5 transition-all active:scale-95 flex-shrink-0"
              title="Get a new random anonymous alias"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Shuffle</span>
            </button>
          </div>
        )}

        {/* Fixed 10 KM Radius Indicator */}
        <div className="p-3.5 rounded-2xl bg-[#161C2A] border border-[#212A3D] flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-white">Proximity Range</div>
            <div className="text-[11px] text-slate-400">Strictly fixed for local anonymous chat</div>
          </div>
          <span className="px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 text-xs font-bold">
            10 KM
          </span>
        </div>

        {/* Location & GPS Options */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-300">Location Settings</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                requestLocation();
                onClose();
              }}
              className="p-2.5 rounded-xl bg-[#161C2A] border border-[#212A3D] hover:bg-[#1A2234] text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition-all"
            >
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              <span>Use Real GPS</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenMockLocation();
              }}
              className="p-2.5 rounded-xl bg-[#161C2A] border border-[#212A3D] hover:bg-[#1A2234] text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition-all"
            >
              <Sliders className="w-3.5 h-3.5 text-pink-400" />
              <span>Simulate City</span>
            </button>
          </div>
        </div>

        {/* Privacy reassurance */}
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
          <span>Privacy Guard Active: Zero coordinates shared. Only relative distance tag is visible.</span>
        </div>
      </div>
    </div>
  );
};
