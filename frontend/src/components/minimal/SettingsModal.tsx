'use client';

import React, { useState } from 'react';
import { 
  X, 
  Info, 
  ShieldCheck, 
  Code2, 
  User, 
  MapPin, 
  Sparkles, 
  Lock, 
  Copy, 
  Check, 
  LogOut, 
  Cpu, 
  Layers,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'about' | 'privacy' | 'developer' | 'account';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'about',
}) => {
  const router = useRouter();
  const { user, logout, deleteAccount } = useAuth();

  const [activeTab, setActiveTab] = useState<'about' | 'privacy' | 'developer' | 'account'>(defaultTab);
  const [copiedId, setCopiedId] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyId = () => {
    if (user?.anonymousId) {
      navigator.clipboard.writeText(user.anonymousId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
    router.replace('/login');
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await deleteAccount();
      if (res.success) {
        onClose();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-[#090C12] border border-[#1C2534] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[#F0F4F8]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="h-15 px-5 border-b border-[#1C2534] flex items-center justify-between bg-[#080B10]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#101622] border border-[#1C2534] flex items-center justify-center text-[#38BDF8]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#F0F4F8] leading-tight">Settings</h2>
              <p className="text-[11px] text-[#8A99AD]">AnymChat Hyperlocal Network</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#8A99AD] hover:text-[#F0F4F8] hover:bg-[#141C28] rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Monochromatic Tab Navigation */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-[#080B10] border-b border-[#1C2534] overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => { setActiveTab('about'); setShowDeleteConfirm(false); setShowLogoutConfirm(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              activeTab === 'about'
                ? 'bg-[#141C28] text-[#38BDF8] border border-[#232F42]'
                : 'text-[#8A99AD] hover:text-[#F0F4F8] hover:bg-[#101622]'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>About</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('privacy'); setShowDeleteConfirm(false); setShowLogoutConfirm(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              activeTab === 'privacy'
                ? 'bg-[#141C28] text-[#38BDF8] border border-[#232F42]'
                : 'text-[#8A99AD] hover:text-[#F0F4F8] hover:bg-[#101622]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('developer'); setShowDeleteConfirm(false); setShowLogoutConfirm(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              activeTab === 'developer'
                ? 'bg-[#141C28] text-[#38BDF8] border border-[#232F42]'
                : 'text-[#8A99AD] hover:text-[#F0F4F8] hover:bg-[#101622]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Developer</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('account'); setShowDeleteConfirm(false); setShowLogoutConfirm(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              activeTab === 'account'
                ? 'bg-[#141C28] text-[#38BDF8] border border-[#232F42]'
                : 'text-[#8A99AD] hover:text-[#F0F4F8] hover:bg-[#101622]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Account</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
          {/* TAB 1: ABOUT (Full English, Monochromatic) */}
          {activeTab === 'about' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-[#0E131C] border border-[#1C2534] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-[#F0F4F8]">AnymChat</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#141C28] border border-[#232F42] text-[#38BDF8]">
                      Version 1.0.0
                    </span>
                  </div>
                  <span className="text-[11px] text-[#57657A]">Hyperlocal Proximity</span>
                </div>
                <p className="text-xs text-[#8A99AD] leading-relaxed">
                  AnymChat is a real-time, proximity-based anonymous messaging network. It bridges real-world physical surroundings with digital anonymity, allowing you to connect instantly with people within a strict 10-kilometer radius without ever disclosing your real name, phone number, or personal identity.
                </p>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-xs font-semibold text-[#8A99AD] uppercase tracking-wider">
                  How AnymChat Works
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#0E131C] border border-[#1C2534] p-3.5 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-[#38BDF8]">
                      <MapPin className="w-4 h-4" />
                      <span className="text-xs font-semibold text-[#F0F4F8]">10 KM Hyperlocal Range</span>
                    </div>
                    <p className="text-[11px] text-[#8A99AD] leading-relaxed">
                      Only users located within a 10-kilometer radius can discover and chat with each other. Tailored for college campuses, hostels, neighborhoods, and local communities.
                    </p>
                  </div>

                  <div className="bg-[#0E131C] border border-[#1C2534] p-3.5 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-[#38BDF8]">
                      <Lock className="w-4 h-4" />
                      <span className="text-xs font-semibold text-[#F0F4F8]">100% Anonymous Identity</span>
                    </div>
                    <p className="text-[11px] text-[#8A99AD] leading-relaxed">
                      No phone numbers, real names, or social media links required. Speak your mind freely under a permanent anonymous resident persona without fear of social judgment.
                    </p>
                  </div>

                  <div className="bg-[#0E131C] border border-[#1C2534] p-3.5 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-[#38BDF8]">
                      <Cpu className="w-4 h-4" />
                      <span className="text-xs font-semibold text-[#F0F4F8]">Real-time AI Shield</span>
                    </div>
                    <p className="text-[11px] text-[#8A99AD] leading-relaxed">
                      An integrated anti-doxxing AI scanner verifies messages in real time to prevent anyone from leaking private phone numbers, handles, or personal addresses.
                    </p>
                  </div>

                  <div className="bg-[#0E131C] border border-[#1C2534] p-3.5 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-[#38BDF8]">
                      <Layers className="w-4 h-4" />
                      <span className="text-xs font-semibold text-[#F0F4F8]">Discord-Style Live Feed</span>
                    </div>
                    <p className="text-[11px] text-[#8A99AD] leading-relaxed">
                      Streamlined single-column live stream layout with instant messaging, live participant counts, and responsive desktop emoji support.
                    </p>
                  </div>
                </div>
              </div>

              {/* Developer Banner */}
              <div 
                onClick={() => setActiveTab('developer')}
                className="bg-[#0E131C] border border-[#1C2534] hover:border-[#2E3C52] p-3.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img
                    src="/developer/krishna.png"
                    alt="Krishna Kumar"
                    className="w-10 h-10 rounded-full border border-[#1C2534] object-cover"
                  />
                  <div>
                    <div className="text-xs font-semibold text-[#F0F4F8]">
                      Developed by Krishna Kumar
                    </div>
                    <p className="text-[11px] text-[#8A99AD]">Lead Developer & Creator &middot; View Profile</p>
                  </div>
                </div>
                <span className="text-xs text-[#38BDF8]">&rarr;</span>
              </div>
            </div>
          )}

          {/* TAB 2: PRIVACY POLICY (Full English, Monochromatic) */}
          {activeTab === 'privacy' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-[#0E131C] border border-[#1C2534] rounded-xl p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-[#38BDF8]">
                  <ShieldCheck className="w-4 h-4" />
                  <h3 className="text-xs font-semibold text-[#F0F4F8] uppercase tracking-wider">
                    Privacy & Anti-Doxxing Policy
                  </h3>
                </div>
                <p className="text-xs text-[#8A99AD] leading-relaxed">
                  User privacy and identity security are the foundational principles of AnymChat. Our architecture enforces four strict privacy rules:
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="bg-[#0E131C] border border-[#1C2534] p-3.5 rounded-xl space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#38BDF8] bg-[#141C28] w-5 h-5 rounded flex items-center justify-center border border-[#1C2534]">1</span>
                    <h4 className="text-xs font-semibold text-[#F0F4F8]">Zero GPS Coordinate Storage</h4>
                  </div>
                  <p className="text-xs text-[#8A99AD] leading-relaxed pl-7">
                    We never log, store, or share your exact latitude or longitude in our databases or with other users. Location data is solely used in-memory to compute radial proximity bounds and is immediately discarded.
                  </p>
                </div>

                <div className="bg-[#0E131C] border border-[#1C2534] p-3.5 rounded-xl space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#38BDF8] bg-[#141C28] w-5 h-5 rounded flex items-center justify-center border border-[#1C2534]">2</span>
                    <h4 className="text-xs font-semibold text-[#F0F4F8]">Real-time AI Anti-Doxxing & PII Shield</h4>
                  </div>
                  <p className="text-xs text-[#8A99AD] leading-relaxed pl-7">
                    All incoming messages pass through an active AI safety filter. Phone numbers, personal email addresses, Instagram handles, social media links, and physical addresses are automatically intercepted to protect all members from doxxing.
                  </p>
                </div>

                <div className="bg-[#0E131C] border border-[#1C2534] p-3.5 rounded-xl space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#38BDF8] bg-[#141C28] w-5 h-5 rounded flex items-center justify-center border border-[#1C2534]">3</span>
                    <h4 className="text-xs font-semibold text-[#F0F4F8]">200-Word Message Guardrail</h4>
                  </div>
                  <p className="text-xs text-[#8A99AD] leading-relaxed pl-7">
                    Each message is strictly capped at 200 words. This enforces authentic, rapid conversation while preventing copypasta dumps, automated bot spam, and script floods.
                  </p>
                </div>

                <div className="bg-[#0E131C] border border-[#1C2534] p-3.5 rounded-xl space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#38BDF8] bg-[#141C28] w-5 h-5 rounded flex items-center justify-center border border-[#1C2534]">4</span>
                    <h4 className="text-xs font-semibold text-[#F0F4F8]">Ephemeral Sessions & 24-Hour Deletion Cooldown</h4>
                  </div>
                  <p className="text-xs text-[#8A99AD] leading-relaxed pl-7">
                    No third-party trackers or cross-site profiling cookies are ever used. If you delete your account, all credentials are removed and a 24-hour cooldown prevents re-registration with the same email to protect against spam loops.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DEVELOPER (Full English, Monochromatic) */}
          {activeTab === 'developer' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-[#0E131C] border border-[#1C2534] rounded-xl p-5 flex flex-col sm:flex-row items-center gap-5">
                <img
                  src="/developer/krishna.png"
                  alt="Krishna Kumar"
                  className="w-24 h-24 sm:w-26 sm:h-26 rounded-full border-2 border-[#1C2534] object-cover bg-[#141C28] shrink-0"
                />

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <div>
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <h3 className="text-base font-bold text-[#F0F4F8]">Krishna Kumar</h3>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-[#141C28] border border-[#1C2534] text-[#38BDF8]">
                        Lead Developer
                      </span>
                    </div>
                    <p className="text-xs text-[#8A99AD] font-medium">
                      Creator & Full Stack Architect of AnymChat
                    </p>
                  </div>

                  <p className="text-xs text-[#8A99AD] leading-relaxed">
                    Engineered AnymChat to give people a secure, fast, and privacy-first platform for authentic hyperlocal communication without identity tracking or algorithmic manipulation.
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#141C28] text-[#8A99AD] border border-[#1C2534]">Next.js</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#141C28] text-[#8A99AD] border border-[#1C2534]">TypeScript</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#141C28] text-[#8A99AD] border border-[#1C2534]">Tailwind CSS</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#141C28] text-[#8A99AD] border border-[#1C2534]">Socket.io</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#141C28] text-[#8A99AD] border border-[#1C2534]">AI PII Guard</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0E131C] border border-[#1C2534] p-4 rounded-xl space-y-1.5 text-xs text-[#8A99AD] leading-relaxed">
                <span className="text-xs font-semibold text-[#F0F4F8] block">Developer Statement</span>
                <p>
                  &ldquo;AnymChat was built from the ground up to ensure privacy is an absolute guarantee, not a luxury. By combining a strict 10 KM radial horizon with real-time AI anti-doxxing guards, users can connect authentically with their local surroundings.&rdquo;
                </p>
                <p className="text-[11px] text-[#57657A] pt-1">
                  &mdash; Krishna Kumar
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: ACCOUNT (Fixed Handle, Delete Account with 24h Cooldown, Monochromatic) */}
          {activeTab === 'account' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Permanent Anonymous Handle (Cannot be changed as per user request) */}
              <div className="bg-[#0E131C] border border-[#1C2534] p-4 rounded-xl space-y-2">
                <span className="block text-xs font-semibold text-[#8A99AD]">
                  Anonymous Handle (Alias)
                </span>
                <div className="flex items-center justify-between bg-[#080B10] border border-[#1C2534] px-3.5 py-2.5 rounded-lg">
                  <span className="font-mono text-sm text-[#F0F4F8] font-medium tracking-wide">
                    {user?.alias || 'Anonymous'}
                  </span>
                  <span className="text-[10px] text-[#57657A] bg-[#141C28] px-2 py-0.5 rounded border border-[#1C2534]">
                    Permanent
                  </span>
                </div>
                <p className="text-[11px] text-[#57657A] leading-relaxed">
                  Anonymous handles are permanently assigned to your identity slot and cannot be modified.
                </p>
              </div>

              {/* Identity & Session Info */}
              <div className="bg-[#0E131C] border border-[#1C2534] p-4 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-[#141A24]">
                  <span className="text-[#8A99AD]">Anonymous ID:</span>
                  <div className="flex items-center gap-1.5 font-mono text-[#F0F4F8] bg-[#080B10] px-2 py-1 rounded border border-[#1C2534]">
                    <span>{user?.anonymousId || 'Unassigned'}</span>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="text-[#8A99AD] hover:text-[#38BDF8] p-0.5"
                      title="Copy ID"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-[#38BDF8]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-[#141A24]">
                  <span className="text-[#8A99AD]">Gender Persona:</span>
                  <span className="capitalize font-mono text-[11px] text-[#8A99AD] bg-[#080B10] px-2 py-0.5 rounded border border-[#1C2534]">
                    {user?.gender || 'Not specified'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-[#8A99AD]">Proximity Range:</span>
                  <span className="font-mono text-[#F0F4F8]">10.0 KM Radius</span>
                </div>
              </div>

              {/* Account Actions (Logout & Delete Account) */}
              <div className="space-y-2 pt-1">
                {/* Logout Button & Confirmation */}
                {!showLogoutConfirm ? (
                  <button
                    type="button"
                    onClick={() => { setShowLogoutConfirm(true); setShowDeleteConfirm(false); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#0E131C] hover:bg-[#141C28] border border-[#1C2534] text-[#8A99AD] hover:text-[#F0F4F8] rounded-xl text-xs font-medium transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log out from session</span>
                  </button>
                ) : (
                  <div className="bg-[#0E131C] border border-[#1C2534] p-4 rounded-xl space-y-3">
                    <div className="flex items-start gap-2.5 text-[#F0F4F8]">
                      <div className="w-8 h-8 rounded-lg bg-rose-950/60 border border-rose-800/40 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-[#F0F4F8] block">
                          Are you sure you want to log out?
                        </span>
                        <p className="text-[11px] text-[#8A99AD] leading-relaxed">
                          You will be signed out of this session. You can sign back in anytime.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowLogoutConfirm(false)}
                        className="flex-1 py-2 px-3 bg-[#080B10] hover:bg-[#141C28] border border-[#1C2534] text-xs font-medium text-[#8A99AD] rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white rounded-lg shadow-lg transition-colors cursor-pointer"
                      >
                        Yes, Log out
                      </button>
                    </div>
                  </div>
                )}

                {/* Delete Account Section */}
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => { setShowDeleteConfirm(true); setShowLogoutConfirm(false); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#0E131C] hover:bg-[#141C28] border border-[#1C2534] text-[#57657A] hover:text-[#EF4444] rounded-xl text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Account</span>
                  </button>
                ) : (
                  <div className="bg-[#0E131C] border border-[#1C2534] p-4 rounded-xl space-y-3">
                    <div className="flex items-start gap-2.5 text-[#F0F4F8]">
                      <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-[#F0F4F8] block">
                          Permanently delete your account?
                        </span>
                        <p className="text-[11px] text-[#8A99AD] leading-relaxed">
                          This action will erase your user identity. <strong>You will not be able to create a new account using this email address for 24 hours.</strong>
                        </p>
                      </div>
                    </div>

                    {deleteError && (
                      <p className="text-[11px] text-[#EF4444] bg-[#080B10] p-2 rounded border border-[#1C2534]">
                        {deleteError}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={isDeleting}
                        className="flex-1 py-2 px-3 bg-[#080B10] hover:bg-[#141C28] border border-[#1C2534] text-xs font-medium text-[#8A99AD] rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        className="flex-1 py-2 px-3 bg-[#1A1115] hover:bg-[#25141B] border border-[#3A1B24] text-xs font-medium text-[#EF4444] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isDeleting ? 'Deleting...' : 'Confirm Deletion'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="h-12 px-5 bg-[#080B10] border-t border-[#1C2534] flex items-center justify-between text-[11px] text-[#57657A]">
          <span>AnymChat &middot; Krishna Kumar</span>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8A99AD] hover:text-[#F0F4F8] text-xs font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
