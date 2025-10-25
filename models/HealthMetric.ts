import mongoose, { Document, Schema } from 'mongoose';

export interface IHealthMetric extends Document {
  userId: string;
  type: 'blood_pressure' | 'blood_sugar' | 'weight' | 'heart_rate' | 'temperature' | 'oxygen_saturation' | 'sleep_hours';
  value: any; // Flexible to store different metric types
  unit: string;
  notes?: string;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HealthMetricSchema: Schema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['blood_pressure', 'blood_sugar', 'weight', 'heart_rate', 'temperature', 'oxygen_saturation', 'sleep_hours'],
      required: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
    },
    recordedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
HealthMetricSchema.index({ userId: 1, type: 1, recordedAt: -1 });

export default mongoose.models.HealthMetric || mongoose.model<IHealthMetric>('HealthMetric', HealthMetricSchema);
