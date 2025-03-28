import { Schema, model } from 'mongoose';

const transferSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    transferId: { type: String, required: true },
    amount: { type: String, required: true },
    status: { type: String, required: true },
    type: { type: String, required: true },
    accountId: { type: String, required: true },
    groupId: { type: String, required: true },
  },
  { versionKey: false, timestamps: true },
);

export const TransferCollection = model('transfer', transferSchema);
