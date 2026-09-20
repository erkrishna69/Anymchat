import { OrbitEngine } from '../../ai';
import { Logger } from '../../utils/logger/logger.util';

export class AiHookService {
  /**
   * Generates a unique cool anonymous handle using Orbit AI Persona Engine
   */
  public static async generateUniqueName(
    seed?: string,
    avatarId: number = 1,
    gender: 'male' | 'female' | 'other' = 'other'
  ): Promise<string> {
    try {
      const alias = OrbitEngine.generateHandle(seed, avatarId, gender);
      Logger.info(`🛡️ [Orbit AI Engine] Generated handle: ${alias} (Avatar: ${avatarId}, Gender: ${gender})`);
      return alias;
    } catch (err) {
      Logger.error('🛡️ [Orbit AI Engine] Failed generating handle, using fallback', err);
      return `Resident_${Math.floor(100 + Math.random() * 900)}`;
    }
  }

  /**
   * Realtime Content Moderation hook powered by Orbit AI Engine
   * Validates: 200-word limit, deep PII / contact / phone / social media leaks
   */
  public static async moderateContent(
    content: string,
    authorId?: string
  ): Promise<{ isAllowed: boolean; reason?: string }> {
    const result = OrbitEngine.moderate(content, authorId);
    if (!result.isAllowed) {
      Logger.warn(`🛡️ [Orbit AI Guard] Blocked message from ${authorId || 'unknown'}: ${result.reason}`);
      return {
        isAllowed: false,
        reason: result.reason,
      };
    }


    return { isAllowed: true };
  }
}
