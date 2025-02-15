import mongoose from 'mongoose';
import processWebhooks from './microservices/webhooks.js';
import { env } from './utils/env.js';

const db = `mongodb+srv://${env('MONGODB_USER')}:${env('MONGODB_PASSWORD')}@${env(
  'MONGODB_URL',
)}/${env('MONGODB_DB')}?retryWrites=true&w=majority&appName=SparkFinTech`;

mongoose.connect(db);

console.log('🚀 WebHook Worker запущен и слушает WebHooks...');

// Запускаем обработку WebHooks каждые 30 секунд
setInterval(async () => {
  console.log('🔄 Запуск обработки WebHooks...');
  await processWebhooks();
}, 1000);
