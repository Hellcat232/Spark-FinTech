import { WebhookQueue } from '../database/models/webhooksModel.js';
import { fetchAssetReport } from './plaid-sandbox.js';

const processWebhooks = async () => {
  const pendingWebhooks = await WebhookQueue.find({ status: 'pending' });

  for (const webhook of pendingWebhooks) {
    try {
      console.log(`⚙️ Обрабатываем WebHook: ${webhook.webhook_type} - ${webhook.webhook_code}`);

      switch (webhook.webhook_type) {
        case 'ASSETS':
          await fetchAssetReport(webhook.asset_report_id);
          break;

        case 'TRANSACTIONS':
          // await processTransactionUpdate(webhook.payload);
          console.log(webhook);

          break;

        case 'IDENTITY':
          // await processIdentityUpdate(webhook.payload);
          console.log(webhook);
          break;

        case 'TRANSFER':
          // await processIdentityUpdate(webhook.payload);
          console.log(webhook);
          break;

        default:
          console.log(`⚠️ Неизвестный тип WebHook: ${webhook.webhook_type}`);
      }

      // Помечаем WebHook как обработанный
      await WebhookQueue.updateOne({ _id: webhook._id }, { $set: { status: 'completed' } });
    } catch (error) {
      console.error('❌ Ошибка при обработке WebHook:', error.message);
    }
  }
};

export default processWebhooks;
