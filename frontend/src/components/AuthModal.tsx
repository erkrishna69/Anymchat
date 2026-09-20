'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Mail, Lock, Eye, EyeOff, ShieldCheck, UserCheck, Sparkles, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signup, login, resetIdentity } = useAuth();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      if (tab === 'signup') {
        const res = await signup(email, password);
        if (!res.success) {
          setErrorMessage(res.error || 'Signup failed');
          return;
        }
      } else {
        const res = await login(email, password);
        if (!res.success) {
          setErrorMessage(res.error || 'Invalid email or password');
          return;
        }
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAsGuest = async () => {
    setLoading(true);
    await resetIdentity();
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-md bg-[#111622] border-t sm:border border-[#1F2737] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1C2436]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {tab === 'login' ? 'Log In to AnymChat' : 'Create Account'}
              </h2>
              <p className="text-xs text-slate-400">
                {tab === 'login'
                  ? 'Access your persistent anonymous persona'
                  : 'Save your anonymous handle & history'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-[#161C2A] rounded-xl border border-[#212A3D]">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === 'login'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === 'signup'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-[#161C2A] border border-[#212A3D] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tab === 'signup' ? 'At least 6 characters' : 'Enter password'}
                className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl bg-[#161C2A] border border-[#212A3D] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/25 disabled:opacity-50 mt-2"
          >
            {loading
              ? 'Please wait...'
              : tab === 'login'
              ? 'Log In'
              : 'Create Anonymous Account'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-[#1C2436]"></div>
          <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
            Or
          </span>
          <div className="flex-grow border-t border-[#1C2436]"></div>
        </div>

        {/* Guest fallback button */}
        <button
          type="button"
          onClick={handleContinueAsGuest}
          className="w-full py-2 text-xs font-medium text-slate-400 hover:text-white bg-[#161C2A] border border-[#212A3D] hover:bg-[#1A2234] rounded-xl transition-all"
        >
          Continue as Instant Guest (No Account Required)
        </button>

        {/* Privacy Note */}
        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] flex items-start gap-2.5 leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
          <span>
            <strong>100% Privacy:</strong> Your real email is strictly confidential for login security only. It is <strong>never</strong> displayed to other users in the 10 KM chat.
          </span>
        </div>
      </div>
    </div>
  );
};
