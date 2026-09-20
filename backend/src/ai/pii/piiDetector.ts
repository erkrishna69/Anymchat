import { PiiGuard } from './pii-guard';
import { PII_PATTERNS } from './patterns.regex';
import { TextNormalizer } from '../preprocessor/textNormalizer';
import { PiiDetectionResult } from '../types/ai.types';

// Shared instance for stateful cross-message detection
const piiGuardInstance = new PiiGuard({
  maxLen: 2000,
  looseSplit: true,
  windowMs: 5 * 60 * 1000, // 5 min cross-message window
  maxEntries: 10,
});

export class PiiDetector {
  /**
   * Scans content deeply for any personal identifiable information (PII)
   */
  public static scan(content: string, userId?: string): PiiDetectionResult {
    if (!content || content.trim().length === 0) {
      return { hasPii: false };
    }

    // 1. Run Hardened Multi-View PiiGuard (Handles Confusables, Leetspeak, Digit Stream, Devanagari, UPI, Cross-Message)
    const guardRes = piiGuardInstance.scan(content, userId);
    if (guardRes.blocked) {
      const topFinding = guardRes.findings.find((f) => f.severity === 'block') || guardRes.findings[0];
      let reason = 'Personal contact or sensitive PII detected. Doxxing is strictly blocked.';
      if (topFinding) {
        switch (topFinding.type) {
          case 'PHONE':
          case 'PHONE_SPLIT':
            reason = 'Sharing phone numbers or obfuscated digits is prohibited.';
            break;
          case 'PHONE_CROSS_MESSAGE':
            reason = 'Attempting to leak phone numbers across multiple messages is prohibited.';
            break;
          case 'SOCIAL_HANDLE':
          case 'SOCIAL_URL':
            reason = 'Sharing social media handles or profile links is prohibited.';
            break;
          case 'EMAIL':
            reason = 'Sharing personal email addresses is prohibited.';
            break;
          case 'UPI':
            reason = 'Sharing UPI IDs or payment links is prohibited.';
            break;
          case 'SHORT_LINK':
            reason = 'Sharing shortened or tracking links is prohibited.';
            break;
          case 'OVERSIZE':
            reason = 'Message exceeds maximum allowable payload size.';
            break;
        }
      }

      return {
        hasPii: true,
        type: topFinding ? topFinding.type.toLowerCase() : 'pii',
        matched: topFinding?.preview,
        reason,
      };
    }

    const cleanContent = TextNormalizer.cleanInvisibleChars(content);

    // 2. Secondary Link Guard
    if (
      PII_PATTERNS.ANY_URL.test(cleanContent) ||
      PII_PATTERNS.DOMAIN_LINK.test(cleanContent) ||
      PII_PATTERNS.INVITE_OR_LOCAL_URL.test(cleanContent)
    ) {
      return {
        hasPii: true,
        type: 'link',
        reason: 'Sharing website links, URLs, or external invites is strictly prohibited in AnymChat.',
      };
    }

    return { hasPii: false };
  }
}

export { PiiGuard, scanText } from './pii-guard';

