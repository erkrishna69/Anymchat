'use client';

import React from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { IPublicNearbyUser } from '../types';
import { X, Users, MessageSquare, Shield, Sparkles } from 'lucide-react';

interface MobileOnlineUsersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDirectChat: (user: IPublicNearbyUser) => void;
}

export const MobileOnlineUsersSheet: React.FC<MobileOnlineUsersSheetProps> = ({
  isOpen,
  onClose,
  onStartDirectChat,
}) => {
  const { nearbyUsers, totalNearbyCount } = useSocket();
  const { user: currentUser } = useAuth();
  const { location } = useLocation();

  if (!isOpen) return null;

  // Filter out self
  const otherUsers = nearbyUsers.filter(
    (u) => u.anonymousId !== currentUser?.anonymousId
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-md bg-[#111622] border-t sm:border border-[#1F2737] rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#1C2436] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                People Around You
              </h2>
              <span className="text-[11px] text-slate-400">
                Within {location.radiusKm} km radius &middot; {totalNearbyCount} Active
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {otherUsers.length === 0 ? (
            <div className="py-10 text-center text-slate-400 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto opacity-30 text-indigo-400" />
              <p className="text-xs">No one else online right now.</p>
              <p className="text-[11px] text-slate-500">
                Share the link or invite nearby friends to chat!
              </p>
            </div>
          ) : (
            otherUsers.map((user) => (
              <div
                key={user.anonymousId}
                className="p-3 rounded-xl bg-[#161C2A] border border-[#212A3D] flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ring-1 ring-white/10"
                    style={{ backgroundColor: user.avatarColor || '#6366F1' }}
                  >
                    {user.alias.substring(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">
                      {user.alias}
                    </div>
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Nearby &middot; Active</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onStartDirectChat(user);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>DM</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer Note */}
        <div className="p-3 border-t border-[#1C2436] bg-[#0E121B] flex items-center gap-2 text-[11px] text-slate-400">
          <Shield className="w-3.5 h-3.5 text-indigo-400" />
          <span>Strictly anonymous. No phone, no name, zero coordinate leakage.</span>
        </div>
      </div>
    </div>
  );
};
