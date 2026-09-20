import mongoose, { Schema, Document } from 'mongoose';

export interface IDirectMessageDocument extends Document {
  senderAnonymousId: string;
  recipientAnonymousId: string;
  clientMessageId?: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
}

const DirectMessageSchema = new Schema<IDirectMessageDocument>(
  {
    senderAnonymousId: { type: String, required: true, index: true },
    recipientAnonymousId: { type: String, required: true, index: true },
    clientMessageId: { type: String, sparse: true, index: true },
    content: { type: String, required: true, maxlength: 1000 },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

DirectMessageSchema.index({ senderAnonymousId: 1, recipientAnonymousId: 1, createdAt: -1 });
// Database-level Idempotency: Unique compound constraint on sender + clientMessageId
DirectMessageSchema.index({ senderAnonymousId: 1, clientMessageId: 1 }, { unique: true, sparse: true });
// 24-Hour Automatic Document Expiration (TTL Index in MongoDB)
DirectMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export const DirectMessageModel =
  mongoose.models.DirectMessage ||
  mongoose.model<IDirectMessageDocument>('DirectMessage', DirectMessageSchema);


