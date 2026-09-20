import mongoose, { Schema, Document } from 'mongoose';

export interface IBlockDocument extends Document {
  blockerAnonymousId: string;
  blockedAnonymousId: string;
  createdAt: Date;
}

const BlockSchema = new Schema<IBlockDocument>(
  {
    blockerAnonymousId: { type: String, required: true, index: true },
    blockedAnonymousId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

BlockSchema.index({ blockerAnonymousId: 1, blockedAnonymousId: 1 }, { unique: true });

export const BlockModel =
  mongoose.models.Block || mongoose.model<IBlockDocument>('Block', BlockSchema);
