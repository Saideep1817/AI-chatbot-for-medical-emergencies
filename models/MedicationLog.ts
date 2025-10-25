import mongoose, { Document, Schema } from 'mongoose';

export interface IMedicationLog extends Document {
  userId: string;
  medicationId: string;
  medicationName: string;
  scheduledTime: string; // e.g., "09:00"
  scheduledDate: Date; // The date this dose was scheduled for
  takenAt?: Date; // When the user marked it as taken
  status: 'pending' | 'taken' | 'missed';
  createdAt: Date;
  updatedAt: Date;
}

const MedicationLogSchema: Schema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    medicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Medication',
      required: true,
      index: true,
    },
    medicationName: {
      type: String,
      required: true,
    },
    scheduledTime: {
      type: String,
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
      index: true,
    },
    takenAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'taken', 'missed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
MedicationLogSchema.index({ userId: 1, scheduledDate: 1, status: 1 });
MedicationLogSchema.index({ medicationId: 1, scheduledDate: 1 });

export default mongoose.models.MedicationLog || mongoose.model<IMedicationLog>('MedicationLog', MedicationLogSchema);
