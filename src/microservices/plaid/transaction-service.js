import { plaidClient } from '../../thirdAPI/initPlaid.js';

/*============Получаем Transaction со всех счетов пользователя в подключеном банке===========*/
export const getUserTransaction = async (user) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();

    const response = await plaidClient.transactionsSync({
      access_token: user.plaidAccessToken,

      // start_date: startDate.toISOString().split('T')[0],
      // end_date: endDate.toISOString().split('T')[0],
      // options: { count: 50, offset: 0 },
    });

    return response;
  } catch (error) {
    console.error('Ошибка запроса транзакций:', error.response?.data || error.message);
  }
};
