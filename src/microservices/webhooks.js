import { plaidWebhookQueue } from '../database/models/plaidWebhooksModel.js';
import { DwollaWebhoolQueue } from '../database/models/dwollaWebhookModel.js';
import { TransferCollection } from '../database/models/transfersModel.js';
import { UserRegisterCollection } from '../database/models/userModel.js';
import { fetchAssetReport } from './plaid/assets-service.js';
import { plaidClient } from '../thirdAPI/initPlaid.js';
import { makeTraceObj, mapStatus, isDwollaBankTransferDebit } from '../utils/transferTrace.js';
import {
  dwollaClient,
  updateDwollaWebhook,
  getDwollaWebhookSubscriptions,
} from '../thirdAPI/initDwolla.js';
import { dwollaGetTransferInfo } from './dwolla/dwolla-transfer-service.js';
import { env } from '../utils/env.js';
import { writeToTransferEventsDB } from '../utils/writeToTransferEventsDB.js';

export const processWebhooksPlaid = async () => {
  const pendingWebhooks = await plaidWebhookQueue.find({ status: 'pending' });

  for (const webhook of pendingWebhooks) {
    const {
      webhook_type,
      webhook_code,
      payload,
      asset_report_id,
      _id,
      item_id,
      userId,
      transferId,
    } = webhook;

    try {
      console.log(`⚙️ Обрабатываем Plaid WebHook: ${webhook_type} - ${webhook_code}`);

      switch (webhook_type) {
        case 'ASSETS': {
          if (webhook_code === 'PRODUCT_READY') {
            await fetchAssetReport(asset_report_id);
          } else {
            console.log(`📦 ASSETS → ${webhook_code}`);
          }
          break;
        }

        case 'TRANSACTIONS': {
          if (webhook_code === 'INITIAL_UPDATE') {
            console.log('🧾 TRANSACTIONS → Initial update');
          } else if (webhook_code === 'HISTORICAL_UPDATE') {
            console.log('🧾 TRANSACTIONS → Historical update');
          } else if (webhook_code === 'DEFAULT_UPDATE') {
            console.log('🧾 TRANSACTIONS → Default update');
          } else {
            console.log(`🧾 TRANSACTIONS → ${webhook_code}`);
          }
          break;
        }

        case 'TRANSFER': {
          if (webhook_code === 'TRANSFER_EVENTS_UPDATE') {
            console.log('🔄 TRANSFER → Events update');
            await plaidWebhookQueue.updateMany(
              { webhook_code },
              {
                $unset: {
                  // userId: 1,
                  transaction_id: 1,
                  asset_report_id: 1,
                },
              },
            );

            const transferStatus = await plaidClient.transferGet({
              transfer_id: transferId,
            });
            await TransferCollection.updateOne(
              { transferId: transferStatus.data.transfer.id },
              {
                $set: {
                  plaidStatus: transferStatus.data.transfer.status,
                },
              },
            );
            // await syncTransferEvents(webhook.userId || null); // если userId есть — передаём
          } else {
            console.log(`🔄 TRANSFER → ${webhook_code}`);
          }
          break;
        }

        case 'IDENTITY': {
          console.log(`🪪 IDENTITY → ${webhook_code}`);
          break;
        }

        case 'ITEM': {
          if (webhook_code === 'NEW_ACCOUNTS_AVAILABLE') {
            const user = await UserRegisterCollection.findOne({ plaidItemId: item_id });

            console.log(`New account for user ${user?._id} available`);
          }

          break;
        }

        default:
          console.log(`❓ Неизвестный webhook_type: ${webhook_type}`);
      }

      await plaidWebhookQueue.updateOne({ _id }, { $set: { status: 'completed' } });
    } catch (err) {
      console.error(`❌ Ошибка в обработке Plaid Webhook: ${err.message}`);
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
      // console.log(`⚙️ Обработка: ${webhook.topic} | ${webhook.resourceId}`);

      const { topic, payload, resourceId } = webhook;

      switch (topic) {
        case 'customer_created': {
          console.log(`Dwolla customer "${resourceId}" created`);
          break;
        }
        case 'customer_verified': {
          const user = await UserRegisterCollection.findOne({
            dwollaCustomerURL: payload?._links?.customer?.href,
          });
          if (user) {
            await UserRegisterCollection.updateOne(
              { _id: user._id },
              {
                $set: {
                  dwollaCustomerHasVerify: true,
                },
              },
            );
          } else {
            console.log(`Пользователь с таким ${payload?._links?.customer?.href} не найден`);
          }

          break;
        }

        case 'customer_deactivated': {
          const user = await UserRegisterCollection.findOne({
            dwollaCustomerURL: payload?._links?.customer?.href,
          });
          if (user) {
            await UserRegisterCollection.updateOne(
              { _id: user._id },
              {
                $set: { dwollaCustomerDeactivated: true, dwollaCustomerHasVerify: false },
                $unset: { dwollaCustomerURL: 1 },
              },
            );
            console.log(
              `Пользователь ${user._id}(${user.firstName}_${user.lastName}) с таким ${payload?._links?.customer?.href} был деактивирован`,
            );
          } else {
            console.log(`Пользователь ${user._id}(${user.firstName}_${user.lastName}) не найден`);
          }

          break;
        }

        case 'customer_funding_source_added': {
          const user = await UserRegisterCollection.findOne({
            dwollaCustomerURL: payload?._links?.customer?.href,
          });
          if (user) {
            console.log(
              `Пользовательская funding_source был добавлена для ${user._id}(${user.firstName}_${user.lastName})`,
            );
          } else {
            console.log(`Пользователь ${user._id}(${user.firstName}_${user.lastName}) не найден`);
          }

          break;
        }
        case 'customer_funding_source_verified': {
          const user = await UserRegisterCollection.findOne({
            dwollaCustomerURL: payload?._links?.customer?.href,
          });
          if (user) {
            console.log(
              `Пользовательская funding_source был верифицирован для ${user._id}(${user.firstName}_${user.lastName})`,
            );
          } else {
            console.log(`Пользователь ${user._id}(${user.firstName}_${user.lastName}) не найден`);
          }

          break;
        }

        case 'customer_transfer_created':
          console.log(`🟡 TRANSFER_CREATED: ${resourceId}`);
          break;

        case 'customer_transfer_completed': {
          console.log(`✅ TRANSFER_COMPLETED: ${resourceId}`);

          const transfer = await TransferCollection.findOne({
            dwollaTransferId: resourceId,
          });
          if (transfer) {
            await TransferCollection.updateOne(
              { _id: transfer._id },
              { $set: { status: 'settled' } },
            );
            console.log(`🔄 Transfer статус обновлён на 'settled'`);
          } else {
            console.warn(`❗ Transfer не найден для resourceId: ${resourceId}`);
          }

          break;
        }

        case 'customer_transfer_failed': {
          console.log(`❌ TRANSFER_FAILED: ${resourceId}`);

          const transfer = await TransferCollection.findOne({
            dwollaTransferId: resourceId,
          });
          if (transfer) {
            await TransferCollection.updateOne(
              { _id: transfer._id },
              { $set: { status: 'failed' } },
            );
            console.log(`🔄 Transfer статус обновлён на 'failed'`);
          } else {
            console.warn(`❗ Transfer не найден для resourceId: ${resourceId}`);
          }

          break;
        }

        case 'customer_transfer_cancelled': {
          console.log(`🚫 TRANSFER_CANCELLED: ${resourceId}`);

          const transfer = await TransferCollection.findOne({
            dwollaTransferId: resourceId,
          });
          if (transfer) {
            await TransferCollection.updateOne(
              { _id: transfer._id },
              { $set: { status: 'cancelled' } },
            );
            console.log(`🔄 Transfer статус обновлён на 'cancelled'`);
          } else {
            console.warn(`❗ Transfer не найден для resourceId: ${resourceId}`);
          }

          break;
        }

        case 'customer_bank_transfer_created': {
          const info = await dwollaGetTransferInfo(webhook.resourceId);
          if (info) {
            await TransferCollection.updateOne(
              {
                dwollaTransferId: info?.body?.id,
              },
              {
                $set: {
                  dwollaStatus: info.body.status,
                  cancellable: true,
                },
              },
            );
          }

          // console.log('FROM customer_bank_transfer_created', info);

          console.log(`🏦 BANK_TRANSFER_CREATED: ${resourceId}`);
          break;
        }

        case 'customer_bank_transfer_completed': {
          console.log(`💰 BANK_TRANSFER_COMPLETED: ${resourceId}`);

          const transfer = await TransferCollection.findOne({
            dwollaTransferId: resourceId,
          });
          if (transfer) {
            await TransferCollection.updateOne(
              { transferId: transfer._id },
              { $set: { status: 'settled' } },
            );
            console.log(`🔄 Transfer статус обновлён на 'settled'`);
          } else {
            console.warn(`❗ Transfer не найден для resourceId: ${resourceId}`);
          }

          break;
        }

        case 'customer_bank_transfer_failed': {
          console.log(`❌ BANK_TRANSFER_FAILED: ${resourceId}`);

          const transfer = await TransferCollection.findOne({
            dwollaTransferId: resourceId,
          });
          if (transfer) {
            await TransferCollection.updateOne(
              { _id: transfer._id },
              { $set: { status: 'failed' } },
            );
            console.log(`🔄 Transfer статус обновлён на 'failed'`);
          } else {
            console.warn(`❗ Transfer не найден для resourceId: ${resourceId}`);
          }

          break;
        }

        case 'customer_bank_transfer_cancelled': {
          console.log(`🚫 BANK_TRANSFER_CANCELLED: ${resourceId}`);

          const transfer = await TransferCollection.findOne({
            dwollaTransferId: resourceId,
          });
          if (transfer) {
            await TransferCollection.updateOne(
              { _id: transfer._id },
              { $set: { status: 'cancelled' } },
            );
            console.log(`🔄 Transfer статус обновлён на 'cancelled'`);
          } else {
            console.warn(`❗ Transfer не найден для resourceId: ${resourceId}`);
          }

          break;
        }

        default:
          console.log(`🔔 Необработанный webhook: ${webhook.topic}`);
      }

      await DwollaWebhoolQueue.updateOne({ _id: webhook._id }, { $set: { status: 'completed' } });
    } catch (err) {
      console.error('❌ Ошибка в обработке Dwolla Webhook:', err.message);
    }
  }
};
