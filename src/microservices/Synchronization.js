import { plaidClient } from '../thirdAPI/initPlaid.js';
import { TransferCollection } from '../database/models/transfersModel.js';
import { EventsTransferCollection } from '../database/models/eventsTransferModel.js';
import createHttpError from 'http-errors';

const Synchronization = async () => {
  try {
    let lastEvent = await EventsTransferCollection.findOne().sort({ eventId: -1 }).lean();
    let lastEventId = lastEvent ? lastEvent.eventId : 0;
    if (!lastEvent) {
      throw createHttpError(404, "Event's store is empty");
    }

    const transferEventSync = await plaidClient.transferEventSync({
      after_id: lastEventId,
    });

    if (!transferEventSync.data.transfer_events.length) {
      console.log('✅ Нет новых событий для обновления.');
      return;
    }

    let revortArray = transferEventSync.data.transfer_events
      .sort((a, b) => b.event_id - a.event_id)
      .reverse();

    for (const event of revortArray) {
      await TransferCollection.findOneAndUpdate(
        { transferId: event.transfer_id },
        {
          $set: { status: event.event_type },
        },
      );

      await EventsTransferCollection.create({
        userId: lastEvent.userId,
        eventId: event.event_id,
        eventType: event.event_type,
        accountId: event.account_id,
        transferAmount: event.transfer_amount,
        transferId: event.transfer_id,
        transferType: event.transfer_type,
        timestamp: event.timestamp,
      });
    }
  } catch (error) {
    console.error('❌ Ошибка при синхронизации событий перевода:', error.message);
  }
};

export default Synchronization;
