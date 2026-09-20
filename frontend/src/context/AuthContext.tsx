'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AnonymousUser } from '../types';
import { ApiService, getAuthToken, setAuthToken } from '../services/api';

interface AuthContextType {
  user: AnonymousUser | null;
  isLoading: boolean;
  isLoggedInWithAccount: boolean;
  changeAlias: (newAlias?: string) => Promise<void>;
  resetIdentity: () => Promise<void>;
  signup: (
    email: string,
    password: string,
    avatarId?: number,
    alias?: string,
    gender?: 'male' | 'female' | 'other',
    referredBy?: string
  ) => Promise<{ success: boolean; error?: string }>;
  createAnonymousProfile: (
    alias?: string,
    avatarId?: number,
    gender?: 'male' | 'female' | 'other'
  ) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AnonymousUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      if (token) {
        const res = await ApiService.getProfile();
        if (res.success && res.user) {
          setUser(res.user);
          setIsLoading(false);
          return;
        }
      }
      setUser(null);
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const resetIdentity = async () => {
    try {
      const res = await ApiService.createAnonymousUser();
      if (res.success) {
        setAuthToken(res.token);
        setUser(res.user);
      }
    } catch (err) {
      console.error('Failed to create anonymous identity', err);
    }
  };

  const signup = async (
    email: string,
    password: string,
    avatarId?: number,
    alias?: string,
    gender?: 'male' | 'female' | 'other',
    referredBy?: string
  ) => {
    try {
      const res = await ApiService.signup(email, password, avatarId, alias, gender, referredBy);
      if (res.success && res.user) {
        setAuthToken(res.token);
        setUser(res.user);
        return { success: true };
      }
      return { success: false, error: 'Signup failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Signup failed' };
    }
  };

  const createAnonymousProfile = async (
    alias?: string,
    avatarId?: number,
    gender?: 'male' | 'female' | 'other'
  ) => {
    try {
      const res = await ApiService.createAnonymousUser({ alias, avatarId, gender });
      if (res.success && res.user) {
        setAuthToken(res.token);
        setUser(res.user);
        return { success: true };
      }
      return { success: false, error: 'Failed to create profile' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create profile' };
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await ApiService.login(email, password);
      if (res.success && res.user) {
        setAuthToken(res.token);
        setUser(res.user);
        return { success: true };
      }
      return { success: false, error: 'Invalid credentials' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const logout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('anym_auth_token');
    }
    setUser(null);
  };

  const deleteAccount = async () => {
    try {
      const res = await ApiService.deleteAccount();
      if (res.success) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('anym_auth_token');
        }
        setUser(null);
        return { success: true };
      }
      return { success: false, error: 'Failed to delete account' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete account' };
    }
  };

  const changeAlias = async (newAlias?: string) => {
    try {
      const res = await ApiService.updateAlias(newAlias);
      if (res.success && res.user) {
        setUser((prev) => ({
          ...prev!,
          alias: res.user.alias,
          avatarColor: res.user.avatarColor,
        }));
      }
    } catch (err) {
      console.error('Failed to update alias', err);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoggedInWithAccount: !!user?.email,
        changeAlias,
        resetIdentity,
        signup,
        createAnonymousProfile,
        login,
        logout,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
