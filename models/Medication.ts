import mongoose, { Document, Schema } from 'mongoose';

export interface IMedication extends Document {
  userId: string;
  name: string;
  frequency: string; // e.g., "Once daily", "Twice daily", "Every 8 hours"
  timeOfDay: string[]; // e.g., ["08:00", "20:00"]
  startDate: Date;
  endDate?: Date;
  notes?: string;
  reminderEnabled: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MedicationSchema: Schema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    frequency: {
      type: String,
      required: true,
    },
    timeOfDay: {
      type: [String],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    notes: {
      type: String,
    },
    reminderEnabled: {
      type: Boolean,
      default: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for active medications
MedicationSchema.index({ userId: 1, active: 1 });

export default mongoose.models.Medication || mongoose.model<IMedication>('Medication', MedicationSchema);
