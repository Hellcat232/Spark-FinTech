import jwt from 'jsonwebtoken';
import createHttpError from 'http-errors';

import { UserRegisterCollection } from '../database/models/userModel.js';
import { TransferCollection } from '../database/models/transfersModel.js';

import { env } from '../utils/env.js';

import { findUser } from '../microservices/auth.js';

import {
  linkTokenCreate,
  exchangePublicToken,
  getUserBalance,
  getUserTransaction,
  getAllUserBankAccounts,
  getUserIdentity,
  getUserLiabilities,
  getUsersAssets,
  fetchAssetReport,
  authorizeAndCreateTransfer,
  cancelTransfer,
  disconnectAccount,
} from '../microservices/plaid-sandbox.js';

/*================Отправляем LinkToken на FrontEnd для обмена на PublicToken==========================*/
export const linkTokenCreateController = async (req, res) => {
  const { accessToken } = req.body;

  const encode = await jwt.verify(accessToken, env('JWT_SECRET'));
  if (!encode) {
    throw createHttpError(401, 'Token invalid!');
  }

  const user = await findUser({ _id: encode.userId });
  if (!user) {
    throw createHttpError(404, 'User not found!');
  }

  const response = await linkTokenCreate(user);

  res.status(200).json({ link_token: response.link_token });
};

/*====Получаем PublicToken с FrontEnd для обмена на AccessToken и записываем AccessToken и ItemId в базу==============*/
export const exchangePublicTokenController = async (req, res) => {
  const { publicToken, accessToken } = req.body;

  if (!publicToken) {
    throw createHttpError(400, 'Public token not found');
  }

  const decode = await jwt.verify(accessToken, env('JWT_SECRET'));
  if (!decode) {
    throw createHttpError(401, 'Token invalid!');
  }

  const user = await findUser({ _id: decode.userId });
  if (!user) {
    throw createHttpError(404, 'User not found!');
  }

  const response = await exchangePublicToken(publicToken);

  await UserRegisterCollection.findByIdAndUpdate(
    user._id,
    {
      $set: {
        plaidAccessToken: response.accessToken,
        plaidItemId: response.itemId,
      },
    },
    { new: true },
  );

  res.json({ success: true });
};

/*========================Отправляем на FrontEnd результат авторизации трансфера и записываем в базу=============*/
export const createTransferController = async (req, res) => {
  const { refreshToken } = req.cookies;
  const { amount, destinationAccount, accountsId, legalName } = req.body;
  // console.log(req.body);

  const decode = await jwt.verify(refreshToken, env('JWT_SECRET'));
  if (!decode) {
    throw createHttpError(401, 'Token invalid!');
  }

  const user = await findUser({ _id: decode.userId });
  if (!user) {
    throw createHttpError(404, 'User not found!');
  } else if (!user.plaidAccessToken) {
    throw createHttpError(400, 'Plaid not connected');
  }

  const transfer = await authorizeAndCreateTransfer(user, amount, accountsId, legalName);

  res.status(200).json({
    success: true,
    message: 'Перевод успешно создан!',
    transfer,
  });
};

export const cancelTransferController = async (req, res) => {
  const { transferId } = req.body;

  const findTransfer = await TransferCollection.findOne({ transferId });
  if (!findTransfer) {
    throw createHttpError(404, 'Трансфер не найден');
  }

  await cancelTransfer(transferId, findTransfer);

  // await TransferCollection.findOneAndDelete({ transferId });

  res.status(200).json({
    success: true,
    message: 'Transfer was cancelled',
  });
};

/*===================Отправляем данные о балансе на FrontEnd==================*/
export const getUserBalanceController = async (req, res) => {
  const { refreshToken } = req.cookies;

  const decode = await jwt.verify(refreshToken, env('JWT_SECRET'));
  if (!decode) {
    throw createHttpError(401, 'Token invalid!');
  }

  const user = await findUser({ _id: decode.userId });
  if (!user) {
    throw createHttpError(404, 'User not found!');
  } else if (!user.plaidAccessToken) {
    throw createHttpError(400, 'Plaid not connected');
  }

  const balances = await getUserBalance(user);
  if (!balances) {
    throw createHttpError(500, 'Ошибка получения баланса');
  }

  res.status(200).json({
    success: true,
    accountsBalance: balances.data.accounts,
    institutionName: balances.data.item,
  });
};

/*====================Отправляем данные о Transaction пользователя на FrontEnd============*/
export const getUserTransactionController = async (req, res) => {
  const { refreshToken } = req.cookies;

  const decode = await jwt.verify(refreshToken, env('JWT_SECRET'));
  if (!decode) {
    throw createHttpError(401, 'Token invalid!');
  }

  const user = await findUser({ _id: decode.userId });
  if (!user) {
    throw createHttpError(404, 'User not found!');
  } else if (!user.plaidAccessToken) {
    throw createHttpError(400, 'Plaid not connected');
  }

  const response = await getUserTransaction(user);

  res.status(200).json({
    success: true,
    userTransaction: response.data,
  });
};

