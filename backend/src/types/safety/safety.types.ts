export interface IReport {
  _id: string;
  reporterAnonymousId: string;
  reportedAnonymousId: string;
  messageId?: string;
  reason: 'spam' | 'harassment' | 'hate_speech' | 'inappropriate' | 'other';
  additionalDetails?: string;
  createdAt: Date;
}

export interface IBlock {
  _id: string;
  blockerAnonymousId: string;
  blockedAnonymousId: string;
  createdAt: Date;
}
