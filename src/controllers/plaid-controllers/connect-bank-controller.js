import jwt from 'jsonwebtoken';
import createHttpError from 'http-errors';
import { findUser } from '../../microservices/auth.js';
import { env } from '../../utils/env.js';
import { UserRegisterCollection } from '../../database/models/userModel.js';

import {
  linkTokenCreate,
  exchangePublicToken,
  disconnectAccount,
} from '../../microservices/plaid/connect-bank-service.js';

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

  const response = await exchangePublicToken(publicToken, user._id);

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
