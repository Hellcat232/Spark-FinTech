import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';

import { env } from './utils/env.js';
import notFoundHandler from './middleware/notFoundHandler.js';
import errorHandle from './middleware/errorHandle.js';

import authRoute from './routes/auth-route.js';
import plaidRoute from './routes/plaid-route.js';
import webhooksRoute from './routes/webhooks-route.js';

const PORT = env('PORT');

const app = () => {
  const app = express();

  app.use(
    cors({
      origin: 'http://localhost:5173',
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(bodyParser.json());

  app.use('/api/auth', authRoute);
  app.use('/api/plaid', plaidRoute);
  app.use('/api/webhook', webhooksRoute);

  app.use('*', notFoundHandler);

  app.use(errorHandle);

  app.listen(PORT, () => {
    console.log(`PORT: ${PORT}`);
  });
};

export default app;