/*============Отправляем на FrontEnd данные о всех счетах пользователя в подключеном банке=========*/
export const getAllUserBankAccountsController = async (req, res) => {
  const { refreshToken } = req.cookies;

  const decode = await jwt.verify(refreshToken, env('JWT_SECRET'));
  if (!decode) {
    throw createHttpError(401, 'Token invalid!');
  }

  const user = await findUser({ _id: decode.userId });
  if (!user) {
    throw createHttpError(404, 'User not found!');
  } else if (!user.plaidAccessToken) {
    throw createHttpError(400, 'Plaid not connected');
  }

  const response = await getAllUserBankAccounts(user);

  res.status(200).json({
    success: true,
    allUserBankAccounts: response.data.accounts,
    institutionName: response.data.item,
  });
};

/*==============Отправляем на FrontEnd данные о владельце счетов для (KYC) авторизации=======*/
export const getUserIdentityController = async (req, res) => {
  const { refreshToken } = req.cookies;

  const decode = await jwt.verify(refreshToken, env('JWT_SECRET'));
  if (!decode) {
    throw createHttpError(401, 'Token invalid!');
  }

  const user = await findUser({ _id: decode.userId });
  if (!user) {
    throw createHttpError(404, 'User not found!');
  } else if (!user.plaidAccessToken) {
    throw createHttpError(400, 'Plaid not connected');
  }

  const response = await getUserIdentity(user);

  res
    .status(200)
    .json({ success: true, identity: response.data.accounts, institutionName: response.data.item });
};

// export const getUsersIncomeController = async (req, res) => {
//   const { refreshToken } = req.cookies;

//   const decode = await jwt.verify(refreshToken, env('JWT_SECRET'));
//   if (!decode) {
//     throw createHttpError(401, 'Token invalid!');
//   }

//   const user = await findUser({ _id: decode.userId });
//   if (!user) {
//     throw createHttpError(404, 'User not found!');
//   } else if (!user.plaidAccessToken) {
//     throw createHttpError(400, 'Plaid not connected');
//   }

//   const response = await getUsersIncome(user);

//   res.status(200).json({
//     success: true,
//     income: response.data.income,
//   });
// };

/*=================Отправляем на FrontEnd данные по ипотекам и кредитам для счетов пользователя в банке(где приминимо)==========*/
export const getUserLiabilitiesController = async (req, res) => {
  const { refreshToken } = req.cookies;

  const decode = await jwt.verify(refreshToken, env('JWT_SECRET'));
  if (!decode) {
    throw createHttpError(401, 'Token invalid!');
  }

  const user = await findUser({ _id: decode.userId });
  if (!user) {
    throw createHttpError(404, 'User not found!');
  } else if (!user.plaidAccessToken) {
    throw createHttpError(400, 'Plaid not connected');
  }

  const response = await getUserLiabilities(user);

  res.status(200).json({
    success: true,
    liabilities: response.data,
  });
};

/*=============Инициализация создания отчёта о финансовом здоровье пользователя на FrontEnd-е ================*/
export const getUsersAssetsController = async (req, res) => {
  const { refreshToken } = req.cookies;

  const decode = await jwt.verify(refreshToken, env('JWT_SECRET'));
  if (!decode) {
    throw createHttpError(401, 'Token invalid!');
  }

  const user = await findUser({ _id: decode.userId });
  if (!user) {
    throw createHttpError(404, 'User not found!');
  } else if (!user.plaidAccessToken) {
    throw createHttpError(400, 'Plaid not connected');
  }
  // console.log(user, 'getUsersAssetsController');

  await getUsersAssets(user);

  res.status(200).json({
    success: true,
    message: 'Assets processed, waiting Webhook!',
  });
};

/*=============Отправляем созданый отчёт о финансовом здоровье пользователя на FrontEnd================*/
export const fetchAssetReportController = async (req, res) => {
  const { refreshToken } = req.cookies;

  const decode = await jwt.verify(refreshToken, env('JWT_SECRET'));
  if (!decode) {
    throw createHttpError(401, 'Token invalid!');
  }

  const user = await findUser({ _id: decode.userId });
  if (!user) {
    throw createHttpError(404, 'User not found!');
  } else if (!user.plaidAccessToken) {
    throw createHttpError(400, 'Plaid not connected');
  }

  const response = await fetchAssetReport(user);

  res.status(200).json({
    success: true,
    assetReport: response.data.report,
  });
};

/*Disconnect bank account by Plaid and delete PlaidAccessToken and PlaidItemId from user document within DB*/
export const disconnectAccountController = async (req, res) => {
  const { refreshToken } = req.cookies;

  const decode = await jwt.verify(refreshToken, env('JWT_SECRET'));
  if (!decode) {
    throw createHttpError(401, 'Token invalid!');
  }

  const user = await findUser({ _id: decode.userId });
  if (!user) {
    throw createHttpError(404, 'User not found!');
  } else if (!user.plaidAccessToken) {
    throw createHttpError(400, 'Plaid not connected');
  }

  await disconnectAccount(user);

  res.status(200).json({ success: true, message: 'Plaid disconnect' });
};
