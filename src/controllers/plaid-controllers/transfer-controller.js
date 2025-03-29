import createHttpError from 'http-errors';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { findUser } from '../../microservices/auth.js';
import { env } from '../../utils/env.js';
import { TransferCollection } from '../../database/models/transfersModel.js';

// import {
//   transferBetweenAccounts,
//   cancelTransfer,
//   transferListByEvents,
//   transferInfo,
//   transferList,
// } from '../../microservices/plaid/transfer-service.js';

import {
  createDebitTransfer,
  createCreditTransfer,
  cancelTransfer,
  transferListByEvents,
  getTransferHistory,
  transferInfo,
  transferList,
} from '../../microservices/plaid/transfer-service-d.js';

import { sendMoney } from '../../microservices/dwolla/dwolla-transfer.service.js';

/*========================Отправляем на FrontEnd результат авторизации трансфера и записываем в базу=============*/
export const createDebitTransferController = async (req, res) => {
  const { refreshToken } = req.cookies;
  const { amount, sendFrom, sendTo, legalName } = req.body;
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

  const transfer = await createDebitTransfer(user, amount, sendFrom, sendTo, legalName);

  res.status(200).json({
    success: true,
    message: 'Перевод успешно создан!',
    transfer,
  });
};

export const getTransferHistoryController = async (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) throw createHttpError(401, 'Unauthorized: no token');

  const decode = jwt.verify(refreshToken, env('JWT_SECRET'));
  const userId = decode.userId;

  const transfersHistory = await getTransferHistory(userId, req.query);

  res.status(200).json({
    success: true,
    transfersHistory,
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
