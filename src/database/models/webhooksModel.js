import { Schema, model } from 'mongoose';

const webhookSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    webhook_type: { type: String, required: true },
    webhook_code: { type: String, required: true },
    asset_report_id: { type: String, default: null },
    transaction_id: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    payload: { type: Schema.Types.Mixed },
  },
  { versionKey: false },
);

export const WebhookQueue = model('WebhookQueue', webhookSchema);
