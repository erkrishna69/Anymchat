import mongoose, { Schema, Document } from 'mongoose';

export type ReferralStatus = 'REGISTERED';

export interface IReferralDocument extends Document {
  referralCode: string;
  referrerAnonymousId: string;
  referredAnonymousId: string;
  status: ReferralStatus;
  registeredAt: Date;
  createdAt: Date;
}

const ReferralSchema = new Schema<IReferralDocument>(
  {
    referralCode: { type: String, required: true, index: true },
    referrerAnonymousId: { type: String, required: true, index: true },
    // One account can only be referred once
    referredAnonymousId: { type: String, required: true, unique: true },
    status: { type: String, enum: ['REGISTERED'], default: 'REGISTERED' },
    registeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const ReferralModel =
  mongoose.models.Referral || mongoose.model<IReferralDocument>('Referral', ReferralSchema);
