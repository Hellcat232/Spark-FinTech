import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import { env } from '../../utils/env.js';
import { findUser } from '../../microservices/auth.js';

import {
  getUserIdentity,
  getIdentityMatch,
  identityUpload,
} from '../../microservices/plaid/identity-service.js';

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

export const getIdentityMatchController = async (req, res) => {
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

  const identityMatch = await getIdentityMatch(user);

  res.status(200).json({
    success: true,
    identityMatch,
  });
};

export const identityUploadController = async (req, res) => {
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

  const upload = await identityUpload(user);

  res.status(200).json({
    success: true,
    upload,
  });
};
