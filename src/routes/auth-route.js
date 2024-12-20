import express from 'express';

import { ctrlWrapper } from '../utils/ctrlWrapper.js';
import { validateBody } from '../utils/validateBody.js';

import { validationSignIn, validationSignUp } from '../validation/validationUser.js';

import {
  signUpController,
  signInController,
  logOutController,
} from '../controllers/user-controllers.js';

const authRoute = express.Router();

authRoute.post(
  '/register',
  validateBody(validationSignUp),
  ctrlWrapper(signUpController),
);
authRoute.post('/login', validateBody(validationSignIn), ctrlWrapper(signInController));
authRoute.post('/logout', ctrlWrapper(logOutController));

export default authRoute;
