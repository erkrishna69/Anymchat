'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { MinimalChatView } from '../../components/minimal/MinimalChatView';
import { IMessageItem } from '../../components/minimal/types';
import { SettingsModal } from '../../components/minimal/SettingsModal';
import { InviteModal } from '../../components/minimal/InviteModal';
import { LogOut, Settings, UserPlus } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const {
    feedMessages,
    sendFeedMessage,
    nearbyUsers,
    totalNearbyCount,
    socketError,
    clearSocketError,
    isTimedOut,
    timeoutRemainingSec,
    isUserTimedOut,
    connectionStatus,
  } = useSocket();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // Handle hardware & browser back button gracefully for open modals
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const handlePopState = () => {
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
      } else if (isInviteOpen) {
        setIsInviteOpen(false);
      } else if (isLogoutConfirmOpen) {
        setIsLogoutConfirmOpen(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isSettingsOpen, isInviteOpen, isLogoutConfirmOpen]);

  const openSettings = () => {
    window.history.pushState({ modal: 'settings' }, '');
    setIsSettingsOpen(true);
  };

  const openInvite = () => {
    window.history.pushState({ modal: 'invite' }, '');
    setIsInviteOpen(true);
  };

  const openLogoutConfirm = () => {
    window.history.pushState({ modal: 'logout' }, '');
    setIsLogoutConfirmOpen(true);
  };

  const allMessages = useMemo(() => {
    return [...feedMessages].reverse().map((m) => {
      let timeString = 'Just now';
      try {
        if (m?.createdAt) {
          const d = new Date(m.createdAt);
          if (!isNaN(d.getTime())) {
            timeString = d.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
          }
        }
      } catch {
        timeString = 'Just now';
      }

      return {
        id: m?.id || `msg-${Date.now()}-${Math.random()}`,
        senderId: m?.senderAnonymousId || 'anonymous',
        senderAlias: m?.senderAlias || 'Anonymous',
        content: m?.content || '',
        replyTo: m?.replyTo
          ? {
              messageId: m.replyTo.messageId,
              senderAlias: m.replyTo.senderAlias || 'Anonymous',
              content: m.replyTo.content || '',
            }
          : undefined,
        timestamp: timeString,
        isSelf: Boolean(
          m?.senderAnonymousId &&
            user?.anonymousId &&
            m.senderAnonymousId === user.anonymousId
        ),
        avatarId:
          m?.avatarId ||
          (m?.senderAnonymousId === user?.anonymousId ? user?.avatarId : undefined),
        senderGender: m?.senderGender,
      };
    });
  }, [feedMessages, user]);

  const handleSendMessage = (
    content: string,
    replyTo?: { messageId: string; senderAlias: string; content: string }
  ) => {
    try {
      sendFeedMessage(content, replyTo);
    } catch {
      /* offline */
    }
  };

  const handleConfirmLogout = async () => {
    setIsLogoutConfirmOpen(false);
    await logout();
    router.replace('/login');
  };

  if (isLoading || !user) {
    return (
      <div className="h-[100dvh] w-full bg-[#080B10] flex items-center justify-center text-xs text-[#57657A]">
        Connecting to AnymChat...
      </div>
    );
  }

  const onlineCount = Math.max(1, totalNearbyCount, nearbyUsers.length + 1);

  return (
    <div className="h-[100dvh] w-full bg-[#080B10] text-[#F0F4F8] flex flex-col overflow-hidden select-none">
      <div className="flex-1 flex flex-col h-full overflow-hidden max-w-4xl w-full mx-auto">
        <MinimalChatView
          headerTitle="AnymChat"
          onlineCount={onlineCount}
          messages={allMessages}
          onSendMessage={handleSendMessage}
          errorMessage={socketError}
          onClearError={clearSocketError}
          isTimedOut={isTimedOut}
          timeoutRemainingSec={timeoutRemainingSec}
          isUserTimedOut={isUserTimedOut}
          currentUserAlias={user?.alias}
          connectionStatus={connectionStatus}
          rightAction={
            <div className="flex items-center gap-1">
              {/* Invite button */}
              <button
                type="button"
                onClick={openInvite}
                className="p-1.5 text-[#8A99AD] hover:text-[#F0F4F8] hover:bg-[#141C28] rounded-md transition-colors cursor-pointer"
                title="Invite someone"
              >
                <UserPlus className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={openSettings}
                className="p-1.5 text-[#8A99AD] hover:text-[#F0F4F8] hover:bg-[#141C28] rounded-md transition-colors cursor-pointer"
                title="Settings & About"
              >
                <Settings className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={openLogoutConfirm}
                className="flex items-center gap-1 text-xs text-[#8A99AD] hover:text-rose-400 px-2.5 py-1.5 rounded-md hover:bg-[#141C28] transition-colors cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </div>
          }
        />
      </div>

      {/* Logout Confirmation Modal */}
      {isLogoutConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsLogoutConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-[#0C1017] border border-[#1E293B] rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-950/60 border border-rose-800/40 flex items-center justify-center text-rose-400 shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="text-sm font-semibold text-[#F0F4F8]">
                  Are you sure you want to log out?
                </h3>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-[#141C28] hover:bg-[#1C2738] text-xs font-medium text-[#8A99AD] hover:text-[#F0F4F8] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-lg transition-colors cursor-pointer"
              >
                Yes, Log out
              </button>
            </div>
          </div>
        </div>
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        defaultTab="about"
      />

      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
      />
    </div>
  );
}
