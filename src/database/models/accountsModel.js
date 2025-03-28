import { Schema, model } from 'mongoose';

const bankAccountSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    accountId: { type: String, required: true },
    dwollaProcessorToken: { type: String, required: true }, // Dwolla processor_token
    fundingSourceURL: { type: String, required: true },
    mask: String,
    name: String,
    type: String,
    subtype: String,
  },
  { versionKey: false, timestamps: true },
);

export const BankAccountCollection = model('Bank-Account', bankAccountSchema);
