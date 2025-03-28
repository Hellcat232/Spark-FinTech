import mongoose from 'mongoose';
import createHttpError from 'http-errors';
import { v4 as uuidv4 } from 'uuid';

import { plaidClient } from '../../thirdAPI/initPlaid.js';
import { env } from '../../utils/env.js';
import { syncTransferEvents } from '../../utils/syncTransferEvents.js';

import { TransferCollection } from '../../database/models/transfersModel.js';
import { EventsTransferCollection } from '../../database/models/eventsTransferModel.js';

/*Использовать для платежей, без одобрением через UI*/

/*==========================Отправляем средства=================*/
export const transferBetweenAccounts = async (user, amount, sendFrom, sendTo, legalName) => {
  const session = await mongoose.startSession();
  const groupId = uuidv4();

  await plaidClient.sandboxTransferSweepSimulate({}); //for sendbox
  await plaidClient.sandboxTransferLedgerSimulateAvailable({}); //for sendbox

  try {
    session.startTransaction();

    // 1. Авторизация перевода
    const debitAuth = await plaidClient.transferAuthorizationCreate({
      access_token: user.plaidAccessToken,
      account_id: sendFrom,
      amount: amount, // Сумма в строковом формате
      network: 'ach', // Используем ACH
      type: 'debit',
      ach_class: 'ppd', // PPD - личные платежи (можно использовать ccd)
      user: {
        legal_name: legalName,
        email_address: user.email,
      },
    });

    // console.log(debitAuth.data.authorization, 'debit');

    // Проверяем, разрешён ли перевод
    if (
      !debitAuth.data.authorization.decision ||
      debitAuth.data.authorization.decision !== 'approved'
    ) {
      await plaidClient.transferAuthorizationCancel({
        authorization_id: debitAuth.data.authorization.id,
      });
      throw createHttpError(409, 'Перевод не одобрен Plaid (списание)');
    }

    // 2. Создание перевода после успешной авторизации
    const debitResponse = await plaidClient.transferCreate({
      access_token: user.plaidAccessToken,
      authorization_id: debitAuth.data.authorization.id, // Берём ID авторизации
      account_id: sendFrom,
      amount: amount,
      description: 'payment',
      metadata: { groupId },
    });
    //for sandbox
    if (debitResponse) {
      await plaidClient.sandboxTransferSimulate({
        transfer_id: debitResponse.data.transfer.id,
        event_type: 'posted',
      });

      await plaidClient.sandboxTransferSimulate({
        transfer_id: debitResponse.data.transfer.id,
        event_type: 'settled',
      });
    }

    //Записали перевод в базу
    await TransferCollection.create(
      [
        {
          userId: user._id,
          transferId: debitResponse.data.transfer.id,
          amount: debitResponse.data.transfer.amount,
          // status: debitResponse.data.transfer.status,
          status: 'settled',
          type: debitResponse.data.transfer.type,
          accountId: debitResponse.data.transfer.account_id,
          groupId: debitResponse.data.transfer.metadata.groupId,
        },
      ],
      { session },
    );

    // Синхронизация после дебита
    // await syncTransferEvents(user._id, session);

    //5.Авторизация получения
    const creditAuth = await plaidClient.transferAuthorizationCreate({
      access_token: user.plaidAccessToken,
      account_id: sendTo,
      amount: amount,
      network: 'ach',
      type: 'credit',
      ach_class: 'ppd',
      user: {
        legal_name: legalName,
        email_address: user.email,
      },
    });

    // console.log(creditAuth.data.authorization, 'credit');

    // Проверяем, разрешёно ли зачисление
    if (
      !creditAuth.data.authorization.decision ||
      creditAuth.data.authorization.decision !== 'approved'
    ) {
      await plaidClient.transferAuthorizationCancel({
        authorization_id: creditAuth.data.authorization.id,
      });
      throw createHttpError(409, 'Перевод не одобрен Plaid (получение)');
    }

    const creditResponse = await plaidClient.transferCreate({
      access_token: user.plaidAccessToken,
      authorization_id: creditAuth.data.authorization.id, // Берём ID авторизации
      account_id: sendTo,
      amount: amount,
      description: 'payment',
      metadata: { groupId },
    });
    if (creditResponse) {
      await plaidClient.sandboxTransferSimulate({
        transfer_id: creditResponse.data.transfer.id,
        event_type: 'posted',
      });

      await plaidClient.sandboxTransferSimulate({
        transfer_id: creditResponse.data.transfer.id,
        event_type: 'settled',
      });
    }

    //Записали зачисление в базу
    await TransferCollection.create(
      [
        {
          userId: user._id,
          transferId: creditResponse.data.transfer.id,
          amount: creditResponse.data.transfer.amount,
          // status: creditResponse.data.transfer.status,
          status: 'settled',
          type: creditResponse.data.transfer.type,
          accountId: creditResponse.data.transfer.account_id,
          groupId: creditResponse.data.transfer.metadata.groupId,
        },
      ],
      { session },
    );

    // Синхронизация событий после кредитного перевода
    await syncTransferEvents(user._id, session);

    //Симулируем Webhook в Sandbox
    await plaidClient.sandboxTransferFireWebhook({
      webhook: env('WEBHOOK_URL'),
    });

    await session.commitTransaction();
    return { debit: debitResponse.data.transfer, credit: creditResponse.data.transfer };
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
