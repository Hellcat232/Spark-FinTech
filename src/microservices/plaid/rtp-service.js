import { plaidClient } from '../../thirdAPI/initPlaid.js';

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

/*==================================Создаём быстрый перевод===============================*/
export const rtpTransferCreate = async (body, user) => {
  try {
    const request = {
      account_id: '3gE5gnRzNyfXpBK5wEEKcymJ5albGVUqg77gr',
      mode: 'PAYMENT',
      amount: '12.34',
      description: 'Desc',
      ach_class: 'ppd',
      origination_account_id: '9853defc-e703-463d-86b1-dc0607a45359',
      user: {
        legal_name: 'Anne Charleston',
      },
    };

    const response = await plaidClient.transferIntentCreate(request);

    return response.data;
  } catch (error) {
    console.error('Ошибка создания RTP перевода', error.response?.data || error.message);
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
