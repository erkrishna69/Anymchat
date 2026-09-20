import crypto from 'crypto';

export class PasswordUtil {
  public static hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 25000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  public static verifyPassword(password: string, combinedHash: string): boolean {
    try {
      const parts = combinedHash.split(':');
      if (parts.length !== 2) return false;
      const [salt, originalHash] = parts;
      const calculatedHash = crypto.pbkdf2Sync(password, salt, 25000, 64, 'sha512').toString('hex');
      
      const bufA = Buffer.from(calculatedHash, 'utf8');
      const bufB = Buffer.from(originalHash, 'utf8');
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }
}

