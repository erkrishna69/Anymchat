import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedMessageDocument extends Document {
  senderAnonymousId: string;
  senderAlias: string;
  senderAvatarColor: string;
  senderGender?: 'male' | 'female' | 'other';
  avatarId?: number;
  clientMessageId?: string;
  content: string;
  replyTo?: {
    messageId: string;
    senderAlias: string;
    content: string;
  };
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  createdAt: Date;
}

const FeedMessageSchema = new Schema<IFeedMessageDocument>(
  {
    senderAnonymousId: { type: String, required: true, index: true },
    senderAlias: { type: String, required: true },
    senderAvatarColor: { type: String, required: true },
    senderGender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
    avatarId: { type: Number, default: 1 },
    clientMessageId: { type: String, sparse: true, index: true },
    content: { type: String, required: true, maxlength: 500 },
    replyTo: {
      messageId: { type: String },
      senderAlias: { type: String },
      content: { type: String },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

FeedMessageSchema.index({ location: '2dsphere' });
FeedMessageSchema.index({ createdAt: -1 });
FeedMessageSchema.index({ location: '2dsphere', createdAt: -1 });
// Database-level Idempotency: Unique compound constraint on sender + clientMessageId
FeedMessageSchema.index({ senderAnonymousId: 1, clientMessageId: 1 }, { unique: true, sparse: true });
// 24-Hour Automatic Document Expiration (TTL Index in MongoDB)
FeedMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export const FeedMessageModel =
  mongoose.models.FeedMessage || mongoose.model<IFeedMessageDocument>('FeedMessage', FeedMessageSchema);


