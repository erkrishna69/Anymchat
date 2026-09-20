import { UserModel, IUserDocument } from '../../models/user/user.model';
import { DeletedAccountModel } from '../../models/user/deletedAccount.model';
import { getMongoConnectionStatus } from '../../config/database/mongo.config';

// In-Memory fallback store
const inMemoryUsers = new Map<string, any>();
const inMemoryDeletedAccounts = new Map<string, { email: string; anonymousId: string; deletedAt: Date; expiresAt: Date }>();

export class UserRepository {
  public static async findByAnonymousId(anonymousId: string): Promise<any | null> {
    if (getMongoConnectionStatus()) {
      try {
        return await UserModel.findOne({ anonymousId });
      } catch (err) {
        // fallback to memory
      }
    }
    return inMemoryUsers.get(anonymousId) || null;
  }

  public static async findByEmail(email: string): Promise<any | null> {
    const normalizedEmail = email.trim().toLowerCase();
    if (getMongoConnectionStatus()) {
      try {
        return await UserModel.findOne({ email: normalizedEmail });
      } catch (err) {
        // fallback to memory
      }
    }
    for (const user of inMemoryUsers.values()) {
      if (user.email === normalizedEmail) {
        return user;
      }
    }
    return null;
  }

  public static async createWithAccount(userData: {
    email: string;
    passwordHash: string;
    anonymousId: string;
    alias: string;
    avatarColor: string;
    avatarId?: number;
    gender?: 'male' | 'female' | 'other';
    referralCode?: string;
    referredBy?: string;
  }): Promise<any> {
    const normalizedEmail = userData.email.trim().toLowerCase();
    const docData: any = {
      email: normalizedEmail,
      passwordHash: userData.passwordHash,
      anonymousId: userData.anonymousId,
      alias: userData.alias,
      avatarColor: userData.avatarColor,
      avatarId: userData.avatarId || 1,
      gender: userData.gender || 'other',
      lastActiveAt: new Date(),
      ...(userData.referralCode ? { referralCode: userData.referralCode } : {}),
      ...(userData.referredBy ? { referredBy: userData.referredBy } : {}),
    };

    if (getMongoConnectionStatus()) {
      try {
        return await UserModel.create(docData);
      } catch (err: any) {
        if (err.code === 11000) {
          if (err.keyPattern?.email || err.message?.includes('email')) {
            throw new Error('An account with this email already exists');
          }
          if (err.keyPattern?.referralCode || err.message?.includes('referralCode')) {
            throw new Error('Referral code collision, please retry');
          }
          throw new Error('Account with these credentials already exists');
        }
        // only fallback to memory if database connection failed
      }
    }

    // In-memory uniqueness check
    for (const u of inMemoryUsers.values()) {
      if (u.email && u.email.trim().toLowerCase() === normalizedEmail) {
        throw new Error('An account with this email already exists');
      }
    }

    inMemoryUsers.set(userData.anonymousId, {
      ...docData,
      _id: userData.anonymousId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return inMemoryUsers.get(userData.anonymousId);
  }

  public static async createOrUpdate(userData: {
    anonymousId: string;
    alias: string;
    avatarColor: string;
    avatarId?: number;
    gender?: 'male' | 'female' | 'other';
    latitude?: number;
    longitude?: number;
  }): Promise<any> {
    const docData: any = {
      anonymousId: userData.anonymousId,
      alias: userData.alias,
      avatarColor: userData.avatarColor,
      avatarId: userData.avatarId || 1,
      gender: userData.gender || 'other',
      lastActiveAt: new Date(),
    };

    if (userData.latitude !== undefined && userData.longitude !== undefined) {
      docData.lastKnownLocation = {
        type: 'Point',
        coordinates: [userData.longitude, userData.latitude],
      };
    }

    if (getMongoConnectionStatus()) {
      try {
        return await UserModel.findOneAndUpdate(
          { anonymousId: userData.anonymousId },
          { $set: docData },
          { upsert: true, new: true }
        );
      } catch (err) {
        // fallback to memory
      }
    }

    inMemoryUsers.set(userData.anonymousId, {
      ...docData,
      _id: userData.anonymousId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return inMemoryUsers.get(userData.anonymousId);
  }

  public static async updateAlias(anonymousId: string, newAlias: string): Promise<any> {
    if (getMongoConnectionStatus()) {
      try {
        return await UserModel.findOneAndUpdate(
          { anonymousId },
          { $set: { alias: newAlias } },
          { new: true }
        );
      } catch (err) {
        // fallback
      }
    }
    const existing = inMemoryUsers.get(anonymousId);
    if (existing) {
      existing.alias = newAlias;
      inMemoryUsers.set(anonymousId, existing);
      return existing;
    }
    return null;
  }

  public static async recordAccountDeletion(email: string, anonymousId: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours cooldown

    if (getMongoConnectionStatus()) {
      try {
        await DeletedAccountModel.create({
          email: normalizedEmail,
          anonymousId,
          deletedAt: now,
          expiresAt,
        });
      } catch (err) {
        // fallback
      }
    }

    inMemoryDeletedAccounts.set(normalizedEmail, {
      email: normalizedEmail,
      anonymousId,
      deletedAt: now,
      expiresAt,
    });
  }

  public static async findActiveDeletionCooldown(email: string): Promise<{ email: string; deletedAt: Date; expiresAt: Date } | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const now = new Date();

    if (getMongoConnectionStatus()) {
      try {
        const found = await DeletedAccountModel.findOne({
          email: normalizedEmail,
          expiresAt: { $gt: now },
        });
        if (found) {
          return {
            email: found.email,
            deletedAt: found.deletedAt,
            expiresAt: found.expiresAt,
          };
        }
      } catch (err) {
        // fallback
      }
    }

    const memRecord = inMemoryDeletedAccounts.get(normalizedEmail);
    if (memRecord && memRecord.expiresAt.getTime() > now.getTime()) {
      return memRecord;
    }
    return null;
  }

  public static async setReferralCode(anonymousId: string, referralCode: string): Promise<void> {
    if (getMongoConnectionStatus()) {
      try {
        await UserModel.updateOne({ anonymousId }, { $set: { referralCode } });
      } catch (_) {}
    }
    const user = inMemoryUsers.get(anonymousId);
    if (user) {
      user.referralCode = referralCode;
      inMemoryUsers.set(anonymousId, user);
    }
  }

  public static async deleteUser(anonymousId: string): Promise<boolean> {
    if (getMongoConnectionStatus()) {
      try {
        await UserModel.deleteOne({ anonymousId });
      } catch (err) {
        // fallback
      }
    }
    return inMemoryUsers.delete(anonymousId);
  }
}
