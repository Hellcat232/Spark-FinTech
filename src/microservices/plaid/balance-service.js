import { plaidClient } from '../../thirdAPI/initPlaid.js';

/*============Получаем баланс с каждого счёта в банке===========*/
export const getUserBalance = async (user) => {
  try {
    const minLastUpdatedDatetime = new Date();
    minLastUpdatedDatetime.setDate(minLastUpdatedDatetime.getDate() - 30); // 30 дней назад

    const balanceResponse = await plaidClient.accountsBalanceGet({
      access_token: user.plaidAccessToken,
      options: {
        min_last_updated_datetime: minLastUpdatedDatetime.toISOString(),
      },
    });

    if (!balanceResponse || !balanceResponse.data || !balanceResponse.data.accounts) {
      throw new Error('Ошибка: данные о балансе отсутствуют.');
    }

    return balanceResponse;
  } catch (error) {
    console.log('Ошибка запроса баланса:', error.response?.data || error.message);
  }
};
