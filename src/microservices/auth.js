import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { compareHash } from '../utils/hash.js';

import { env } from '../utils/env.js';
import { UserRegisterCollection } from '../database/models/userModel.js';
import { createSession, deleteSession, findSession } from './session.js';

import { sendEmail } from '../utils/sendEmail.js';

export const signUp = async (body) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const existingUser = await UserRegisterCollection.findOne({ email: body.email }).session(
      session,
    );
    if (existingUser) {
      throw createHttpError(409, 'Such email already exists');
    }

    const registerUser = await UserRegisterCollection.create([body], { session });

    const newSession = await createSession({ userId: registerUser[0]._id }, session);

    await session.commitTransaction();
    return { registerUser, newSession };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const signIn = async (email, password, sessionId) => {
  const existingUser = await UserRegisterCollection.findOne({ email });
  if (!existingUser) throw createHttpError(404, 'Such user not found, try register');

  const comparePassword = await compareHash(password, existingUser.password);
  if (!comparePassword) {
    throw createHttpError(401, 'Email or password invalid');
  }

  const data = {
    sessionId,
    userId: existingUser._id,
  };

  const newSession = await createSession(data);

  return { currentUser: existingUser, newSession };
};

export const refresh = async (sessionId, refreshToken) => {
  if (!sessionId && !refreshToken) {
    throw createHttpError(401, 'User not authorized');
  }

  const verifyToken = await jwt.verify(refreshToken, env('JWT_SECRET'));
  if (!verifyToken) {
    throw createHttpError(401, 'Token invalid!');
  }

  const isUser = await UserRegisterCollection.findById(verifyToken.userId);
  if (!isUser) {
    throw createHttpError(404, 'Such user not found');
  }

  const currentSession = await findSession({ _id: sessionId, userId: verifyToken.userId });
  if (!currentSession) {
    throw createHttpError(404, 'Session not found!');
  }

  const isExpiredSession = new Date() > new Date(currentSession.refreshTokenValidUntil);
  if (isExpiredSession) {
    throw createHttpError(401, 'Session expired!');
  }

  const data = {
    sessionId: currentSession._id,
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

  await deleteSession({ _id: sessionId, userId });
};

export const findUser = (filter) => UserRegisterCollection.findOne(filter);
