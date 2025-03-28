import { EventsTransferCollection } from '../database/models/eventsTransferModel.js';
import { plaidClient } from '../thirdAPI/initPlaid.js';

export const syncTransferEvents = async (userId, session) => {
  const lastEvent = await EventsTransferCollection.findOne().sort({ timestamp: -1 }).lean();
  let lastEventId = lastEvent ? lastEvent.eventId : 0;

  const syncResponse = await plaidClient.transferEventSync({ after_id: lastEventId });

  if (!syncResponse.data.transfer_events.length) {
    console.log('Нет новых событий');
    return;
  }

  // Сортируем события от старых к новым по timestamp
  const sortedEvents = syncResponse.data.transfer_events
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .reverse();

  // Формируем массив операций для bulkWrite
  const bulkOps = sortedEvents.map((event) => ({
    updateOne: {
      filter: { eventId: event.event_id },
      update: {
        $setOnInsert: {
          userId,
          eventId: event.event_id,
          eventType: event.event_type,
          accountId: event.account_id,
          transferAmount: event.transfer_amount,
          transferId: event.transfer_id,
          transferType: event.transfer_type,
          timestamp: event.timestamp,
        },
      },
      upsert: true,
    },
  }));

  // Выполняем bulkWrite для пакетного обновления
  await EventsTransferCollection.bulkWrite(bulkOps, { session });
  // console.log('Результат bulkWrite:', bulkResult);
};
