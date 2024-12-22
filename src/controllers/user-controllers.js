import createHttpError from 'http-errors';
import { signUp, signIn, refresh, logOut, findUser } from '../microservices/auth.js';

import { setupSessionCookies } from '../utils/setupSessionCookies.js';

export const signUpController = async (req, res) => {
  const body = req.body;

  const { newSession, registerUser } = await signUp(body);

  setupSessionCookies(res, newSession);

  res.status(201).json({
    status: 201,
    message: 'New user added',
    data: {
      registerUser,
      accessToken: newSession.accessToken,
    },
  });
};

export const signInController = async (req, res) => {
  const { email, password } = req.body;
  const { sessionId } = req.cookies;

  const { currentUser, newSession } = await signIn(email, password, sessionId);

  res.clearCookie('sessionId');
  setupSessionCookies(res, newSession);

  res.status(200).json({
    status: 200,
    message: 'Login successfully',
    data: {
      currentUser,
      accessToken: newSession.accessToken,
    },
  });
};

export const refreshController = async (req, res) => {
  const { sessionId, refreshToken } = req.cookies;

  const { newSession, currentUser } = await refresh(sessionId, refreshToken);

  setupSessionCookies(res, newSession);

  res.status(200).json({
    status: 200,
    message: 'Refresh successfully',
    data: { currentUser, accessToken: newSession.accessToken },
  });
};

export const logOutController = async (req, res) => {
  const { sessionId, refreshToken } = req.cookies;

  await logOut(sessionId, refreshToken);

  res.clearCookie('sessionId');
  res.clearCookie('refreshToken');

  res.status(204).send();
};
