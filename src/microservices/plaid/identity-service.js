import { plaidClient } from '../../thirdAPI/initPlaid.js';

/*============================Получаем данные о владельце счетов для (KYC) авторизации============*/
export const getUserIdentity = async (user) => {
  try {
    const response = await plaidClient.identityGet({
      access_token: user.plaidAccessToken,
    });

    return response;
  } catch (error) {
    console.log('Ошибка получения данных владельца:', error.response?.data || error.message);
  }
};
