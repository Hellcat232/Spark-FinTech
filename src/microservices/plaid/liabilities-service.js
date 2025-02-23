import { plaidClient } from '../../thirdAPI/initPlaid.js';

/*=================Получаем данные по ипотекам и кредитам для счетов пользователя в банке(где приминимо)==========*/
export const getUserLiabilities = async (user) => {
  try {
    const response = await plaidClient.liabilitiesGet({
      access_token: user.plaidAccessToken,
    });

    return response;
  } catch (error) {
    console.log('Ошибка получения задолженностей:', error.response?.data || error.message);
  }
};
