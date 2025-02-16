import { initMongo } from './src/database/initMongo.js';
import server from './src/server.js';

const startApp = async () => {
  await initMongo();
  server();
};

startApp();
