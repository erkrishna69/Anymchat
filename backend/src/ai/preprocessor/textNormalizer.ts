export class TextNormalizer {
  private static WORD_TO_DIGIT_MAP: Record<string, string> = {
    // English words
    zero: '0',
    one: '1',
    two: '2',
    three: '3',
    four: '4',
    five: '5',
    six: '6',
    seven: '7',
    eight: '8',
    nine: '9',
    // Hindi / Hinglish words
    shunya: '0',
    ek: '1',
    do: '2',
    teen: '3',
    char: '4',
    chaar: '4',
    paanch: '5',
    panch: '5',
    chhe: '6',
    che: '6',
    saat: '7',
    sat: '7',
    aath: '8',
    ath: '8',
    nau: '9',
    no: '9',
  };

  /**
   * Cleans zero-width chars and invisible unicode junk
   */
  public static cleanInvisibleChars(text: string): string {
    return text.replace(/[\u200B-\u200D\uFEFF\u00AD\u2060]/g, '');
  }

  /**
   * Converts word-digits like "nine eight seven" or "nau aath saat" into numerical digits "987..."
   */
  public static normalizeSpelledNumbers(text: string): string {
    let normalized = text.toLowerCase();

    // Replace word digits preceded or followed by word boundaries
    for (const [word, digit] of Object.entries(this.WORD_TO_DIGIT_MAP)) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      normalized = normalized.replace(regex, digit);
    }

    return normalized;
  }

  /**
   * Collapses digits separated by spaces, dots, hyphens, or commas
   * Example: "9 8 7 6 - 5 4 3 . 2 1 0" -> "9876543210"
   */
  public static extractCollapsedDigits(text: string): string[] {
    // Find sequences where digits are grouped with spaces or separators
    const digitGroupRegex = /(?:\+?91[\s.-]*)?(?:[6-9][\s.-]*){1}(?:\d[\s.-]*){9}/g;
    const matches = text.match(digitGroupRegex);
    if (!matches) return [];

    return matches.map((m) => m.replace(/[\s.-]/g, '').replace(/^\+?91/, ''));
  }
}
