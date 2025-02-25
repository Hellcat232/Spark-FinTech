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

export const getIdentityMatch = async (user) => {
  try {
    const response = await plaidClient.identityMatch({ access_token: user.plaidAccessToken });

    return response;
  } catch (error) {
    console.log('Ошибка сопоставления данных владельца:', error.response?.data || error.message);
  }
};

export const identityUpload = async (user) => {
  try {
    const response = await plaidClient.identityDocumentsUploadsGet({
      access_token: user.plaidAccessToken,
    });

    return response;
  } catch (error) {
    console.log('Ошибка сопоставления данных владельца:', error.response?.data || error.message);
  }
};
