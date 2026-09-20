export class WordLimiter {
  public static readonly MAX_WORDS = 200;

  /**
   * Validates if the message is within the 200 words limit.
   */
  public static checkLength(content: string): { isWithinLimit: boolean; wordCount: number; error?: string } {
    if (!content) {
      return { isWithinLimit: true, wordCount: 0 };
    }

    const trimmed = content.trim();
    if (trimmed.length === 0) {
      return { isWithinLimit: true, wordCount: 0 };
    }

    // Split by whitespace to count words
    const words = trimmed.split(/\s+/);
    const wordCount = words.length;

    if (wordCount > this.MAX_WORDS) {
      return {
        isWithinLimit: false,
        wordCount,
        error: `Message exceeds the maximum limit of ${this.MAX_WORDS} words (Current: ${wordCount} words).`,
      };
    }

    return {
      isWithinLimit: true,
      wordCount,
    };
  }
}
