import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import { findUser } from '../../microservices/auth.js';
import { env } from '../../utils/env.js';

import {
  createRecurringTransfer,
  cancelRecurringTransfer,
  getRecurringTransferInfo,
  getRecurringTransferList,
} from '../../microservices/plaid/reccuring-transfer-service.js';

export const createRecurringTransferController = async (req, res) => {
  const { refreshToken } = req.cookies;
  const body = req.body;

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

  const recurringTransfer = await createRecurringTransfer(body, user);

  res.status(200).json({
    success: true,
    recurringTransfer,
  });
};

export const cancelRecurringTransferController = async (req, res) => {
  const { recurringTransferId } = req.body;
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

  await cancelRecurringTransfer(recurringTransferId);

  res.status(200).json({
    success: true,
    message: 'Recurring transfer cancelled',
  });
};

export const getRecurringTransferInfoController = async (req, res) => {
  const { recurringTransferId } = req.params;
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

  const reccuringTransferInfo = await getRecurringTransferInfo(recurringTransferId);

  res.status(200).json({
    success: true,
    reccuringTransferInfo,
  });
};

export const getRecurringTransferListController = async (req, res) => {
  const body = req.body;
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

  const recurringTransferList = await getRecurringTransferList(body);

  res.status(200).json({
    success: true,
    recurringTransferList,
  });
};
