import createHttpError from 'http-errors';
import { signUp, signIn, refresh, logOut, findUser } from '../microservices/auth.js';

export const signUpController = async (req, res) => {
  const body = req.body;

  const user = await findUser({ email: body.email });
  if (user) {
    throw createHttpError(409, 'Such email already exists');
  }

  const { newSession, registerUser } = await signUp(body);

  res.cookie('sessionId', newSession._id, {
    httpOnly: true,
    expires: newSession.refreshTokenValidUntil,
  });

  res.cookie('refreshToken', newSession.refreshToken, {
    httpOnly: true,
    expires: newSession.refreshTokenValidUntil,
  });

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
  const { email } = req.body;

  const currentUser = await signIn(email);

  res.status(200).json({
    status: 200,
    message: 'Login successfully',
    data: currentUser,
  });
};

export const refreshController = async (req, res) => {};

export const logOutController = async (req, res) => {
  await logOut();

  res.status(204).send();
};
