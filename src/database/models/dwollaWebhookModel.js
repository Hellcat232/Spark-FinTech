import { Schema, model } from 'mongoose';

const dwollaWebhookQueueSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    webhookId: { type: String, required: true }, // event.id от Dwolla
    topic: { type: String, required: true }, // Тип события (например, customer_transfer_completed)
    resourceId: { type: String, required: true }, // transferId из Dwolla
    payload: { type: Object, required: true }, // Полное тело webhook-а
    status: {
      type: String,
      enum: ['pending', 'completed', 'rejected'],
      default: 'pending',
    },
    signatureValid: {
      type: Boolean,
      default: false,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
    timestamps: true, // createdAt, updatedAt
  },
);

dwollaWebhookQueueSchema.index({ resourceId: 1, topic: 1 }, { unique: true });

export const DwollaWebhoolQueue = model('Dwolla-Webhook-Queue', dwollaWebhookQueueSchema);
