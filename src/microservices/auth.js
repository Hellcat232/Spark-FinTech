import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';

import { env } from '../utils/env.js';
import { UserRegisterCollection } from '../database/models/userModel.js';
import { createSession, deleteSession, findSession } from './session.js';

export const signUp = async (body) => {
  const existingUser = await UserRegisterCollection.findOne({ email: body.email });
  if (existingUser) {
    throw createHttpError(409, 'Such email already exists');
  }

  const registerUser = await UserRegisterCollection.create(body);

  const data = {
    userId: registerUser._id,
  };

  const newSession = await createSession(data);

  return { registerUser, newSession };
};

export const signIn = async (email, sessionId) => {
  const existingUser = await UserRegisterCollection.findOne({ email });
  if (!existingUser) {
    throw createHttpError(404, 'Such user not found, try register');
  }

  const currentUser = await UserRegisterCollection.findOne({ email });

  const data = {
    sessionId,
    userId: currentUser._id,
  };

  const newSession = await createSession(data);

  return { currentUser, newSession };
};

export const refresh = async (sessionId, refreshToken) => {
  const currentSession = await findSession({ _id: sessionId });
  if (!currentSession) {
    throw createHttpError(404, 'Session not found!');
  }

  const isExpiredSession = new Date() > new Date(currentSession.refreshTokenValidUntil);
  if (isExpiredSession) {
    throw createHttpError(401, 'Session expired!');
  }

  const verifyToken = await jwt.verify(refreshToken, env('JWT_SECRET'));
  if (!verifyToken) {
    throw createHttpError(401, 'Token invalid!');
  }

  const isUser = await UserRegisterCollection.findById(verifyToken.userId);
  if (!isUser) {
    throw createHttpError(404, 'Such user not found');
  }

  const data = {
    sessionId,
    userId: isUser._id,
  };

  const newSession = await createSession(data);

  return { newSession, currentUser: isUser };
};

export const logOut = async (sessionId, refreshToken) => {
  const { userId } = await jwt.verify(refreshToken, env('JWT_SECRET'));

  const isUser = await UserRegisterCollection.findOne({ _id: userId });
  if (!isUser) {
    await deleteSession({ _id: sessionId });
    throw createHttpError(404, 'Such user not found');
  }

  const isLogged = await findSession({ _id: sessionId });
  if (!isLogged) {
    throw createHttpError(401, 'User not authorized');
  }

  await deleteSession({ _id: sessionId });
};

export const findUser = (filter) => UserRegisterCollection.findOne(filter);
