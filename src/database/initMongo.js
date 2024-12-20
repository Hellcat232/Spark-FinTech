import mongoose from 'mongoose';
import { env } from '../utils/env.js';

export const initMongo = async () => {
  try {
    const user = env('MONGODB_USER');
    const password = env('MONGODB_PASSWORD');
    const url = env('MONGODB_URL');
    const name = env('MONGODB_DB');

    const db = `mongodb+srv://${user}:${password}@${url}/${name}?retryWrites=true&w=majority&appName=SparkFinTech`;

    await mongoose.connect(db);

    console.log('Database connect');
  } catch (error) {
    console.log('Database can not connect', error);
    throw error;
  }
};
