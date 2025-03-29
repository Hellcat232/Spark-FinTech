import { plaidWebhookQueue } from '../database/models/plaidWebhooksModel.js';
import { DwollaWebhoolQueue } from '../database/models/dwollaWebhookModel.js';
import { TransferCollection } from '../database/models/transfersModel.js';
import { fetchAssetReport } from './plaid/assets-service.js';
import { plaidClient } from '../thirdAPI/initPlaid.js';
import { dwollaClient } from '../thirdAPI/initDwolla.js';
import { env } from '../utils/env.js';

export const processWebhooksPlaid = async () => {
  const pendingWebhooks = await plaidWebhookQueue.find({ status: 'pending' });

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
      await plaidWebhookQueue.updateOne({ _id: webhook._id }, { $set: { status: 'completed' } });
    } catch (error) {
      console.error('❌ Ошибка при обработке WebHook:', error.message);
    }
  }
};

export const proccessWebhookDwolla = async () => {
  const pendingWebhooks = await DwollaWebhoolQueue.find({
    status: 'pending',
    signatureValid: true,
  });

  for (const webhook of pendingWebhooks) {
    try {
      console.log(`⚙️ Обработка: ${webhook.topic} | ${webhook.resourceId}`);

      const transferUrl = webhook.payload?._links?.resource?.href;

      switch (webhook.topic) {
        case 'customer_funding_source_added':
        case 'customer_funding_source_verified':
          break;

        case 'customer_transfer_created':
          await TransferCollection.updateOne(
            { dwollaTransferUrl: transferUrl },
            { $set: { status: 'pending' } },
          );
          break;

        case 'customer_transfer_completed':
          await TransferCollection.updateOne(
            { dwollaTransferUrl: transferUrl },
            { $set: { status: 'settled' } },
          );
          break;

        case 'customer_transfer_failed':
          await TransferCollection.updateOne(
            { dwollaTransferUrl: transferUrl },
            { $set: { status: 'failed' } },
          );
          break;

        case 'customer_bank_transfer_created':
          await TransferCollection.updateOne(
            { dwollaTransferUrl: transferUrl },
            { $set: { status: 'completed' } },
          );
          break;

        case 'customer_bank_transfer_completed':
          await TransferCollection.updateOne(
            { dwollaTransferUrl: transferUrl },
            { $set: { status: 'completed' } },
          );
          break;

        default:
          console.log(`🔔 Необработанный webhook: ${webhook.topic}`);
      }

      await DwollaWebhoolQueue.updateOne({ _id: webhook._id }, { $set: { status: 'completed' } });
    } catch (err) {
      console.error('❌ Ошибка в обработке Dwolla Webhook:', err.message);
    }
  }
};
