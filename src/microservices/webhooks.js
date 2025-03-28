import { WebhookQueue } from '../database/models/webhooksModel.js';
import { fetchAssetReport } from './plaid/assets-service.js';
import { plaidClient } from '../thirdAPI/initPlaid.js';
import { dwollaClient } from '../thirdAPI/initDwolla.js';
import { env } from '../utils/env.js';

export const processWebhooksPlaid = async () => {
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
          if (webhook.webhook_code === 'TRANSFER_EVENTS_UPDATE') {
            const sync = await plaidClient.transferEventSync({
              after_id: 0,
            });
            //debit
            if (
              sync.data.transfer_events.at(0).transfer_type === 'debit' &&
              sync.data.transfer_events.at(0).event_type === 'pending'
            ) {
              // await plaidClient.sandboxTransferSimulate({
              //   transfer_id: sync.data.transfer_events.at(0).transfer_id,
              //   event_type: 'posted',
              //   failure_reason: sync.data.transfer_events.at(0).failure_reason,
              // });
            }
            if (
              sync.data.transfer_events.at(0).transfer_type === 'debit' &&
              sync.data.transfer_events.at(0).event_type === 'posted'
            ) {
              // await plaidClient.sandboxTransferSimulate({
              //   transfer_id: sync.data.transfer_events.at(0).transfer_id,
              //   event_type: 'settled',
              //   failure_reason: sync.data.transfer_events.at(0).failure_reason,
              // });
            }

            //credit
            if (
              sync.data.transfer_events.at(0).transfer_type === 'credit' &&
              sync.data.transfer_events.at(0).event_type === 'pending'
            ) {
              // await plaidClient.sandboxTransferSimulate({
              //   transfer_id: sync.data.transfer_events.at(0).transfer_id,
              //   event_type: 'posted',
              //   failure_reason: sync.data.transfer_events.at(0).failure_reason,
              // });
            }
            if (
              sync.data.transfer_events.at(0).transfer_type === 'credit' &&
              sync.data.transfer_events.at(0).event_type === 'posted'
            ) {
              // await plaidClient.sandboxTransferSimulate({
              //   transfer_id: sync.data.transfer_events.at(0).transfer_id,
              //   event_type: 'settled',
              //   failure_reason: sync.data.transfer_events.at(0).failure_reason,
              // });
            }
          }
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

export const proccessWebhookDwolla = async () => {};
