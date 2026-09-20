export interface AnonymousUser {
  anonymousId: string;
  alias: string;
  avatarColor: string;
  avatarId?: number;
  gender?: 'male' | 'female' | 'other';
  email?: string;
  interests?: string[];
}

export interface IPublicFeedMessage {
  id: string;
  senderAnonymousId: string;
  senderAlias: string;
  senderAvatarColor: string;
  senderGender?: 'male' | 'female' | 'other';
  avatarId?: number;
  content: string;
  replyTo?: {
    messageId: string;
    senderAlias: string;
    content: string;
  };
  createdAt: string;
  proximityTag: string; // "Nearby (< 10km)"
}

export interface IPublicDirectMessage {
  id: string;
  senderAnonymousId: string;
  recipientAnonymousId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  isMine?: boolean;
}

export interface IPublicNearbyUser {
  anonymousId: string;
  alias: string;
  avatarColor: string;
  avatarId?: number;
  gender?: 'male' | 'female' | 'other';
  interests: string[];
  isOnline: boolean;
  isTimedOut?: boolean;
  timeoutUntil?: number;
  proximityTag: string;
}

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  radiusKm: number;
  isAllowed: boolean;
  isDetecting: boolean;
  error: string | null;
  cityName?: string;
}
