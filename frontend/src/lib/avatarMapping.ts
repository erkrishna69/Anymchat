// Helper to deterministically resolve avatar image URLs and gender themes for users

const PRESET_AVATARS: Record<string, string> = {
  'NightFox_482': '/avatars/avatar-1.jpg',
  'Silent_739': '/avatars/avatar-2.jpg',
  'Moon_193': '/avatars/avatar-3.jpg',
  'Cherry_671': '/avatars/avatar-2.jpg',
  'Pixel_302': '/avatars/avatar-1.jpg',
  'Zen_884': '/avatars/avatar-3.jpg',
  'Star_219': '/avatars/avatar-1.jpg',
  'Wave_556': '/avatars/avatar-2.jpg',
};

const PRESET_GENDERS: Record<string, 'male' | 'female' | 'other'> = {
  'NightFox_482': 'male',
  'Silent_739': 'female',
  'Moon_193': 'male',
  'Cherry_671': 'female',
  'Pixel_302': 'male',
  'Zen_884': 'male',
  'Star_219': 'female',
  'Wave_556': 'male',
};

export function getAvatarUrl(
  alias?: string,
  avatarId?: number,
  customUrl?: string
): string {
  if (customUrl) return customUrl;

  if (avatarId === 1) return '/avatars/avatar-1.jpg';
  if (avatarId === 2) return '/avatars/avatar-2.jpg';
  if (avatarId === 3) return '/avatars/avatar-3.jpg';

  if (alias && PRESET_AVATARS[alias]) {
    return PRESET_AVATARS[alias];
  }

  // Deterministic fallback based on alias hash
  if (alias) {
    let hash = 0;
    for (let i = 0; i < alias.length; i++) {
      hash = (hash << 5) - hash + alias.charCodeAt(i);
      hash |= 0;
    }
    const idx = (Math.abs(hash) % 3) + 1;
    return `/avatars/avatar-${idx}.jpg`;
  }

  return '/avatars/avatar-1.jpg';
}

export function resolveGender(
  alias?: string,
  gender?: 'male' | 'female' | 'other'
): 'male' | 'female' | 'other' {
  if (gender) return gender;
  if (alias && PRESET_GENDERS[alias]) {
    return PRESET_GENDERS[alias];
  }
  return 'male';
}

export function getGenderStyles(gender: 'male' | 'female' | 'other' = 'male') {
  if (gender === 'female') {
    return {
      nameColor: 'text-[#F472B6]', // Vibrant Pink
      textColor: 'text-[#FBCFE8]', // Soft readable rose-pink text
      avatarBorder: 'border-[#F472B6]/60 ring-1 ring-[#F472B6]/40',
      badgeBg: 'bg-pink-950/60 text-pink-300 border border-pink-700/50',
      hoverBg: 'hover:bg-pink-950/20',
    };
  }

  if (gender === 'other') {
    return {
      nameColor: 'text-[#A78BFA]', // Purple
      textColor: 'text-[#DDD6FE]', // Soft readable purple text
      avatarBorder: 'border-[#A78BFA]/60 ring-1 ring-[#A78BFA]/40',
      badgeBg: 'bg-purple-950/60 text-purple-300 border border-purple-700/50',
      hoverBg: 'hover:bg-purple-950/20',
    };
  }

  // Male
  return {
    nameColor: 'text-[#38BDF8]', // Vibrant Sky Blue
    textColor: 'text-[#BAE6FD]', // Soft readable cyan-blue text
    avatarBorder: 'border-[#38BDF8]/60 ring-1 ring-[#38BDF8]/40',
    badgeBg: 'bg-sky-950/60 text-sky-300 border border-sky-700/50',
    hoverBg: 'hover:bg-sky-950/20',
  };
}
