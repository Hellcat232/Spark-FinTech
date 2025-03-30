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
          if (!user) {
            console.log(`Пользователь с таким ${payload?._links?.customer?.href} не найден`);
          }

          await UserRegisterCollection.updateOne(
            { _id: user._id },
            {
              $set: {
                dwollaCustomerHasVerify: true,
              },
            },
          );

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
            console.log(`🔄 Transfer статус обновлён на 'completed'`);
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

        case 'customer_bank_transfer_created':
          console.log(`🏦 BANK_TRANSFER_CREATED: ${resourceId}`);
          break;

        case 'customer_bank_transfer_completed': {
          console.log(`💰 BANK_TRANSFER_COMPLETED: ${resourceId}`);

          const transfer = await TransferCollection.findOne({
            dwollaTransferId: resourceId,
          });
          if (transfer) {
            await TransferCollection.updateOne(
              { _id: transfer._id },
              { $set: { status: 'completed' } },
            );
            console.log(`🔄 Transfer статус обновлён на 'completed'`);
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
