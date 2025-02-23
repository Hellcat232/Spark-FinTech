import { plaidClient } from '../../thirdAPI/initPlaid.js';

/*===================Получаем все счета пользователя в подключеном банке===========*/
export const getAllUserBankAccounts = async (user) => {
  try {
    const response = await plaidClient.accountsGet({
      access_token: user.plaidAccessToken,
    });

    return response;
  } catch (error) {
    console.log('Ошибка получения счетов:', error.response?.data || error.message);
  }
};
