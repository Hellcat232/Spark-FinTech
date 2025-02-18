import axios from 'axios';
import { Readable } from 'stream';
import csvParser from 'csv-parser';

import { env } from './env.js';

export const downloadCSV = async () => {
  try {
    const url = env('CSV_URL');
    console.log('📥 Загружаем CSV с URL:', url);

    // Запрашиваем CSV-файл как Buffer
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    // Конвертируем Buffer в поток (stream)
    const stream = Readable.from(response.data.toString('utf-8'));
    // Парсим CSV и сохраняем в массив объектов
    const categories = [];

    await new Promise((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on('data', (row) => categories.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    console.log('✅ CSV-файл загружен и обработан!');
    return categories;
  } catch (error) {
    console.error('❌ Ошибка загрузки CSV:', error.message);
  }
};
