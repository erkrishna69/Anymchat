import mongoose, { Schema, Document } from 'mongoose';

export interface IDeletedAccountDocument extends Document {
  email: string;
  anonymousId: string;
  deletedAt: Date;
  expiresAt: Date;
}

const DeletedAccountSchema = new Schema<IDeletedAccountDocument>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    anonymousId: { type: String, required: true },
    deletedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

export const DeletedAccountModel =
  mongoose.models.DeletedAccount ||
  mongoose.model<IDeletedAccountDocument>('DeletedAccount', DeletedAccountSchema);
