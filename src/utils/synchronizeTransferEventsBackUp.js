import createHttpError from 'http-errors';
import { env } from './env.js';
import { plaidClient } from '../thirdAPI/initPlaid.js';
import { TransferCollection } from '../database/models/transfersModel.js';
import { TransferEventsCollection } from '../database/models/eventsTransferModel.js';
import { writeToTransferEventsDB } from './writeToTransferEventsDB.js';

export const synchronizeTransferEventsBackUp = async () => {
  try {
    const lastEvent = await TransferEventsCollection.findOne().sort({ eventId: -1 }).lean();
    const afterId = lastEvent?.eventId || 0;

    const syncResponse = await plaidClient.transferEventSync({
      after_id: afterId,
    });

    const events = syncResponse.data.transfer_events || [];

    if (!events || !events.length) {
      console.log('Нет новых transfer events для синхронизации.');
      return;
    }

    for (const event of events) {
      const transfer = await TransferCollection.findOne({
        transferId: event.transfer_id,
      }).lean();

      if (!transfer) {
        console.warn(`Transfer не найден для transfer_id: ${event.transfer_id}`);
        continue;
      }

      await writeToTransferEventsDB(transfer.userId, {
        data: {
          transfer_events: [event],
        },
      });
    }

    console.log('✅ Синхронизация transfer events завершена');
  } catch (error) {
    console.error('❌ Ошибка при синхронизации событий перевода:', error.message);
  }
};
