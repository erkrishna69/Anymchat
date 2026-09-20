'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { ApiService } from '../../services/api';
import { AuthFormSplitScreen, FormValues } from '@/components/ui/login';
import { RefreshCw, Lock } from 'lucide-react';

const EXISTING_AVATARS = [
  { id: 1, code: '01', image: '/avatars/avatar-1.jpg' },
  { id: 2, code: '02', image: '/avatars/avatar-2.jpg' },
  { id: 3, code: '03', image: '/avatars/avatar-3.jpg' },
];

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading, login, signup } = useAuth();

  // Mode: Default to 'login' so /login shows the LOGIN screen
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Signup Step: 1 = Email/Password, 2 = Gender/Avatar/Name, 3 = Connecting animation
  const [signupStep, setSignupStep] = useState<1 | 2 | 3>(1);

  // Signup credentials
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  // Profile setup
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | 'other'>('male');
  const [selectedAvatarId, setSelectedAvatarId] = useState<number>(1);
  const [generatedAlias, setGeneratedAlias] = useState<string>('ShadowWolf42');

  const [isGeneratingName, setIsGeneratingName] = useState<boolean>(false);
  const [nameGenError, setNameGenError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deletionNotice, setDeletionNotice] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('deleted') === 'true') {
        setDeletionNotice('Your account was deleted. You cannot create a new account with that email for 24 hours.');
      }
    }
  }, []);

  // If already logged in, navigate straight to dashboard
  useEffect(() => {
    if (!isAuthLoading && user) {
      router.replace('/app');
    }
  }, [user, isAuthLoading, router]);

  const fetchAiName = async (
    avatarId: number = selectedAvatarId,
    gender: 'male' | 'female' | 'other' = selectedGender
  ) => {
    setIsGeneratingName(true);
    setNameGenError(null);
    try {
      const res = await ApiService.generateAiName(undefined, avatarId, gender);
      if (res.success && res.alias) {
        setGeneratedAlias(res.alias);
      }
    } catch (err: any) {
      if (err.message && (err.message.toLowerCase().includes('rate limit') || err.message.includes('429'))) {
        setNameGenError(err.message);
      }
    } finally {
      setIsGeneratingName(false);
    }
  };

  useEffect(() => {
    fetchAiName(1, 'male');
  }, []);

  // STEP 3: Connecting with server and auto-login
  useEffect(() => {
    if (signupStep !== 3) return;

    let isMounted = true;
    const runSignup = async () => {
      setErrorMsg(null);
      try {
        await new Promise((r) => setTimeout(r, 1000));

        // Read referral code stored by /invite/[code] page
        const pendingReferral = typeof window !== 'undefined'
          ? localStorage.getItem('pendingReferral') || undefined
          : undefined;

        const res = await signup(
          signupEmail.trim(),
          signupPassword,
          selectedAvatarId,
          generatedAlias.trim(),
          selectedGender,
          pendingReferral
        );

        if (!isMounted) return;

        if (res.success) {
          // Clear the referral code after successful attribution
          if (typeof window !== 'undefined') {
            localStorage.removeItem('pendingReferral');
          }
          router.replace('/app');
        } else {
          setErrorMsg(res.error || 'Signup failed. Please try again.');
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || 'Connection failed. Please try again.');
        }
      }
    };

    runSignup();
    return () => {
      isMounted = false;
    };
  }, [signupStep]);

  // Login handler
  const handleLoginSubmit = async (data: FormValues) => {
    setErrorMsg(null);
    const res = await login(data.email, data.password);
    if (!res.success) {
      setErrorMsg(res.error || 'Invalid credentials');
      throw new Error(res.error || 'Invalid credentials');
    }
    router.replace('/app');
  };

  // Signup Step 1 Continue
  const handleStep1Continue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail || !signupEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address');
      return;
    }
    if (!signupPassword || signupPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }
    setErrorMsg(null);
    setSignupStep(2);
  };

  // Signup Step 2 Continue
  const handleStep2Continue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!generatedAlias.trim()) {
      setErrorMsg('Please enter an anonymous name');
      return;
    }
    setErrorMsg(null);
    setSignupStep(3);
  };

  // Redirecting state if already authenticated
  if (!isAuthLoading && user) {
    return (
      <div className="min-h-screen w-full bg-[#080B10] flex items-center justify-center text-xs text-[#57657A]">
        Redirecting to dashboard...
      </div>
    );
  }

  // 1. LOGIN SCREEN (Default on /login)
  if (authMode === 'login') {
    return (
      <AuthFormSplitScreen
        logo={
          <div className="text-center">
            <span className="text-xl font-bold tracking-wider uppercase text-[#F0F4F8]">
              AnymChat
            </span>
          </div>
        }
        title="Welcome!"
        description="Sign in by entering the information below"
        onSubmit={handleLoginSubmit}
        error={errorMsg || deletionNotice}
        onCreateAccountClick={() => {
          setErrorMsg(null);
          setAuthMode('signup');
          setSignupStep(1);
        }}
      />
    );
  }

  // 2. SIGNUP SCREEN (Multi-step flow)
  return (
    <AuthFormSplitScreen
      logo={
        <div className="text-center">
          <span className="text-xl font-bold tracking-wider uppercase text-[#F0F4F8]">
            AnymChat
          </span>
        </div>
      }
      title={
        signupStep === 1
          ? 'Create Account'
          : signupStep === 2
          ? 'Choose your profile'
          : 'Connecting...'
      }
      description={
        signupStep === 1
          ? 'Enter your credentials to get started'
          : signupStep === 2
          ? 'Customize your anonymous identity'
          : undefined
      }
      onSubmit={async () => {}}
      error={errorMsg}
      footer={
        signupStep !== 3 ? (
          <p className="text-center text-xs text-[#57657A]">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setAuthMode('login');
              }}
              className="font-medium text-[#8A99AD] hover:text-[#F0F4F8] underline cursor-pointer"
            >
              Log in
            </button>
          </p>
        ) : null
      }
    >
      {/* SIGNUP STEP 1: Email & Password */}
      {signupStep === 1 && (
        <form onSubmit={handleStep1Continue} className="space-y-4">
          <div>
            <label className="block text-xs text-[#8A99AD] mb-1">Email Address</label>
            <input
              type="email"
              required
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full bg-[#0E131C] border border-[#1C2534] text-xs text-[#F0F4F8] px-3.5 py-2.5 rounded-md focus:outline-none focus:border-[#2E3C52] placeholder-[#57657A]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#8A99AD] mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={signupPassword}
              onChange={(e) => setSignupPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full bg-[#0E131C] border border-[#1C2534] text-xs text-[#F0F4F8] px-3.5 py-2.5 rounded-md focus:outline-none focus:border-[#2E3C52] placeholder-[#57657A]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-[#141C28] hover:bg-[#1A2536] border border-[#232F42] text-sm font-medium text-[#F0F4F8] rounded-md transition-colors cursor-pointer"
          >
            Continue
          </button>
        </form>
      )}

      {/* SIGNUP STEP 2: Gender, 3 Avatars, Anonymous Name */}
      {signupStep === 2 && (
        <form onSubmit={handleStep2Continue} className="space-y-4">
          {/* Gender */}
          <div>
            <label className="block text-xs font-medium text-[#8A99AD] mb-1.5">Gender</label>
            <div className="grid grid-cols-3 gap-2">
              {(['male', 'female', 'other'] as const).map((g) => {
                const isSel = selectedGender === g;
                const label = g === 'male' ? 'Male' : g === 'female' ? 'Female' : 'Other';
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      setSelectedGender(g);
                      fetchAiName(selectedAvatarId, g);
                    }}
                    className={`py-2 px-2 rounded-md border text-xs font-medium text-center transition-colors cursor-pointer ${
                      isSel
                        ? 'bg-[#141C28] border-[#2E3C52] text-[#F0F4F8]'
                        : 'bg-[#0E131C] border-[#1C2534] text-[#8A99AD] hover:border-[#232F42]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Avatar (Only the 3 that actually exist) */}
          <div>
            <label className="block text-xs font-medium text-[#8A99AD] mb-1.5">Avatar</label>
            <div className="grid grid-cols-3 gap-2">
              {EXISTING_AVATARS.map((av) => {
                const isSelected = selectedAvatarId === av.id;
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => {
                      setSelectedAvatarId(av.id);
                      fetchAiName(av.id, selectedGender);
                    }}
                    className={`p-1.5 rounded-md border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#141C28] border-[#38BDF8] ring-1 ring-[#38BDF8]'
                        : 'bg-[#0E131C] border-[#1C2534] hover:border-[#2E3C52]'
                    }`}
                  >
                    <img
                      src={av.image}
                      alt={av.code}
                      className="w-14 h-14 rounded object-cover border border-[#1C2534]"
                    />
                    <span className="font-mono text-xs font-semibold text-[#F0F4F8]">
                      {av.code}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Your anonymous name (Read-only / Auto-generated) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-[#8A99AD]">
                Your anonymous handle
              </label>
              <span className="flex items-center gap-1 text-[10px] text-[#57657A] bg-[#141C28] px-2 py-0.5 rounded border border-[#1C2534]">
                <Lock className="w-2.5 h-2.5" />
                Permanent
              </span>
            </div>

            <div className="relative flex items-center">
              <input
                type="text"
                readOnly
                value={isGeneratingName ? 'Generating handle...' : generatedAlias}
                className="w-full bg-[#0E131C] border border-[#1C2534] text-xs font-mono text-[#F0F4F8] pl-3.5 pr-10 py-2.5 rounded-md focus:outline-none select-none cursor-default placeholder-[#57657A]"
              />
              <button
                type="button"
                onClick={() => fetchAiName(selectedAvatarId, selectedGender)}
                disabled={isGeneratingName}
                title="Generate another handle"
                className="absolute right-2 p-1.5 text-[#8A99AD] hover:text-[#38BDF8] hover:bg-[#141C28] rounded-md transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingName ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {nameGenError ? (
              <p className="text-[11px] text-rose-400 mt-1.5 flex items-center gap-1">
                <span>{nameGenError}</span>
              </p>
            ) : (
              <p className="text-[10px] text-[#57657A] mt-1">
                Handles are auto-generated to protect anonymity and cannot be manually modified.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setSignupStep(1)}
              className="py-2.5 px-3 border border-[#1C2534] hover:border-[#2E3C52] text-xs text-[#8A99AD] hover:text-[#F0F4F8] rounded-md transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={!generatedAlias.trim() || isGeneratingName}
              className="flex-1 py-2.5 bg-[#141C28] hover:bg-[#1A2536] border border-[#232F42] text-sm font-medium text-[#F0F4F8] rounded-md transition-colors disabled:opacity-50 cursor-pointer"
            >
              Continue
            </button>
          </div>
        </form>
      )}

      {/* SIGNUP STEP 3: Connecting with server animation */}
      {signupStep === 3 && (
        <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative flex items-center justify-center w-12 h-12">
            <div className="w-10 h-10 rounded-full border-2 border-[#1C2534] border-t-[#38BDF8] animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-[#F0F4F8]">Connecting with server...</h3>
            <p className="text-xs text-[#57657A] mt-1">Creating your anonymous identity</p>
          </div>

          {errorMsg && (
            <div className="mt-2 w-full p-2.5 rounded bg-[#1A0E12] border border-[#3D1E22] text-xs text-rose-400">
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => setSignupStep(2)}
                className="block mt-2 underline text-[#F0F4F8] cursor-pointer"
              >
                Go back & try again
              </button>
            </div>
          )}
        </div>
      )}
    </AuthFormSplitScreen>
  );
}
