import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import { findUser } from '../../microservices/auth.js';
import { env } from '../../utils/env.js';
import { TransferCollection } from '../../database/models/transfersModel.js';

import {
  authorizeAndCreateTransfer,
  cancelTransfer,
  transferListByEvents,
  transferInfo,
  transferList,
} from '../../microservices/plaid/transfer-service.js';

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

export const transferInfoController = async (req, res) => {
  const { refreshToken } = req.cookies;
  const { transferId } = req.params;

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

  const aboutTransfer = await transferInfo(transferId);

  res.status(200).json({
    success: true,
    aboutTransfer,
  });
};

export const transferListController = async (req, res) => {
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

  const transfersList = await transferList(req.query, user);

  res.status(200).json({
    success: true,
    transfersList,
  });
};

/*========================Отмена трансфера и сообщение для FrontEnd========================*/
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
