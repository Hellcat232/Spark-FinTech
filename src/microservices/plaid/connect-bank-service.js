import { plaidClient } from '../../thirdAPI/initPlaid.js';
import { env } from '../../utils/env.js';
import { UserRegisterCollection } from '../../database/models/userModel.js';

/*=============Создаём LinkToken для отправки на FrontEnd=====================*/
export const linkTokenCreate = async (userCredentials) => {
  try {
    const request = {
      user: {
        client_user_id: userCredentials._id,
      },

      // auth: { auth_type_select_enabled: true },

      client_name: 'My FinTech App',
      products: ['auth', 'transactions', 'liabilities', 'assets', 'identity', 'transfer'],
      country_codes: ['US'],
      language: 'en',
      webhook: env('WEBHOOK_URL'),
      redirect_uri: 'http://localhost:5173/balance',
    };

    const response = await plaidClient.linkTokenCreate(request);

    return response.data;
  } catch (error) {
    console.log('Ошибка создания link_token', error.response?.data || error.message);
    return null;
  }
};

/*===========Тут обмениваем PublicToken на AccessToken==========*/
export const exchangePublicToken = async (publicToken) => {
  try {
    const response = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    return { accessToken, itemId };
  } catch (error) {
    console.log('Ошибка обмена токена:', error.response?.data || error.message);
  }
};

export const disconnectAccount = async (user) => {
  try {
    await UserRegisterCollection.findByIdAndUpdate(user._id, {
      $unset: { plaidAccessToken: 1, plaidItemId: 1 },
    });

    return;
  } catch (error) {
    console.error('Ошибка отключения Plaid:', error.response?.data || error.message);
  }
};
