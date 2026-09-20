'use client';

import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, AlertTriangle, Trash2, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { useRouter } from 'next/navigation';

type SettingsSubPage =
  | null
  | 'account'
  | 'privacy'
  | 'notifications'
  | 'appearance'
  | 'blocked'
  | 'about';

export const MinimalSettings: React.FC = () => {
  const router = useRouter();
  const { user, logout, deleteAccount } = useAuth();
  const { location, requestLocation, setMockLocation } = useLocation();

  const [activeSubPage, setActiveSubPage] = useState<SettingsSubPage>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [blockedList, setBlockedList] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await deleteAccount();
      if (res.success) {
        router.replace('/login?deleted=true');
      } else {
        setDeleteError(res.error || 'Failed to delete account');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  // Subpage: Account
  if (activeSubPage === 'account') {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#080B10] text-[#F0F4F8] select-none">
        <header className="h-14 bg-[#080B10] border-b border-[#1C2534] px-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => { setActiveSubPage(null); setShowDeleteConfirm(false); }}
            className="p-1 -ml-1 text-[#94A3B8] hover:text-[#F0F4F8]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-[15px] font-medium">Account</span>
        </header>

        <div className="p-4 space-y-5 max-w-md">
          {/* Permanent Anonymous Handle */}
          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-[#8A99AD]">
              Anonymous Handle
            </span>
            <div className="flex items-center justify-between bg-[#0E131C] border border-[#1C2534] px-3.5 py-2.5 rounded-lg">
              <span className="font-mono text-sm text-[#F0F4F8]">
                {user?.alias || 'Anonymous'}
              </span>
              <span className="text-[10px] text-[#57657A] bg-[#141C28] px-2 py-0.5 rounded border border-[#1C2534]">
                Permanent
              </span>
            </div>
            <p className="text-[11px] text-[#57657A]">
              Handles are permanently locked to your resident slot and cannot be changed.
            </p>
          </div>

          <div className="space-y-1 pt-2 border-t border-[#141A24]">
            <span className="block text-xs text-[#8A99AD]">Anonymous ID</span>
            <span className="block font-mono text-xs text-[#57657A] break-all select-text">
              {user?.anonymousId || 'Unassigned'}
            </span>
          </div>

          <div className="space-y-1 pt-2 border-t border-[#141A24]">
            <span className="block text-xs text-[#8A99AD]">Session Status</span>
            <span className="block text-xs text-[#57657A]">
              Active Session
            </span>
          </div>

          {/* Account Actions */}
          <div className="pt-4 border-t border-[#141A24] space-y-2">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#0E131C] hover:bg-[#141C28] border border-[#1C2534] text-xs text-[#8A99AD] hover:text-[#F0F4F8] rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>

            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#0E131C] hover:bg-[#141C28] border border-[#1C2534] text-xs text-[#57657A] hover:text-[#EF4444] rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
            ) : (
              <div className="bg-[#0E131C] border border-[#1C2534] p-3 rounded-lg space-y-2.5">
                <div className="flex items-start gap-2 text-xs text-[#8A99AD]">
                  <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-medium text-[#F0F4F8] block">Delete account?</span>
                    <p className="text-[11px] text-[#8A99AD]">
                      You will not be able to create a new account with this email for 24 hours.
                    </p>
                  </div>
                </div>

                {deleteError && (
                  <p className="text-[11px] text-[#EF4444]">{deleteError}</p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-1.5 text-xs bg-[#080B10] border border-[#1C2534] rounded text-[#8A99AD]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="flex-1 py-1.5 text-xs bg-[#1A1115] border border-[#3A1B24] rounded text-[#EF4444]"
                  >
                    {isDeleting ? 'Deleting...' : 'Confirm'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Subpage: Privacy
  if (activeSubPage === 'privacy') {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#080B10] text-[#F0F4F8] select-none overflow-y-auto">
        <header className="h-14 bg-[#080B10] border-b border-[#1C2534] px-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveSubPage(null)}
            className="p-1 -ml-1 text-[#94A3B8] hover:text-[#F0F4F8]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-[15px] font-medium">Privacy</span>
        </header>

        <div className="p-4 space-y-5 max-w-md text-xs">
          <div className="space-y-1">
            <span className="block text-sm text-[#F0F4F8]">Proximity Radius</span>
            <span className="block text-[#8A99AD]">
              Fixed strictly at 10 KM. You only discover and chat with users within 10 km of your coordinates.
            </span>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#141A24]">
            <span className="block text-[#8A99AD]">GPS Location Status</span>
            <div className="text-xs text-[#F0F4F8] bg-[#0E131C] border border-[#1C2534] p-3 rounded space-y-2">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={location.isAllowed ? 'text-[#94A3B8]' : 'text-[#57657A]'}>
                  {location.isAllowed ? 'Allowed' : 'Not Granted'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => requestLocation()}
                className="w-full text-center text-xs bg-[#141C28] hover:bg-[#1A2536] border border-[#232F42] text-[#F0F4F8] py-1.5 rounded transition-colors"
              >
                Request Device GPS Permission
              </button>
              <button
                type="button"
                onClick={() => setMockLocation(28.6315, 77.2167, 'Connaught Place, Delhi')}
                className="w-full text-center text-xs bg-[#080B10] hover:bg-[#141C28] border border-[#1C2534] text-[#8A99AD] hover:text-[#F0F4F8] py-1.5 rounded transition-colors"
              >
                Simulate City (Delhi CP)
              </button>
            </div>
          </div>

          <div className="space-y-1 pt-2 border-t border-[#141A24]">
            <span className="block text-[#8A99AD]">Coordinate Privacy</span>
            <span className="block text-[#57657A]">
              Exact latitude and longitude are never stored or transmitted. Proximity hashes are computed on the fly and discarded.
            </span>
          </div>

          <div className="space-y-1 pt-2 border-t border-[#141A24]">
            <span className="block text-[#8A99AD]">24-Hour Deletion Cooldown</span>
            <span className="block text-[#57657A]">
              When an account is deleted, the associated email is placed on a 24-hour cooldown to protect the network from abuse.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Subpage: Notifications
  if (activeSubPage === 'notifications') {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#080B10] text-[#F0F4F8] select-none">
        <header className="h-14 bg-[#080B10] border-b border-[#1C2534] px-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveSubPage(null)}
            className="p-1 -ml-1 text-[#94A3B8] hover:text-[#F0F4F8]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-[15px] font-medium">Notifications</span>
        </header>

        <div className="p-4 space-y-4 max-w-md">
          <div className="flex items-center justify-between py-2 border-b border-[#141A24]">
            <div>
              <span className="block text-sm text-[#F0F4F8]">Message Sounds</span>
              <span className="block text-xs text-[#57657A]">Play sound on incoming direct message</span>
            </div>
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-10 h-6 rounded-full border transition-colors relative ${
                soundEnabled ? 'bg-[#1E293B] border-[#2E3C52]' : 'bg-[#0E131C] border-[#1C2534]'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-[#F0F4F8] transition-transform ${
                  soundEnabled ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Subpage: Appearance
  if (activeSubPage === 'appearance') {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#080B10] text-[#F0F4F8] select-none">
        <header className="h-14 bg-[#080B10] border-b border-[#1C2534] px-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveSubPage(null)}
            className="p-1 -ml-1 text-[#94A3B8] hover:text-[#F0F4F8]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-[15px] font-medium">Appearance</span>
        </header>

        <div className="p-4 space-y-4 max-w-md">
          <div className="space-y-1">
            <span className="block text-sm text-[#F0F4F8]">Theme</span>
            <span className="block text-xs text-[#8A99AD]">
              Strictly minimal monochromatic dark palette.
            </span>
          </div>
          <div className="p-3 bg-[#0E131C] border border-[#1C2534] rounded text-xs text-[#94A3B8]">
            Active: Dark Navy (Strictly Monochromatic)
          </div>
        </div>
      </div>
    );
  }

  // Subpage: Blocked Users
  if (activeSubPage === 'blocked') {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#080B10] text-[#F0F4F8] select-none">
        <header className="h-14 bg-[#080B10] border-b border-[#1C2534] px-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveSubPage(null)}
            className="p-1 -ml-1 text-[#94A3B8] hover:text-[#F0F4F8]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-[15px] font-medium">Blocked Users</span>
        </header>

        <div className="p-4">
          {blockedList.length === 0 ? (
            <p className="text-xs text-[#57657A] py-8 text-center">
              No blocked users
            </p>
          ) : (
            <div className="divide-y divide-[#141A24]">
              {blockedList.map((id) => (
                <div key={id} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-mono text-[#8A99AD]">{id}</span>
                  <button
                    type="button"
                    onClick={() => setBlockedList((prev) => prev.filter((item) => item !== id))}
                    className="text-[#94A3B8] hover:text-[#F0F4F8]"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Subpage: About
  if (activeSubPage === 'about') {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#080B10] text-[#F0F4F8] select-none overflow-y-auto">
        <header className="h-14 bg-[#080B10] border-b border-[#1C2534] px-4 flex items-center gap-3 sticky top-0 z-10">
          <button
            type="button"
            onClick={() => setActiveSubPage(null)}
            className="p-1 -ml-1 text-[#94A3B8] hover:text-[#F0F4F8]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-[15px] font-medium">About & Privacy</span>
        </header>

        <div className="p-4 space-y-5 max-w-lg text-xs leading-relaxed pb-8">
          <div className="bg-[#0E131C] border border-[#1C2534] p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-[#F0F4F8]">AnymChat</span>
              <span className="text-[10px] font-mono uppercase bg-[#141C28] text-[#38BDF8] px-2 py-0.5 rounded border border-[#232F42]">
                v1.0.0
              </span>
            </div>
            <p className="text-[#8A99AD]">
              AnymChat is a real-time, proximity-based anonymous messaging network. Connect instantly with people within a strict 10-kilometer radius without ever revealing your personal identity.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[#8A99AD] uppercase tracking-wider">
              Core Principles
            </h3>
            <div className="space-y-2 text-[#8A99AD]">
              <div className="bg-[#080B10] border border-[#1C2534] p-3 rounded-lg">
                <span className="font-semibold text-[#F0F4F8] block mb-1">10 KM Proximity Horizon</span>
                Only users physically located within 10 KM can interact in the shared local chat space.
              </div>
              <div className="bg-[#080B10] border border-[#1C2534] p-3 rounded-lg">
                <span className="font-semibold text-[#F0F4F8] block mb-1">Zero Identity Requirement</span>
                No real names, phone numbers, or social handles required.
              </div>
              <div className="bg-[#080B10] border border-[#1C2534] p-3 rounded-lg">
                <span className="font-semibold text-[#F0F4F8] block mb-1">AI Anti-Doxxing Guard</span>
                Real-time scanning protects everyone from having phone numbers or handles leaked.
              </div>
            </div>
          </div>

          {/* Developer Card */}
          <div className="space-y-2 pt-2 border-t border-[#141A24]">
            <h3 className="text-xs font-semibold text-[#8A99AD] uppercase tracking-wider">
              Developer
            </h3>
            <div className="bg-[#0E131C] border border-[#1C2534] p-4 rounded-xl flex items-center gap-4">
              <img
                src="/developer/krishna.png"
                alt="Krishna Kumar"
                className="w-16 h-16 rounded-full border border-[#1C2534] object-cover bg-[#141C28]"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#F0F4F8]">Krishna Kumar</span>
                  <span className="text-[10px] bg-[#141C28] border border-[#232F42] text-[#38BDF8] px-1.5 py-0.5 rounded font-medium">
                    Lead Dev
                  </span>
                </div>
                <p className="text-[11px] text-[#8A99AD]">
                  Creator & Full Stack Architect of AnymChat
                </p>
                <p className="text-[11px] text-[#57657A] leading-relaxed">
                  Engineered with dedication for high-speed, secure, and privacy-first local community networking.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Settings Menu
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#080B10] overflow-y-auto select-none">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-[19px] font-semibold text-[#F0F4F8] tracking-tight">
          Settings
        </h1>
      </div>

      <div className="flex flex-col divide-y divide-[#141A24]">
        <button
          type="button"
          onClick={() => setActiveSubPage('account')}
          className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[#0C1018] transition-colors"
        >
          <span className="text-[14px] text-[#F0F4F8]">Account</span>
          <ChevronRight className="w-4 h-4 text-[#57657A]" />
        </button>

        <button
          type="button"
          onClick={() => setActiveSubPage('privacy')}
          className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[#0C1018] transition-colors"
        >
          <span className="text-[14px] text-[#F0F4F8]">Privacy</span>
          <ChevronRight className="w-4 h-4 text-[#57657A]" />
        </button>

        <button
          type="button"
          onClick={() => setActiveSubPage('notifications')}
          className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[#0C1018] transition-colors"
        >
          <span className="text-[14px] text-[#F0F4F8]">Notifications</span>
          <ChevronRight className="w-4 h-4 text-[#57657A]" />
        </button>

        <button
          type="button"
          onClick={() => setActiveSubPage('appearance')}
          className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[#0C1018] transition-colors"
        >
          <span className="text-[14px] text-[#F0F4F8]">Appearance</span>
          <ChevronRight className="w-4 h-4 text-[#57657A]" />
        </button>

        <button
          type="button"
          onClick={() => setActiveSubPage('blocked')}
          className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[#0C1018] transition-colors"
        >
          <span className="text-[14px] text-[#F0F4F8]">Blocked Users</span>
          <ChevronRight className="w-4 h-4 text-[#57657A]" />
        </button>
      </div>

      {/* Hairline Divider */}
      <div className="my-4 border-t border-[#1C2534]" />

      <div className="flex flex-col divide-y divide-[#141A24]">
        <button
          type="button"
          onClick={() => setActiveSubPage('about')}
          className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[#0C1018] transition-colors"
        >
          <span className="text-[14px] text-[#F0F4F8]">About</span>
          <ChevronRight className="w-4 h-4 text-[#57657A]" />
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full px-4 py-3.5 flex items-center text-left hover:bg-[#0C1018] transition-colors text-[#94A3B8] hover:text-[#F0F4F8]"
        >
          <span className="text-[14px]">Log out</span>
        </button>
      </div>
    </div>
  );
};
