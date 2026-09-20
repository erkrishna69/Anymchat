import { createHash } from 'crypto';
import { ReferralModel } from '../../models/referral/referral.model';
import { ReferralEventModel } from '../../models/referral/referralEvent.model';
import { UserModel } from '../../models/user/user.model';
import { getMongoConnectionStatus } from '../../config/database/mongo.config';

// In-memory fallback stores
const inMemoryReferrals = new Map<string, any>(); // referredAnonymousId → referral doc
const inMemoryEvents: any[] = [];
// Rate-limit: ipHash+code → last-open timestamp
const openRateLimitCache = new Map<string, number>();

export class ReferralRepository {
  /** Generate a unique referral code in format XX-XXXXXX */
  public static async generateUniqueCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let attempt = 0; attempt < 10; attempt++) {
      const prefix = Array.from({ length: 2 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const suffix = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const code = `${prefix}-${suffix}`;
      const exists = await this.findByCode(code);
      if (!exists) return code;
    }
    throw new Error('Failed to generate unique referral code');
  }

  /** Find who owns this referral code */
  public static async findByCode(code: string): Promise<any | null> {
    const normalized = code.toUpperCase();
    if (getMongoConnectionStatus()) {
      try {
        return await UserModel.findOne({ referralCode: normalized });
      } catch (_) {}
    }
    for (const u of (global as any).__inMemoryUsers?.values?.() ?? []) {
      if (u.referralCode === normalized) return u;
    }
    return null;
  }

  /** Record a LINK_OPENED event — rate limited: 1 per IP+code per 24h */
  public static async recordOpen(referralCode: string, referrerAnonymousId: string, ip: string): Promise<boolean> {
    const ipHash = createHash('sha256').update(ip + referralCode).digest('hex').slice(0, 16);
    const cacheKey = `${ipHash}:${referralCode}`;
    const lastOpen = openRateLimitCache.get(cacheKey);
    if (lastOpen && Date.now() - lastOpen < 24 * 60 * 60 * 1000) return false; // already recorded
    openRateLimitCache.set(cacheKey, Date.now());

    const event = { referralCode, referrerAnonymousId, eventType: 'LINK_OPENED', ipHash, timestamp: new Date() };
    if (getMongoConnectionStatus()) {
      try {
        await ReferralEventModel.create(event);
        return true;
      } catch (_) {}
    }
    inMemoryEvents.push(event);
    return true;
  }

  /** Attribute a referral on successful registration */
  public static async attributeReferral(params: {
    referralCode: string;
    referrerAnonymousId: string;
    referredAnonymousId: string;
  }): Promise<boolean> {
    const { referralCode, referrerAnonymousId, referredAnonymousId } = params;

    // Self-referral guard
    if (referrerAnonymousId === referredAnonymousId) return false;

    const doc = {
      referralCode,
      referrerAnonymousId,
      referredAnonymousId,
      status: 'REGISTERED',
      registeredAt: new Date(),
    };

    if (getMongoConnectionStatus()) {
      try {
        await ReferralModel.create(doc);
        await ReferralEventModel.create({
          referralCode,
          referrerAnonymousId,
          eventType: 'REGISTERED',
          userId: referredAnonymousId,
          timestamp: new Date(),
        });
        return true;
      } catch (err: any) {
        // Duplicate key (referredAnonymousId already attributed) → silent fail
        if (err.code === 11000) return false;
        throw err;
      }
    }

    // In-memory fallback
    if (inMemoryReferrals.has(referredAnonymousId)) return false;
    inMemoryReferrals.set(referredAnonymousId, doc);
    inMemoryEvents.push({ ...doc, eventType: 'REGISTERED', timestamp: new Date() });
    return true;
  }

  /** Count how many users this referral code has brought in */
  public static async countReferrals(referrerAnonymousId: string): Promise<number> {
    if (getMongoConnectionStatus()) {
      try {
        return await ReferralModel.countDocuments({ referrerAnonymousId });
      } catch (_) {}
    }
    let count = 0;
    for (const r of inMemoryReferrals.values()) {
      if (r.referrerAnonymousId === referrerAnonymousId) count++;
    }
    return count;
  }
}
