import jwt from 'jsonwebtoken';
import createHttpError from 'http-errors';

import { UserRegisterCollection } from '../database/models/userModel.js';

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
  disconnectAccount,
} from '../microservices/plaid-sandbox.js';

/*Get accessToken from front-end, and create a link token with user's credentials*/
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

/*Exchange a link token on public token*/
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

/*Below getting info about balance within user's accounts*/
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

/*Below getting data about all user's transactions from every account*/
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
    userTransaction: response.data.transactions,
    institutionName: response.data.item,
  });
};

/*Get all user's bank account below*/
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

/*Get below user identity(KYC)*/
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

/*Create request to assets report below*/
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

/*Send to front-end getting report*/
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
