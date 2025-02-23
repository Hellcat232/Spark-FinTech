import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import { env } from '../../utils/env.js';
import { findUser } from '../../microservices/auth.js';

import {
  rtpTransferEligibility,
  rtpTransferCreate,
  rtpTransferGetInfo,
} from '../../microservices/plaid/rtp-service.js';

export const rtpTransferEligibilityController = async (req, res) => {
  const { accountId } = req.body;
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

  const rtpEligibility = await rtpTransferEligibility(accountId, user);

  res.status(200).json({
    success: true,
    rtpEligibility,
  });
};

export const rtpTransferCreateController = async (req, res) => {
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

  const createRTP = await rtpTransferCreate(body, user);

  res.status(200).json({
    success: true,
    createRTP,
  });
};

export const rtpTransferGetInfoController = async (req, res) => {
  const { transferIntentId } = req.body;
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

  const rtpInfo = await rtpTransferGetInfo(transferIntentId);

  res.status(200).json({
    success: true,
    rtpInfo,
  });
};
