import createHttpError from 'http-errors';
import { UserRegisterCollection } from '../database/models/userModel.js';
import { createSession, deleteSession } from './session.js';

export const findUser = (filter) => UserRegisterCollection.findOne(filter);

export const signUp = async (body) => {
  const registerUser = await UserRegisterCollection.create(body);

  const data = {
    userId: registerUser._id,
  };

  const newSession = await createSession(data);

  return { registerUser, newSession };
};

export const signIn = async (email) => {
  const getUser = await UserRegisterCollection.findOne({ email });

  return getUser;
};

export const refresh = async (sessionId, userId) => {
  const session = await createSession(sessionId, userId);

  return session;
};

export const logOut = async (id) => {
  await deleteSession(id);
};
