import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import { findUser } from '../../microservices/auth.js';
import { env } from '../../utils/env.js';

import { getUserTransaction } from '../../microservices/plaid/transaction-service.js';

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
