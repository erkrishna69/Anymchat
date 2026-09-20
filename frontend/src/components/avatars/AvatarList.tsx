'use client';

import React from 'react';

export interface AvatarItem {
  id: number;
  name: string;
  gradient: string;
  borderGlow: string;
  accentColor: string;
  iconSvg: React.ReactNode;
}

export const AVATAR_COLLECTION: AvatarItem[] = [
  {
    id: 1,
    name: 'Cyber Fox',
    gradient: 'from-indigo-600 via-blue-600 to-cyan-500',
    borderGlow: 'ring-indigo-500/50 shadow-indigo-500/30',
    accentColor: '#6366F1',
    iconSvg: (
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* Fox Mask */}
        <path d="M4 8L9 3L12 7L15 3L20 8L16 14L12 21L8 14L4 8Z" fill="rgba(255,255,255,0.2)" />
        <circle cx="9" cy="11" r="1.5" fill="#FFFFFF" />
        <circle cx="15" cy="11" r="1.5" fill="#FFFFFF" />
      </svg>
    ),
  },
  {
    id: 2,
    name: 'Phantom Ghost',
    gradient: 'from-purple-600 via-violet-600 to-fuchsia-500',
    borderGlow: 'ring-purple-500/50 shadow-purple-500/30',
    accentColor: '#8B5CF6',
    iconSvg: (
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* Ghost Shape */}
        <path d="M12 3C7.58 3 4 6.58 4 11V20L7 18L10 20L12 18L14 20L17 18L20 20V11C20 6.58 16.42 3 12 3Z" fill="rgba(255,255,255,0.2)" />
        <circle cx="9" cy="10" r="1.5" fill="#FFFFFF" />
        <circle cx="15" cy="10" r="1.5" fill="#FFFFFF" />
      </svg>
    ),
  },
  {
    id: 3,
    name: 'Stealth Nomad',
    gradient: 'from-emerald-600 via-teal-600 to-green-500',
    borderGlow: 'ring-emerald-500/50 shadow-emerald-500/30',
    accentColor: '#10B981',
    iconSvg: (
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* Stealth Hood */}
        <path d="M12 2L4 7V17L12 22L20 17V7L12 2Z" fill="rgba(255,255,255,0.15)" />
        <line x1="8" y1="11" x2="16" y2="11" stroke="#FFFFFF" strokeWidth="2.5" />
      </svg>
    ),
  },
  {
    id: 4,
    name: 'Solar Phoenix',
    gradient: 'from-amber-500 via-orange-600 to-rose-500',
    borderGlow: 'ring-amber-500/50 shadow-amber-500/30',
    accentColor: '#F59E0B',
    iconSvg: (
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* Flame Wings */}
        <path d="M12 3L14.5 8.5L20 9.5L16 14L17 20L12 17L7 20L8 14L4 9.5L9.5 8.5L12 3Z" fill="rgba(255,255,255,0.2)" />
        <circle cx="12" cy="12" r="2" fill="#FFFFFF" />
      </svg>
    ),
  },
  {
    id: 5,
    name: 'Shadow Panther',
    gradient: 'from-slate-700 via-slate-800 to-blue-950',
    borderGlow: 'ring-blue-500/40 shadow-blue-500/20',
    accentColor: '#3B82F6',
    iconSvg: (
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* Cat/Panther Eyes */}
        <path d="M5 6L8 10H16L19 6V14L12 20L5 14V6Z" fill="rgba(255,255,255,0.15)" />
        <ellipse cx="8.5" cy="11.5" rx="1.5" ry="2" fill="#38BDF8" />
        <ellipse cx="15.5" cy="11.5" rx="1.5" ry="2" fill="#38BDF8" />
      </svg>
    ),
  },
  {
    id: 6,
    name: 'Velvet Viper',
    gradient: 'from-pink-600 via-rose-600 to-red-500',
    borderGlow: 'ring-pink-500/50 shadow-pink-500/30',
    accentColor: '#EC4899',
    iconSvg: (
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* Viper Shield */}
        <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" fill="rgba(255,255,255,0.2)" />
        <path d="M10 10L12 14L14 10" stroke="#FFFFFF" strokeWidth="2.5" />
      </svg>
    ),
  },
];

export function getAvatarById(id?: number): AvatarItem {
  const found = AVATAR_COLLECTION.find((a) => a.id === id);
  return found || AVATAR_COLLECTION[0];
}

interface AvatarBadgeProps {
  avatarId?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const AvatarBadge: React.FC<AvatarBadgeProps> = ({
  avatarId = 1,
  size = 'md',
  className = '',
}) => {
  const avatar = getAvatarById(avatarId);

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div
      className={`relative rounded-full bg-gradient-to-tr ${avatar.gradient} text-white shadow-md flex items-center justify-center ring-1 ring-white/20 flex-shrink-0 ${sizeClasses[size]} ${className}`}
    >
      {avatar.iconSvg}
    </div>
  );
};
