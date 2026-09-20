import mongoose, { Schema, Document } from 'mongoose';

export type ReferralEventType = 'LINK_OPENED' | 'REGISTERED';

export interface IReferralEventDocument extends Document {
  referralCode: string;
  referrerAnonymousId: string;
  eventType: ReferralEventType;
  userId?: string; // set when eventType = REGISTERED
  ipHash?: string;
  timestamp: Date;
}

const ReferralEventSchema = new Schema<IReferralEventDocument>(
  {
    referralCode: { type: String, required: true, index: true },
    referrerAnonymousId: { type: String, required: true },
    eventType: {
      type: String,
      enum: ['LINK_OPENED', 'REGISTERED'],
      required: true,
    },
    userId: { type: String, default: null },
    ipHash: { type: String, default: null },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { _id: true }
);

// TTL: auto-delete events older than 90 days to keep DB clean
ReferralEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const ReferralEventModel =
  mongoose.models.ReferralEvent ||
  mongoose.model<IReferralEventDocument>('ReferralEvent', ReferralEventSchema);
