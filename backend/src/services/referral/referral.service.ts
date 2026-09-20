import { ReferralRepository } from '../../repositories/referral/referral.repository';
import { ENV } from '../../config/env/env.config';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.FRONTEND_URL || 'https://anymchat.kxoproduction.in').replace(/\/$/, '');

export class ReferralService {
  /** Get or create a referral code for a user */
  public static async getOrCreateCode(anonymousId: string, currentCode?: string): Promise<string> {
    if (currentCode) return currentCode;
    return await ReferralRepository.generateUniqueCode();
  }

  /** Resolve a code and return the referrer anonymousId, or null if invalid */
  public static async resolveCode(code: string): Promise<{ referralCode: string; referrerAnonymousId: string } | null> {
    if (!code || code.length < 4) return null;
    const referrer = await ReferralRepository.findByCode(code);
    if (!referrer) return null;
    return {
      referralCode: code.toUpperCase(),
      referrerAnonymousId: referrer.anonymousId,
    };
  }

  /** Build the full invite URL for a given code */
  public static buildInviteUrl(referralCode: string): string {
    return `${APP_URL}/invite/${referralCode}`;
  }

  /** Record that someone opened the link (rate-limited per IP) */
  public static async recordOpen(code: string, ip: string): Promise<void> {
    const resolved = await this.resolveCode(code);
    if (!resolved) return;
    await ReferralRepository.recordOpen(resolved.referralCode, resolved.referrerAnonymousId, ip);
  }

  /** Attribute a successful signup to the referrer */
  public static async attributeReferral(newAnonymousId: string, referralCode: string): Promise<boolean> {
    const resolved = await this.resolveCode(referralCode);
    if (!resolved) return false;
    return await ReferralRepository.attributeReferral({
      referralCode: resolved.referralCode,
      referrerAnonymousId: resolved.referrerAnonymousId,
      referredAnonymousId: newAnonymousId,
    });
  }

  /** Get current user's referral code + invite URL */
  public static async getMyReferralInfo(anonymousId: string, referralCode?: string): Promise<{
    referralCode: string;
    inviteUrl: string;
    totalReferrals: number;
  }> {
    const code = referralCode || (await ReferralRepository.generateUniqueCode());
    const inviteUrl = this.buildInviteUrl(code);
    const totalReferrals = await ReferralRepository.countReferrals(anonymousId);
    return { referralCode: code, inviteUrl, totalReferrals };
  }
}
