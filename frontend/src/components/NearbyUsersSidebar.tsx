'use client';

import React from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { IPublicNearbyUser } from '../types';
import { Users, MessageSquare, Shield, Sparkles } from 'lucide-react';

interface NearbyUsersSidebarProps {
  onStartDirectChat: (user: IPublicNearbyUser) => void;
  onOpenReport: (userId: string, alias: string) => void;
  onOpenBlock: (userId: string, alias: string) => void;
}

export const NearbyUsersSidebar: React.FC<NearbyUsersSidebarProps> = ({
  onStartDirectChat,
  onOpenReport,
  onOpenBlock,
}) => {
  const { nearbyUsers, totalNearbyCount } = useSocket();
  const { user: currentUser } = useAuth();

  // Filter out self
  const filteredUsers = nearbyUsers.filter(
    (u) => u.anonymousId !== currentUser?.anonymousId
  );

  return (
    <aside className="w-full lg:w-80 flex flex-col glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 p-4 shadow-sm overflow-hidden h-[300px] lg:h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
            <Users className="w-4 h-4" />
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Nearby Active Users
          </h2>
        </div>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          {filteredUsers.length} Online
        </span>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1">
        {filteredUsers.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-30 text-indigo-400" />
            <p>No other users in this 10 KM radius right now.</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Open another browser tab or use &quot;Simulate City&quot; to test!
            </p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.anonymousId}
              className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0"
                  style={{ backgroundColor: user.avatarColor || '#6366F1' }}
                >
                  {user.alias.substring(0, 1).toUpperCase()}
                </div>

                <div className="truncate">
                  <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                    {user.alias}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Nearby · Online</span>
                  </div>
                </div>
              </div>

              {/* Direct Chat Trigger */}
              <button
                onClick={() => onStartDirectChat(user)}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all text-xs font-medium flex items-center gap-1 opacity-90 group-hover:opacity-100"
                title={`Chat anonymously with ${user.alias}`}
              >
                <MessageSquare className="w-3 h-3" />
                <span className="hidden sm:inline">DM</span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-indigo-500" />
        <span>Strictly anonymous. No profiles, no phone numbers.</span>
      </div>
    </aside>
  );
};
