import { GENDER_VOCABULARY, GenderType } from './vocabulary.data';

export class HandleGenerator {
  /**
   * Generates a unique, cool anonymous handle tailored to gender (male, female, other) and avatar
   */
  public static generate(avatarId: number = 1, seed?: string, gender: GenderType = 'other'): string {
    const validGender: GenderType =
      gender && (['male', 'female', 'other'].includes(gender.toLowerCase()) as boolean)
        ? (gender.toLowerCase() as GenderType)
        : 'other';

    const vocab = GENDER_VOCABULARY[validGender] || GENDER_VOCABULARY.other;

    // Pick random adjective and noun tailored to gender
    const adj = vocab.adjectives[Math.floor(Math.random() * vocab.adjectives.length)];
    const noun = vocab.nouns[Math.floor(Math.random() * vocab.nouns.length)];

    // Generate clean 3 digit suffix
    const num = Math.floor(100 + Math.random() * 900); // 100 - 999

    return `${adj}${noun}_${num}`;
  }
}
