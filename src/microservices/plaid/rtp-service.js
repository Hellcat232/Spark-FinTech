import mongoose from 'mongoose';
import createHttpError from 'http-errors';
import { v4 as uuidv4 } from 'uuid';
import { plaidClient } from '../../thirdAPI/initPlaid.js';

/*Использовать для быстрых платежей, с одобрением через UI*/

/*==================================Создаём быстрый перевод===============================*/
export const rtpTransferCreate = async (user, amount, sendFrom, sendTo, legalName, network) => {
  const session = await mongoose.startSession();
  const groupId = uuidv4();

  try {
    session.startTransaction();

    const rtpAuth = await plaidClient.transferAuthorizationCreate({
      access_token: user.plaidAccessToken,
      account_id: sendFrom,
      amount: amount,
      network: network,
      type: 'credit',
      user: {
        legal_name: legalName.legalName,
        email_address: user.email,
      },
    });

    if (
      !rtpAuth.data.authorization.decision ||
      rtpAuth.data.authorization.decision !== 'approved'
    ) {
      await plaidClient.transferAuthorizationCancel({
        authorization_id: rtpAuth.data.authorization.id,
      });
      throw createHttpError(409, '❌ RTP перевод не одобрен Plaid');
    }

    const transfer = await plaidClient.transferCreate({
      access_token: user.plaidAccessToken,
      authorization_id: rtpAuth.data.authorization.id,
      account_id: sendFrom,
      amount: amount,
      description: 'RTP transfer',
      metadata: { groupId },
    });

    await session.commitTransaction();
    return response.data;
  } catch (error) {
    session.abortTransaction();
    console.error('Ошибка создания RTP перевода', error.response?.data || error.message);
    throw error;
  } finally {
    session.endSession();
  }
};

/*========================Проверяем возможность быстрого перевода для счёта=============*/
export const rtpTransferEligibility = async (accountId, user) => {
  try {
    const request = {
      access_token: user.plaidAccessToken,
      account_id: accountId,
    };
    const response = await plaidClient.transferCapabilitiesGet(request);

    return response.data;
  } catch (error) {
    console.error('Ошибка при проверке доступности RTP', error.response?.data || error.message);
    throw error;
  }
};

/*==================================Получаем информацию о переводе=======================*/
export const rtpTransferGetInfo = async (transferIntentId) => {
  try {
    const response = await plaidClient.transferIntentGet({ transfer_intent_id: transferIntentId });

    return response.data;
  } catch (error) {
    console.error(
      'Ошибка получения информации о RTP перевода',
      error.response?.data || error.message,
    );
    throw error;
  }
};
