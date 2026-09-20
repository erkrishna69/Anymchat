import { GeoJSONPoint } from '../location/location.types';

export interface IReplyToMetadata {
  messageId: string;
  senderAlias: string;
  content: string;
}

export interface IFeedMessage {
  _id: string;
  senderAnonymousId: string;
  senderAlias: string;
  senderAvatarColor: string;
  senderGender?: 'male' | 'female' | 'other';
  avatarId?: number;
  content: string;
  replyTo?: IReplyToMetadata;
  location: GeoJSONPoint;
  createdAt: Date;
}

export interface IPublicFeedMessage {
  id: string;
  senderAnonymousId: string;
  senderAlias: string;
  senderAvatarColor: string;
  senderGender?: 'male' | 'female' | 'other';
  avatarId?: number;
  content: string;
  replyTo?: IReplyToMetadata;
  createdAt: string;
  proximityTag: string; // "Nearby"
}
