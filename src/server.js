import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { env } from './utils/env.js';
import notFoundHandler from './middleware/notFoundHandler.js';
import errorHandle from './middleware/errorHandle.js';

import authRoute from './routes/auth-route.js';

const PORT = env('PORT');

const server = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/auth', authRoute);

  app.use('*', notFoundHandler);

  app.use(errorHandle);

  app.listen(PORT, () => {
    console.log(`PORT: ${PORT}`);
  });
};

export default server;
