import { IPublicNearbyUser } from '../../types';

export interface IConversation {
  id: string;
  name: string;
  badge: string;
  snippet: string;
  timestamp: string;
  type: 'room' | 'direct' | 'proximity';
  targetUser?: IPublicNearbyUser;
  unreadCount?: number;
}

export interface IMessageItem {
  id: string;
  senderId: string;
  senderAlias: string;
  content: string;
  timestamp: string;
  isSelf: boolean;
  avatarUrl?: string;
  avatarId?: number;
  senderGender?: 'male' | 'female' | 'other';
  replyTo?: {
    messageId: string;
    senderAlias: string;
    content: string;
  };
}
