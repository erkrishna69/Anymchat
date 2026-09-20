import { GeoJSONPoint } from '../location/location.types';

export interface IUser {
  _id: string;
  anonymousId: string;
  alias: string;
  avatarColor: string;
  interests: string[];
  lastKnownLocation?: GeoJSONPoint;
  lastActiveAt: Date;
  isBanned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPublicAnonymousUser {
  anonymousId: string;
  alias: string;
  avatarColor: string;
  avatarId?: number;
  gender?: 'male' | 'female' | 'other';
  interests: string[];
  isOnline: boolean;
  isTimedOut?: boolean;
  timeoutUntil?: number;
  proximityTag: string; // e.g. "Nearby · Within 10 km"
}
