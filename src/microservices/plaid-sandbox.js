import createHttpError from 'http-errors';
import { plaidClient } from '../thirdAPI/initPlaid.js';
import { UserRegisterCollection } from '../database/models/userModel.js';
import { env } from '../utils/env.js';
import { findUser } from './auth.js';

/*=============Создаём LinkToken для отправки на FrontEnd=====================*/
export const linkTokenCreate = async (userCredentials) => {
  try {
    const request = {
      user: {
        client_user_id: userCredentials._id,
      },

      // auth: { auth_type_select_enabled: true },

      client_name: 'My FinTech App',
      products: ['auth', 'transactions', 'liabilities', 'assets', 'identity'],
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

/*==========================Создаем авторизацию трансфера и получаем разрешение=================*/
export const authorizeAndCreateTransfer = async (user, amount, accountId, legalName) => {
  try {
    // 1. Авторизация перевода
    const authResponse = await plaidClient.transferAuthorizationCreate({
      access_token: user.plaidAccessToken,
      account_id: accountId,
      amount: amount, // Сумма в строковом формате
      network: 'ach', // Используем ACH
      type: 'debit',
      ach_class: 'ppd', // PPD - личные платежи (можно использовать ccd)
      user: {
        legal_name: legalName,
        email_address: user.email,
      },
    });

    // Проверяем, разрешён ли перевод
    if (
      !authResponse.data.authorization.decision ||
      authResponse.data.authorization.decision !== 'approved'
    ) {
      throw new Error('Перевод не одобрен Plaid');
    }

    // 2. Создание перевода после успешной авторизации
    const transferResponse = await plaidClient.transferCreate({
      access_token: user.plaidAccessToken,
      authorization_id: authResponse.data.authorization.id, // Берём ID авторизации
      account_id: accountId,
      amount: amount,
      description: 'payment',
    });

    return transferResponse.data.transfer;
  } catch (error) {
    console.error(
      'Ошибка при авторизации и создании перевода:',
      error.response?.data || error.message,
    );
    throw error;
  }
};

/*=============================Отмена трансфера========================*/
export const cancelTransfer = async (transferId) => {
  try {
    const response = await plaidClient.transferCancel({ transfer_id: transferId });

    return response.data.request_id;
  } catch (error) {
    console.error('Ошибка при отмене трансфера', error.response?.data || error.message);
    throw error;
  }
};

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

// export const getUsersIncome = async (user) => {
//   try {
//     const response = await plaidClient({
//       access_token: user.plaidAccessToken,
//     });
//     console.log(response);

//     return response;
//   } catch (error) {
//     console.log('Ошибка получения доходов:', error.response?.data || error.message);
//   }
// };

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

/*=============Создания отчёта о финансовом здоровье пользователя================*/
export const getUsersAssets = async (user) => {
  try {
    const createReport = await plaidClient.assetReportCreate({
      access_tokens: [user.plaidAccessToken],
      days_requested: 60,
      options: {
        webhook: env('WEBHOOK_URL'),
      },
    });

    if (!createReport.data?.asset_report_token || !createReport.data?.asset_report_id) {
      throw new Error('Ошибка: Не удалось получить asset_report_token или asset_report_id!');
    }

    const updatedUser = await UserRegisterCollection.findByIdAndUpdate(
      user._id,
      {
        $set: {
          reportAssetsToken: createReport.data.asset_report_token,
          reportAssetsId: createReport.data.asset_report_id,
        },
      },
      { new: true, upsert: true },
    ).lean();

    if (!updatedUser) {
      throw new Error('Ошибка: Не удалось сохранить asset_report_token!');
    }

    return createReport;
  } catch (error) {
    console.log('Ошибка при создании отчета:', error.response?.data || error.message);
  }
};

/*=============Получение отчёта о финансовом здоровье пользователя================*/
export const fetchAssetReport = async (user) => {
  try {
    if (!user) {
      throw createHttpError(
        404,
        `Ошибка: Пользователь с asset_report_id ${user.reportAssetsId} не найден в базе!`,
      );
    }

    if (!user.reportAssetsToken) {
      throw createHttpError(
        404,
        `Ошибка: reportAssetsToken отсутствует для asset_report_id ${user.reportAssetsId}`,
      );
    }

    const response = await plaidClient.assetReportGet({
      asset_report_token: user.reportAssetsToken,
      include_insights: true,
    });

    return response;
  } catch (error) {
    console.log(error || 'Ошибка получения отчёта');
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
