import { Schema, model } from 'mongoose';

const transferSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' }, // Кто инициировал перевод
    transferId: { type: String, required: true },
    amount: { type: String, required: true },
    publicStatus: { type: String, required: false },
    dwollaStatus: { type: String, required: false },
    plaidStatus: { type: String, required: false }, // pending, settled и т.д.
    cancellable: { type: Boolean, default: false, required: false },
    type: { type: String, required: true }, // debit или credit
    accountId: { type: String, required: true }, // С какого счёта
    groupId: { type: String, required: true }, // Чтобы группировать пары переводов
    note: { type: String, default: '' }, // Пояснение от пользователя
    toUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null }, // Кому перевёл
    via: { type: String, enum: ['plaid', 'dwolla'], required: true }, // Через кого шло
    isExternal: { type: Boolean, default: false }, // Если внешний перевод
    initiatedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // Кто инициировал (может отличаться от userId)
    senderUrl: { type: String, default: null, required: true },
    dwollaTransferId: { type: String, default: null, required: true },
    dwollaTransferUrl: { type: String, default: null, required: true },
    // trace: [
    //   {
    //     event: { type: String, required: true },
    //     at: { type: Date, required: true },
    //     customer: { type: String },
    //     direction: { type: String, enum: ['debit', 'credit', null], default: null },
    //     raw: { type: Object },
    //   },
    // ],
  },
  { versionKey: false, timestamps: true },
);

export const TransferCollection = model('transfer', transferSchema);
