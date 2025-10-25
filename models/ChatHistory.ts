import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface IChatHistory extends Document {
  userId: string;
  sessionId: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
  },
}, { _id: false });

const ChatHistorySchema: Schema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    messages: {
      type: [MessageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
ChatHistorySchema.index({ userId: 1, sessionId: 1 });

// Prevent re-compilation during development
export default mongoose.models.ChatHistory || mongoose.model<IChatHistory>('ChatHistory', ChatHistorySchema);
