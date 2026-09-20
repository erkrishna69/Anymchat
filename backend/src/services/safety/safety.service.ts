import { SafetyRepository } from '../../repositories/safety/safety.repository';
import { ENV } from '../../config/env/env.config';

// In-memory rate limiter per anonymousId
const userMessageTimestamps = new Map<string, number[]>();

// In-memory Progressive Timeout Tracker (Strike 1: 5min, Strike 2: 25min, Strike 3+: 60min)
interface UserViolationState {
  violationCount: number;
  timeoutUntil: number;
  lastReason: string;
}
const userViolations = new Map<string, UserViolationState>();

// In-memory message history for spam/flood detection
interface RecentMessageRecord {
  timestamp: number;
  content: string;
}
const userMessageHistory = new Map<string, RecentMessageRecord[]>();

export class SafetyService {
  /**
   * Checks if user is exceeding basic HTTP rate limits
   */
  public static isRateLimited(anonymousId: string): boolean {
    const now = Date.now();
    const timestamps = userMessageTimestamps.get(anonymousId) || [];
    const recent = timestamps.filter((t) => now - t < 5000);
    if (recent.length >= 10) {
      return true;
    }
    recent.push(now);
    userMessageTimestamps.set(anonymousId, recent);
    return false;
  }

  /**
   * Applies progressive timeout (5 min -> 25 min -> 60 min) on policy violations (Links, PII, Doxxing, Spam Floods)
   */
  public static recordViolation(anonymousId: string, reason: string): {
    violationCount: number;
    timeoutMinutes: number;
    timeoutUntil: number;
    message: string;
  } {
    const existing = userViolations.get(anonymousId) || {
      violationCount: 0,
      timeoutUntil: 0,
      lastReason: '',
    };

    const newCount = existing.violationCount + 1;
    let timeoutMinutes = 5;
    if (newCount === 2) {
      timeoutMinutes = 25;
    } else if (newCount >= 3) {
      timeoutMinutes = 60;
    }

    const timeoutUntil = Date.now() + timeoutMinutes * 60 * 1000;
    userViolations.set(anonymousId, {
      violationCount: newCount,
      timeoutUntil,
      lastReason: reason,
    });

    const message = `🛡️ [Orbit AI] Violation #${newCount}: You are timed out for ${timeoutMinutes} minutes. (${reason})`;
    return {
      violationCount: newCount,
      timeoutMinutes,
      timeoutUntil,
      message,
    };
  }

  /**
   * Resets all timeouts (used on server restarts)
   */
  public static clearAllTimeouts(): void {
    userViolations.clear();
    userMessageTimestamps.clear();
    userMessageHistory.clear();
  }

  /**
   * Checks if user is currently under active Orbit AI timeout
   */
  public static getTimeoutStatus(anonymousId: string): {
    isTimedOut: boolean;
    remainingSeconds: number;
    remainingMinutes: number;
    violationCount: number;
    message?: string;
  } {
    const state = userViolations.get(anonymousId);
    if (!state) return { isTimedOut: false, remainingSeconds: 0, remainingMinutes: 0, violationCount: 0 };

    const now = Date.now();
    if (now < state.timeoutUntil) {
      const remainingSeconds = Math.ceil((state.timeoutUntil - now) / 1000);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      const message = `🛡️ [Orbit AI] You are timed out for ${remainingMinutes}m ${remainingSeconds % 60}s (Strike ${state.violationCount}). Reason: ${state.lastReason}`;
      return {
        isTimedOut: true,
        remainingSeconds,
        remainingMinutes,
        violationCount: state.violationCount,
        message,
      };
    }

    return { isTimedOut: false, remainingSeconds: 0, remainingMinutes: 0, violationCount: state.violationCount };
  }

  /**
   * Real-time Anti-Spam Guard:
   * 1. Burst flood: > 4 messages in 5 seconds
   * 2. Message flood: > 10 messages in 60 seconds
   * 3. Repetitive spam: 3 identical messages in a row
   * Automatically triggers progressive Orbit AI timeout (5m -> 25m -> 60m)
   */
  public static checkSpam(
    anonymousId: string,
    content: string
  ): { isSpam: boolean; penalty?: ReturnType<typeof SafetyService.recordViolation> } {
    const now = Date.now();
    const history = userMessageHistory.get(anonymousId) || [];
    const recent = history.filter((m) => now - m.timestamp < 60000);

    // Check burst spam (> 4 messages in 5 seconds)
    const burstMessages = recent.filter((m) => now - m.timestamp < 5000);
    if (burstMessages.length >= 4) {
      const penalty = this.recordViolation(anonymousId, 'Rapid message flooding & spamming');
      return { isSpam: true, penalty };
    }

    // Check sustained flood (> 10 messages in 60 seconds)
    if (recent.length >= 10) {
      const penalty = this.recordViolation(anonymousId, 'Excessive messaging flood (Max 10 per minute)');
      return { isSpam: true, penalty };
    }

    // Check repetitive duplicate spam (3 identical messages in under 30s)
    const normalized = content.trim().toLowerCase();
    const recentIdentical = recent.filter(
      (m) => now - m.timestamp < 30000 && m.content.trim().toLowerCase() === normalized
    );
    if (recentIdentical.length >= 2) {
      const penalty = this.recordViolation(anonymousId, 'Repetitive duplicate message spam');
      return { isSpam: true, penalty };
    }

    recent.push({ timestamp: now, content });
    userMessageHistory.set(anonymousId, recent);
    return { isSpam: false };
  }

  public static async fileReport(params: {
    reporterAnonymousId: string;
    reportedAnonymousId: string;
    messageId?: string;
    reason: string;
    additionalDetails?: string;
  }) {
    return await SafetyRepository.createReport(params);
  }

  public static async blockUser(blockerId: string, blockedId: string): Promise<boolean> {
    return await SafetyRepository.blockUser(blockerId, blockedId);
  }

  public static async unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
    return await SafetyRepository.unblockUser(blockerId, blockedId);
  }

  public static async getBlockedUsers(blockerId: string): Promise<string[]> {
    return await SafetyRepository.getBlockedUserIds(blockerId);
  }
}
