import { initMongo } from './src/database/initMongo.js';
import app from './src/app.js';

const startApp = async () => {
  await initMongo();
  app();
};

startApp();
