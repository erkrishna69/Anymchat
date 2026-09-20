const ADJECTIVES = [
  'Night', 'Shadow', 'Silent', 'Cosmic', 'Solar', 'Velvet', 'Mystic', 'Echo',
  'Frost', 'Neon', 'Stealth', 'Hyper', 'Lunar', 'Crimson', 'Silver', 'Amber',
  'Thunder', 'Brave', 'Drift', 'Ghost', 'Urban', 'Cobalt', 'Vortex', 'Pulse'
];

const NOUNS = [
  'Fox', 'Wolf', 'Owl', 'Falcon', 'Panther', 'Raven', 'Tiger', 'Viper',
  'Lynx', 'Bear', 'Phoenix', 'Dragon', 'Hawk', 'Badger', 'Puma', 'Cobra',
  'Cheetah', 'Eagle', 'Otter', 'Jaguar', 'Shark', 'Wolverine', 'Sphinx', 'Nomad'
];

const AVATAR_COLORS = [
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#14B8A6', // Teal
  '#F97316', // Orange
];

export class AliasGeneratorService {
  public static generateAlias(): string {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num = Math.floor(100 + Math.random() * 900);
    return `${adj}${noun}_${num}`;
  }

  public static generateAvatarColor(): string {
    return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  }
}
