import mongoose from 'mongoose';
import createHttpError from 'http-errors';

import { plaidClient } from '../../thirdAPI/initPlaid.js';
import { env } from '../../utils/env.js';

import { TransferCollection } from '../../database/models/transfersModel.js';
import { EventsTransferCollection } from '../../database/models/eventsTransferModel.js';

/*Использовать для платежей, без одобрением через UI*/

/*==========================Создаем авторизацию трансфера и получаем разрешение=================*/
export const authorizeAndCreateTransfer = async (user, amount, accountId, legalName) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // 1. Авторизация перевода
    const authResponse = await plaidClient.transferAuthorizationCreate({
      access_token: user.plaidAccessToken,
      account_id: accountId,
      amount: amount, // Сумма в строковом формате
      network: 'ach', // Используем ACH
      type: 'debit',
      ach_class: 'ppd', // PPD - личные платежи (можно использовать ccd)
      user: {
        legal_name: legalName,
        email_address: user.email,
      },
    });

    // Проверяем, разрешён ли перевод
    if (
      !authResponse.data.authorization.decision ||
      authResponse.data.authorization.decision !== 'approved'
    ) {
      throw createHttpError(409, 'Перевод не одобрен Plaid');
    }

    // 2. Создание перевода после успешной авторизации
    const transferResponse = await plaidClient.transferCreate({
      access_token: user.plaidAccessToken,
      authorization_id: authResponse.data.authorization.id, // Берём ID авторизации
      account_id: accountId,
      amount: amount,
      description: 'payment',
    });

    //Записали перевод в базу
    await TransferCollection.create(
      [
        {
          userId: user._id,
          transferId: transferResponse.data.transfer.id,
          amount: transferResponse.data.transfer.amount,
          status: transferResponse.data.transfer.status,
          type: transferResponse.data.transfer.type,
          accauntId: transferResponse.data.transfer.account_id,
        },
      ],
      { session },
    );

    // 3. Получаем последний Event ID из базы
    let lastEvent = await EventsTransferCollection.findOne().sort({ eventId: -1 }).lean();
    let lastEventId = lastEvent ? lastEvent.eventId : 0;

    // 4. Синхронизация событий перевода
    const transferEventSync = await plaidClient.transferEventSync({
      after_id: lastEventId,
    });

    if (transferEventSync.data.transfer_events.length > 0) {
      lastEventId = transferEventSync.data.transfer_events.at(0).event_id;
      //Записали ивент в базу
      await EventsTransferCollection.create(
        [
          {
            userId: user._id,
            eventId: transferEventSync.data.transfer_events.at(0).event_id,
            eventType: transferEventSync.data.transfer_events.at(0).event_type,
            accountId: transferEventSync.data.transfer_events.at(0).account_id,
            transferAmount: transferEventSync.data.transfer_events.at(0).transfer_amount,
            transferId: transferEventSync.data.transfer_events.at(0).transfer_id,
            transferType: transferEventSync.data.transfer_events.at(0).transfer_type,
            timestamp: transferEventSync.data.transfer_events.at(0).timestamp,
          },
        ],
        { session },
      );
    }
    //Симулируем Webhook в Sandbox
    await plaidClient.sandboxTransferFireWebhook({
      webhook: env('WEBHOOK_URL'),
    });

    await session.commitTransaction();
    return transferResponse.data.transfer;
  } catch (error) {
    console.error(
      'Ошибка при авторизации и создании перевода:',
      error.response?.data || error.message,
    );
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/*=============================Получаем информацию о выбраном переводе==================*/
export const transferInfo = async (transferId) => {
  try {
    const transfer = await plaidClient.transferGet({ transfer_id: transferId });

    return transfer.data;
  } catch (error) {
    console.error(
      'Ошибка при отмене получении информации о трансфере',
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const transferList = async () => {
  try {
    const request = {
      start_date: '2025-02-19T22:35:49Z',
      end_date: '2025-02-21T22:35:49Z',
      count: 14,
      offset: 2,
      //   origination_account_id: '8945fedc-e703-463d-86b1-dc0607b55460',
    };

    const transferList = await plaidClient.transferList(request);

    return transferList.data;
  } catch (error) {
    console.error(
      'Ошибка при отмене получении списка трансферов',
      error.response?.data || error.message,
    );
    throw error;
  }
};

/*=============================Отмена трансфера========================*/
export const cancelTransfer = async (transferId, findTransfer) => {
  try {
    const response = await plaidClient.transferCancel({ transfer_id: transferId });
    const transferEventSync = await plaidClient.transferEventSync({
      after_id: 0,
    });

    //Симулируем ивент возврата в Sandbox
    if (transferEventSync.data.transfer_events.at(0).event_type === 'pending') {
      await plaidClient.sandboxTransferSimulate({
        transfer_id: transferEventSync.data.transfer_events.at(0).transfer_id,
        event_type: 'returned',
        failure_reason: transferEventSync.data.transfer_events.at(0).failure_reason,
      });
    }

    if (transferEventSync.data.transfer_events.length > 0) {
      await EventsTransferCollection.create({
        userId: findTransfer.userId,
        eventId: transferEventSync.data.transfer_events.at(0).event_id,
        eventType: transferEventSync.data.transfer_events.at(0).event_type,
        accountId: transferEventSync.data.transfer_events.at(0).account_id,
        transferAmount: transferEventSync.data.transfer_events.at(0).transfer_amount,
        transferId: transferEventSync.data.transfer_events.at(0).transfer_id,
        transferType: transferEventSync.data.transfer_events.at(0).transfer_type,
        timestamp: transferEventSync.data.transfer_events.at(0).timestamp,
      });
    }
    if (transferEventSync.data.transfer_events.at(0).event_type === 'returned') {
      await TransferCollection.findOneAndUpdate(
        { transferId: transferEventSync.data.transfer_events.at(0).transfer_id },
        {
          $set: {
            status: 'returned',
          },
        },
        { new: true },
      );
    }

    //Симулируем Webhook в Sandbox
    await plaidClient.sandboxTransferFireWebhook({
      webhook: env('WEBHOOK_URL'),
    });

    return response.data.request_id;
  } catch (error) {
    console.error('Ошибка при отмене трансфера', error.response?.data || error.message);
    throw error;
  }
};

/*===========================Получаем список событий для трансферов========================*/
export const transferListByEvents = async (dataFromFrontEnd, user) => {
  console.log(dataFromFrontEnd.query);

  try {
    const request = {
      start_date: '2025-02-19T22:35:49Z',
      end_date: '2025-02-21T22:35:49Z',
      // transfer_id: dataFromFrontEnd.query,
      account_id: 'pGnryBLZ9QCo78Q6nNnJhyjGwjNprphJvXPXa',
      transfer_type: 'debit',
      event_types: ['pending', 'posted', 'cancelled'],
      count: 25,
      offset: 0,
      // origination_account_id: '8945fedc-e703-463d-86b1-dc0607b55460',
    };

    const eventList = await plaidClient.transferEventList(request);
    return eventList.data;
  } catch (error) {
    console.error('Ошибка при отмене трансфера', error.response?.data || error.message);
    throw error;
  }
};
