import mongoose, { Schema, Document } from 'mongoose';

export interface IReportDocument extends Document {
  reporterAnonymousId: string;
  reportedAnonymousId: string;
  messageId?: string;
  reason: 'spam' | 'harassment' | 'hate_speech' | 'inappropriate' | 'other';
  additionalDetails?: string;
  createdAt: Date;
}

const ReportSchema = new Schema<IReportDocument>(
  {
    reporterAnonymousId: { type: String, required: true, index: true },
    reportedAnonymousId: { type: String, required: true, index: true },
    messageId: { type: String },
    reason: {
      type: String,
      enum: ['spam', 'harassment', 'hate_speech', 'inappropriate', 'other'],
      default: 'spam',
    },
    additionalDetails: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

export const ReportModel =
  mongoose.models.Report || mongoose.model<IReportDocument>('Report', ReportSchema);
