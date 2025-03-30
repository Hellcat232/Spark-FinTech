import mongoose from 'mongoose';
import createHttpError from 'http-errors';
import { v4 as uuidv4 } from 'uuid';

import { plaidClient } from '../../thirdAPI/initPlaid.js';
import { env } from '../../utils/env.js';
import { syncTransferEvents } from '../../utils/syncTransferEvents.js';

import { TransferCollection } from '../../database/models/transfersModel.js';
import { EventsTransferCollection } from '../../database/models/eventsTransferModel.js';
import { BankAccountCollection } from '../../database/models/accountsModel.js';
import { dwollaClient } from '../../thirdAPI/initDwolla.js';
import { writeToDB } from '../../utils/writeToDB.js';
import { sendMoney } from '../dwolla/dwolla-transfer-service.js';

/*Использовать для платежей, без одобрением через UI*/

/*==========================Отправляем средства=================*/
export const createDebitTransfer = async (user, amount, sendFrom, sendTo, legalName) => {
  const session = await mongoose.startSession();
  const groupId = uuidv4();

  await plaidClient.sandboxTransferSweepSimulate({}); //for sendbox
  await plaidClient.sandboxTransferLedgerSimulateAvailable({}); //for sendbox

  try {
    session.startTransaction();

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

    const from = await BankAccountCollection.findOne({ accountId: sendFrom });
    const to = await BankAccountCollection.findOne({ accountId: sendTo });

    if (from?.fundingSourceURL && to?.fundingSourceURL) {
      // const dwollaTransferRes = await dwollaClient.post('transfers', {
      //   _links: {
      //     source: { href: from.fundingSourceURL },
      //     destination: { href: to.fundingSourceURL },
      //   },
      //   amount: { currency: 'USD', value: amount },

      // });
      const dwollaTransferRes = await sendMoney(from, to, amount);

      const dwollaTransferUrl = dwollaTransferRes.headers?.get('location');
      const dwollaTransferId = dwollaTransferUrl?.split('/').pop();

      //Записали перевод в базу
      const transferDetails = await writeToDB(user, debitResponse, from, to, session, {
        dwollaTransferId,
        dwollaTransferUrl,
      });

      console.log('✅ Деньги успешно отправлены через Dwolla');
    } else {
      throw new Error('Не найдены funding source у отправителя или получателя');
    }

    // Синхронизация событий после дебетового списания
    await syncTransferEvents(user._id, session);

    //Симулируем Webhook в Sandbox
    await plaidClient.sandboxTransferFireWebhook({
      webhook: env('WEBHOOK_URL'),
    });

    await session.commitTransaction();
    return { debitDetails: debitResponse.data.transfer };
  } catch (error) {
    console.log(error.message);
    await session.abortTransaction();
    throw createHttpError(400, 'Не получилось списать средства с счёта');
  } finally {
    session.endSession();
  }
};

/*==========================Запрашиваем средства=================*/
export const createCreditTransfer = async (user, amount, sendFrom, sendTo, legalName) => {
  const session = await mongoose.startSession();
  const groupId = uuidv4();

  try {
    session.startTransaction();

    const creditAuth = await plaidClient.transferAuthorizationCreate({
      access_token: user.plaidAccessToken,
      account_id: sendFrom,
      amount: amount, // Сумма в строковом формате
      network: 'ach', // Используем ACH
      type: 'credit',
      ach_class: 'ppd', // PPD - личные платежи (можно использовать ccd)
      user: {
        legal_name: legalName,
        email_address: user.email,
      },
    });

    // Проверяем, разрешён ли перевод
    if (
      !creditAuth.data.authorization.decision ||
      creditAuth.data.authorization.decision !== 'approved'
    ) {
      await plaidClient.transferAuthorizationCancel({
        authorization_id: creditAuth.data.authorization.id,
      });
      throw createHttpError(409, 'Перевод не одобрен Plaid (списание)');
    }

    // 2. Создание перевода после успешной авторизации
    const creditResponse = await plaidClient.transferCreate({
      access_token: user.plaidAccessToken,
      authorization_id: creditAuth.data.authorization.id, // Берём ID авторизации
      account_id: sendFrom,
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

    const from = await BankAccountCollection.findOne({ accountId: sendFrom });
    const to = await BankAccountCollection.findOne({ accountId: sendTo });
    if (from?.fundingSourceURL && to?.fundingSourceURL) {
      await dwollaClient.post('transfers', {
        _links: {
          source: { href: from.fundingSourceURL },
          destination: { href: to.fundingSourceURL },
        },
        amount: { currency: 'USD', value: amount },
      });

      console.log('✅ Деньги успешно получены через Dwolla');
    } else {
      throw new Error('Не найдены funding source у отправителя или получателя');
    }

    //Записали перевод в базу
    const transferDetails = await writeToDB(user, creditResponse, from, to, session);

    // Синхронизация событий после кредитного перевода
    await syncTransferEvents(user._id, session);

    //Симулируем Webhook в Sandbox
    await plaidClient.sandboxTransferFireWebhook({
      webhook: env('WEBHOOK_URL'),
    });

    await session.commitTransaction();
    return { creditDetails: creditResponse.data.transfer, transferDetails };
  } catch (error) {
    console.log(error.message);
    await session.abortTransaction();
    throw createHttpError(400, 'Не получилось запросить средства с счёта');
  } finally {
    session.endSession();
  }
};

export const getTransferHistory = async (userId, filter) => {
  try {
    // Пагинация и фильтры из query
    const { page = 1, limit = 20, isExternal, status, type } = filter;
    const query = { userId };

    if (isExternal !== undefined) {
      query.isExternal = isExternal === 'true';
    }

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await TransferCollection.countDocuments(query);

    const transfers = await TransferCollection.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const formatted = transfers.map((t) => ({
      transferId: t.transferId,
      amount: t.amount,
      status: t.status,
      type: t.type, // 'debit' или 'credit'
      fromAccount: t.accountId,
      toUserId: t.toUserId,
      initiatedBy: t.initiatedBy,
      isExternal: t.isExternal,
      note: t.note,
      via: t.via,
      createdAt: t.createdAt,
    }));

    return {
      count: formatted.length,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      transfers: formatted,
    };
  } catch (error) {
    console.error('❌ Ошибка при получении истории переводов:', error.message);
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

/*===================Список переводов за определённое время===================*/
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
