import mongoose, { Schema, Document } from 'mongoose';

export interface IUserDocument extends Document {
  anonymousId: string;
  alias: string;
  avatarColor: string;
  avatarId?: number;
  gender?: 'male' | 'female' | 'other';
  email?: string;
  passwordHash?: string;
  interests: string[];
  referralCode?: string;
  referredBy?: string; // anonymousId of the user who referred this user
  lastKnownLocation?: {
    type: 'Point';
    coordinates: [number, number];
  };
  lastActiveAt: Date;
  isBanned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    anonymousId: { type: String, required: true, unique: true },
    alias: { type: String, required: true },
    avatarColor: { type: String, required: true, default: '#6366F1' },
    avatarId: { type: Number, default: 1, min: 1, max: 6 },
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    interests: { type: [String], default: [] },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: String, default: null },
    lastKnownLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: undefined,
      },
    },
    lastActiveAt: { type: Date, default: Date.now },
    isBanned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

UserSchema.index({ lastKnownLocation: '2dsphere' });

export const UserModel = mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);
