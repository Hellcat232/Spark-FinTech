import { Schema, model } from 'mongoose';

const TransferEventsSchema = new Schema(
  {
    eventId: { type: Number, required: true, unique: true },
    transferId: { type: String, required: true },
    eventType: { type: String, required: true }, // например, 'posted', 'settled'
    timestamp: { type: Date, required: true },
    accountId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: false, versionKey: false },
);

export const TransferEventsCollection = model('transfers-event', TransferEventsSchema);
