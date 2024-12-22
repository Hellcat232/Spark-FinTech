import jwt from 'jsonwebtoken';

import { SessionCollection } from '../database/models/sessionModel.js';

import { env } from '../utils/env.js';

import { ACCESS_TOKEN_LIFETIME, REFRESH_TOKEN_LIFETIME } from '../constants/sessionConstants.js';

const jwt_secret = env('JWT_SECRET');

export const createSession = async ({ sessionId, userId }, session) => {
  if (sessionId) {
    await SessionCollection.deleteOne({ _id: sessionId, userId }).session(session);
  }

  const payload = {
    userId,
  };

  const accessToken = jwt.sign(payload, jwt_secret, { expiresIn: ACCESS_TOKEN_LIFETIME });
  const refreshToken = jwt.sign(payload, jwt_secret, { expiresIn: REFRESH_TOKEN_LIFETIME });
  const accessTokenValidUntil = new Date(Date.now() + ACCESS_TOKEN_LIFETIME);
  const refreshTokenValidUntil = new Date(Date.now() + REFRESH_TOKEN_LIFETIME);

  return await SessionCollection.create(
    [
      {
        accessToken,
        refreshToken,
        accessTokenValidUntil,
        refreshTokenValidUntil,
        userId,
      },
    ],
    { session },
  );
};

export const deleteSession = (filter) => SessionCollection.deleteOne(filter);

export const findSession = (filter) => SessionCollection.findOne(filter);
