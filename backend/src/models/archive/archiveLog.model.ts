import mongoose, { Schema, Document } from 'mongoose';

export interface IArchiveLogDocument extends Document {
  windowStart: Date;
  windowEnd: Date;
  totalFeedMessages: number;
  totalDirectMessages: number;
  totalMessages: number;
  fileName: string;
  localPath: string;
  fileSizeBytes: number;
  sha256Hash: string;
  isEncrypted?: boolean;
  gdriveFileId?: string;
  gdriveWebViewLink?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'STAGED_LOCAL' | 'FAILED';
  errorMessage?: string;
  createdAt: Date;
}


const ArchiveLogSchema = new Schema<IArchiveLogDocument>(
  {
    windowStart: { type: Date, required: true },
    windowEnd: { type: Date, required: true },
    totalFeedMessages: { type: Number, default: 0 },
    totalDirectMessages: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    fileName: { type: String, required: true },
    localPath: { type: String, required: true },
    fileSizeBytes: { type: Number, default: 0 },
    sha256Hash: { type: String, required: true },
    isEncrypted: { type: Boolean, default: true },
    gdriveFileId: { type: String },
    gdriveWebViewLink: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'STAGED_LOCAL', 'FAILED'],
      default: 'PROCESSING',
      index: true,
    },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

// Enforce unique archival per window to prevent duplicate multi-instance runs
ArchiveLogSchema.index({ windowStart: 1, windowEnd: 1 }, { unique: true });
ArchiveLogSchema.index({ createdAt: -1 });

export const ArchiveLogModel =
  mongoose.models.ArchiveLog ||
  mongoose.model<IArchiveLogDocument>('ArchiveLog', ArchiveLogSchema);

