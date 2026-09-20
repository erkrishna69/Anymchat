export interface IDirectMessage {
  _id: string;
  senderAnonymousId: string;
  recipientAnonymousId: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
}

export interface IPublicDirectMessage {
  id: string;
  senderAnonymousId: string;
  recipientAnonymousId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  isMine: boolean;
}
