import jwt from 'jsonwebtoken';
import { ENV } from '../../config/env/env.config';

export interface TokenPayload {
  anonymousId: string;
  alias: string;
  gender?: 'male' | 'female' | 'other';
  avatarId?: number;
}

export function generateUserToken(payload: TokenPayload): string {
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '30d' });
}

export function verifyUserToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, ENV.JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}
