import { DwollaWebhoolQueue } from '../database/models/dwollaWebhookModel';
import { TransferCollection } from '../database/models/transfersModel';

//===========Занготовка webhook'а для повторных запросов==============//

export const processRetries = async () => {
  const retries = await DwollaWebhoolQueue.find({
    status: 'retry',
    retryCount: { $lt: 5 },
  });

  for (const webhook of retries) {
    try {
      console.log(`🔁 Повторная попытка обработки: ${webhook.resourceId}`);

      const transfer = await TransferCollection.findOne({
        dwollaTransferId: webhook.resourceId,
      });

      if (transfer) {
        await TransferCollection.updateOne(
          { _id: transfer._id },
          { $set: { status: 'completed' } },
        );

        await DwollaWebhoolQueue.updateOne({ _id: webhook._id }, { $set: { status: 'completed' } });

        console.log(`✅ Повтор удался для: ${webhook.resourceId}`);
      } else {
        await DwollaWebhoolQueue.updateOne(
          { _id: webhook._id },
          {
            $inc: { retryCount: 1 },
            $set: { lastRetryAt: new Date() },
          },
        );

        if (webhook.retryCount + 1 >= 5) {
          await DwollaWebhoolQueue.updateOne({ _id: webhook._id }, { $set: { status: 'dead' } });
          console.warn(`☠️ Перемещён в DeadQueue: ${webhook.resourceId}`);
        }
      }
    } catch (err) {
      console.error(`❌ Ошибка в retry обработке ${webhook.webhookId}:`, err.message);
    }
  }
};
