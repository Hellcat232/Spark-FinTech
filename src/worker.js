import mongoose from 'mongoose';
import { processWebhooksPlaid, proccessWebhookDwolla } from './microservices/webhooks.js';
import Synchronization from './microservices/Synchronization.js';
import { env } from './utils/env.js';

const db = `mongodb+srv://${env('MONGODB_USER')}:${env('MONGODB_PASSWORD')}@${env(
  'MONGODB_URL',
)}/${env('MONGODB_DB')}?retryWrites=true&w=majority&appName=SparkFinTech`;

mongoose.connect(db);

// Запускаем синхронизацию трансферов каждые 5 минут
setInterval(async () => {
  console.log('🔄 Запуск Synchronization...');
  await Synchronization();
}, 5 * 60 * 1000);

console.log('🚀 WebHook Worker запущен и слушает WebHooks...');

// Запускаем обработку WebHooks каждые 30 секунд
setInterval(async () => {
  console.log('🔄 Запуск обработки WebHooks...');

  await processWebhooksPlaid();
  await proccessWebhookDwolla();
}, 1000);
