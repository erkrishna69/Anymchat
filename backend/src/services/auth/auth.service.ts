import { v4 as uuidv4 } from 'uuid';
import { AliasGeneratorService } from '../alias/aliasGenerator.service';
import { UserRepository } from '../../repositories/user/user.repository';
import { generateUserToken, verifyUserToken } from '../../utils/crypto/token.util';
import { PasswordUtil } from '../../utils/hash/password.util';
import { AiHookService } from '../ai/aiHook.service';
import { ReferralRepository } from '../../repositories/referral/referral.repository';
import { ReferralService } from '../referral/referral.service';

export class AuthService {
  public static async createAnonymousUser(params?: {
    alias?: string;
    avatarId?: number;
    gender?: 'male' | 'female' | 'other';
  }): Promise<{ user: any; token: string }> {
    const anonymousId = `anon_${uuidv4().substring(0, 8)}`;
    const avatarId = params?.avatarId || 1;
    const gender = params?.gender || 'other';
    const alias =
      params?.alias && params.alias.trim().length > 0
        ? params.alias.trim()
        : await AiHookService.generateUniqueName(undefined, avatarId, gender);
    const avatarColor = AliasGeneratorService.generateAvatarColor();

    const user = await UserRepository.createOrUpdate({
      anonymousId,
      alias,
      avatarColor,
      avatarId,
      gender,
    });

    const token = generateUserToken({ anonymousId, alias, gender, avatarId });
    return { user, token };
  }

  public static async generateUniqueName(
    seed?: string,
    avatarId?: number,
    gender: 'male' | 'female' | 'other' = 'other'
  ): Promise<string> {
    return await AiHookService.generateUniqueName(seed, avatarId, gender);
  }

  public static async signup(
    email: string,
    password: string,
    avatarId: number = 1,
    requestedAlias?: string,
    gender: 'male' | 'female' | 'other' = 'other',
    referredByCode?: string
  ): Promise<{ user: any; token: string }> {
    const normalizedEmail = email.trim().toLowerCase();

    // Check 24-hour deletion cooldown
    const cooldown = await UserRepository.findActiveDeletionCooldown(normalizedEmail);
    if (cooldown) {
      const remainingMs = cooldown.expiresAt.getTime() - Date.now();
      const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
      const remainingMinutes = Math.ceil((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const timeStr = remainingHours > 0 
        ? `${remainingHours} hour(s) and ${remainingMinutes} minute(s)` 
        : `${remainingMinutes} minute(s)`;
      throw new Error(
        `This email was recently used for a deleted account. You cannot create a new account with this email for 24 hours (${timeStr} remaining).`
      );
    }

    const existing = await UserRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new Error('An account with this email already exists');
    }

    const passwordHash = PasswordUtil.hashPassword(password);
    const anonymousId = `anon_${uuidv4().substring(0, 8)}`;

    const alias = requestedAlias && requestedAlias.trim().length > 0
      ? requestedAlias.trim()
      : await AiHookService.generateUniqueName(undefined, avatarId, gender);

    const avatarColor = AliasGeneratorService.generateAvatarColor();

    // Generate unique referral code for this new user
    const referralCode = await ReferralRepository.generateUniqueCode();

    // Resolve referredBy if a code was passed
    let referredBy: string | undefined;
    if (referredByCode) {
      const resolved = await ReferralService.resolveCode(referredByCode);
      if (resolved) referredBy = resolved.referrerAnonymousId;
    }

    const user = await UserRepository.createWithAccount({
      email: normalizedEmail,
      passwordHash,
      anonymousId,
      alias,
      avatarColor,
      avatarId: avatarId || 1,
      gender: gender || 'other',
      referralCode,
      referredBy,
    });

    // Attribute referral in background (non-blocking)
    if (referredByCode && referredBy) {
      ReferralService.attributeReferral(anonymousId, referredByCode).catch(() => {});
    }

    const token = generateUserToken({ anonymousId, alias, gender: user.gender || gender || 'other', avatarId: user.avatarId || avatarId || 1 });
    return {
      user: {
        anonymousId: user.anonymousId,
        alias: user.alias,
        avatarColor: user.avatarColor,
        avatarId: user.avatarId || avatarId || 1,
        gender: user.gender || gender || 'other',
        email: user.email,
      },
      token,
    };
  }

  public static async login(email: string, password: string): Promise<{ user: any; token: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await UserRepository.findByEmail(normalizedEmail);
    if (!user || !user.passwordHash) {
      throw new Error('Invalid email or password');
    }

    const isMatch = PasswordUtil.verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    const token = generateUserToken({ anonymousId: user.anonymousId, alias: user.alias, gender: user.gender || 'other', avatarId: user.avatarId || 1 });
    return {
      user: {
        anonymousId: user.anonymousId,
        alias: user.alias,
        avatarColor: user.avatarColor,
        avatarId: user.avatarId || 1,
        email: user.email,
      },
      token,
    };
  }

  public static async authenticateToken(token: string): Promise<any | null> {
    const payload = verifyUserToken(token);
    if (!payload) return null;

    const user = await UserRepository.findByAnonymousId(payload.anonymousId);
    return (
      user || {
        anonymousId: payload.anonymousId,
        alias: payload.alias,
        avatarColor: '#6366F1',
        avatarId: 1,
      }
    );
  }

  public static async updateAlias(anonymousId: string, newAlias?: string): Promise<any> {
    const generated =
      newAlias && newAlias.trim().length > 0
        ? newAlias.trim()
        : await AiHookService.generateUniqueName();
    return await UserRepository.updateAlias(anonymousId, generated);
  }

  public static async deleteAccount(anonymousId: string): Promise<{ success: boolean; message: string }> {
    const user = await UserRepository.findByAnonymousId(anonymousId);
    if (!user) {
      throw new Error('User account not found');
    }

    if (user.email) {
      await UserRepository.recordAccountDeletion(user.email, anonymousId);
    }

    await UserRepository.deleteUser(anonymousId);
    return {
      success: true,
      message: 'Account deleted successfully. You cannot create a new account with this email for 24 hours.',
    };
  }
}
