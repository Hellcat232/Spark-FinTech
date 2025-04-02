import { plaidWebhookQueue } from '../database/models/plaidWebhooksModel.js';
import { TransferCollection } from '../database/models/transfersModel.js';
import { writeToTransferEventsDB } from '../utils/writeToTransferEventsDB.js';

import { plaidClient } from '../thirdAPI/initPlaid.js';

export const syncTransferEventsWithUserId = async (webhookType, webhookCode, payload) => {
  try {
    if (webhookType !== 'TRANSFER' || webhookCode !== 'TRANSFER_EVENTS_UPDATE') {
      return false; // это не нужный Webhook
    }

    const syncRes = await plaidClient.transferEventSync({ after_id: 0 });
    const latestEvent = syncRes.data?.transfer_events?.[0];
    // console.log(latestEvent);

    if (!latestEvent) {
      console.warn('Нет событий для синхронизации.');
      return false;
    }

    const { transfer_id, event_type } = latestEvent;

    const transfer = await TransferCollection.findOne({ transferId: transfer_id });
    const userId = transfer?.userId || null;

    await writeToTransferEventsDB(userId, syncRes);

    await plaidWebhookQueue.create({
      userId,
      transferId: transfer.transferId,
      webhook_type: webhookType,
      webhook_code: webhookCode,
      asset_report_id: null,
      transaction_id: null,
      payload: latestEvent,
      status: 'pending',
    });

    console.log(`✅ Sync одного Transfer Event: ${transfer_id} -> ${event_type} (user: ${userId})`);

    return true;
  } catch (error) {
    console.error('❌ Ошибка в syncTransferEventsWithUserId:', error.message);
    return false;
  }
};
