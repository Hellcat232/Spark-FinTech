import { Schema, model } from 'mongoose';

const eventsTransferSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    eventId: { type: Number, required: true },
    eventType: { type: String, required: true },
    accountId: { type: String, required: true },
    transferAmount: { type: String, required: true },
    transferType: { type: String, required: true },
    transferId: { type: String, required: true },
    timestamp: { type: String, required: true },
  },
  { versionKey: false, timestamps: true },
);

export const EventsTransferCollection = model('event', eventsTransferSchema);
