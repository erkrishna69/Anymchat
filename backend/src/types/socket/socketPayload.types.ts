import { GeoCoordinates } from '../location/location.types';

export interface LocationUpdatePayload {
  latitude: number;
  longitude: number;
  radiusKm?: number;
}

export interface SendFeedMessagePayload {
  clientMessageId?: string;
  content: string;
  replyTo?: {
    messageId: string;
    senderAlias: string;
    content: string;
  };
}

export interface SendDirectMessagePayload {
  clientMessageId?: string;
  recipientAnonymousId: string;
  content: string;
}


export interface TypingDirectPayload {
  recipientAnonymousId: string;
  isTyping: boolean;
}
