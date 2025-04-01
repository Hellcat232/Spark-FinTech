import { Schema, model } from 'mongoose';

const eventsTransferSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    eventId: { type: Number, required: true, unique: true },
    eventType: { type: String, required: true }, // e.g. transfer_completed
    accountId: { type: String },
    transferAmount: { type: String },
    transferType: { type: String }, // credit | debit
    transferId: { type: String },
    timestamp: { type: Date },
    source: { type: String, enum: ['plaid', 'dwolla'], required: true },
  },
  { timestamps: true, versionKey: false },
);

export const EventsTransferCollection = model('event', eventsTransferSchema);
