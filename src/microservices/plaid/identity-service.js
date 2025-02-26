import { plaidClient } from '../../thirdAPI/initPlaid.js';

/*============================Получаем данные о владельце счетов для (KYC) авторизации============*/
export const getUserIdentity = async (user) => {
  try {
    const response = await plaidClient.identityGet({
      access_token: user.plaidAccessToken,
    });
    const identities = response.data.accounts.flatMap((account) => account.owners);

    return identities;
  } catch (error) {
    console.log('Ошибка получения данных владельца:', error.response?.data || error.message);
  }
};

export const getIdentityMatch = async (user) => {
  try {
    const request = {
      access_token: user.plaidAccessToken,
      user: {
        legal_name: 'Alberta Bobbeth Charleson',
        phone_number: '1112223333',
        email_address: 'accountholder0@example.com',
        address: {
          city: 'San Matias',
          country: 'US',
          postal_code: '93405-2255',
          region: 'CA',
          street: '2493 Leisure Lane',
        },
      },
    };

    const response = await plaidClient.identityMatch(request);
    const accounts = response.data.accounts;
    for (var account of accounts) {
      const legalNameScore = account.legal_name?.score;
      const phoneScore = account.phone_number?.score;
      const emailScore = account.email_address?.score;
      const addressScore = account.address?.score;

      return { legalNameScore, phoneScore, emailScore, addressScore };
    }
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
