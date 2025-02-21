import { initMongo } from './src/database/initMongo.js';
import Synchronization from './src/microservices/Synchronization.js';
import app from './src/app.js';

import { downloadCSV } from './src/utils/downloadTransactionCategory.js';

const startApp = async () => {
  await initMongo();
  // await Synchronization();
  await downloadCSV();
  app();
};

startApp();
