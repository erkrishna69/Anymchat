import { WordLimiter } from './preprocessor/wordLimiter';
import { PiiDetector } from './pii/piiDetector';
import { HandleGenerator } from './generators/handleGenerator';
import { ModerationResult } from './types/ai.types';
import { Logger } from '../utils/logger/logger.util';

export class OrbitEngine {
  private static isInitialized = false;

  /**
   * Initializes Orbit AI Mod & PII Shield on backend startup
   */
  public static initialize(): void {
    if (this.isInitialized) return;

    Logger.info('====================================================');
    Logger.info(' [Orbit AI Engine] Initializing Active Protection System...');
    Logger.info('  [Orbit AI] PII Scanner: Phone numbers, Instagram, Telegram, UPI, Emails');
    Logger.info('  [Orbit AI] Anti-Doxxing & 200-Word Guardrail: ACTIVE');
    Logger.info(' [Orbit AI] Handle Persona Generator: ACTIVE');
    Logger.info('[Orbit AI Engine] Status: ONLINE & MONITORING ALL SOCKETS');
    Logger.info('====================================================');

    this.isInitialized = true;
  }

  /**
   * Evaluates content for real-time safety:
   * 1. 200-word limit check
   * 2. Deep PII / Personal Info Leak detection (Phone numbers, Instagram IDs, socials, emails, UPI)
   * 3. Allows free expression, venting, and community discussions
   */
  public static moderate(content: string, userId?: string): ModerationResult {
    // 1. Word Limit Guard (Max 200 words)
    const lengthCheck = WordLimiter.checkLength(content);
    if (!lengthCheck.isWithinLimit) {
      return {
        isAllowed: false,
        hasPii: false,
        piiType: 'length_exceeded',
        reason: 'Orbit AI: Message exceeds the 200-word limit.',
      };
    }

    // 2. Deep PII / Doxxing Detection with Hardened PiiGuard
    const piiCheck = PiiDetector.scan(content, userId);
    if (piiCheck.hasPii) {
      return {
        isAllowed: false,
        hasPii: true,
        piiType: piiCheck.type,
        reason: `Orbit AI: ${piiCheck.reason || 'Personal contact information detected. Doxxing is strictly blocked.'}`,
        matchedPattern: piiCheck.matched,
      };
    }

    // Free expression allowed
    return {
      isAllowed: true,
      hasPii: false,
    };
  }


  /**
   * Generates a unique anonymous handle matching avatar persona and gender
   */
  public static generateHandle(
    seed?: string,
    avatarId: number = 1,
    gender: 'male' | 'female' | 'other' = 'other'
  ): string {
    return HandleGenerator.generate(avatarId, seed, gender);
  }
}

// Export as both OrbitEngine and AiEngine for seamless integration
export const AiEngine = OrbitEngine;
export * from './types/ai.types';
