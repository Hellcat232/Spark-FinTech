import { initMongo } from './database/initMongo.js';
import server from './server.js';

const startApp = async () => {
  await initMongo();
  server();
};

startApp();
