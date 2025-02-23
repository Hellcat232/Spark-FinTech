import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import { env } from '../../utils/env.js';
import { findUser } from '../../microservices/auth.js';

import { createUsersAssets, fetchAssetReport } from '../../microservices/plaid/assets-service.js';

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

  await createUsersAssets(user);

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
