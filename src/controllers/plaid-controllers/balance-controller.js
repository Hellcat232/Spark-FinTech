import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import { env } from '../../utils/env.js';
import { findUser } from '../../microservices/auth.js';

import { getUserBalance } from '../../microservices/plaid/balance-service.js';

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
