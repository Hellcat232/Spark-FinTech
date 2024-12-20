import dotenv from 'dotenv';

dotenv.config();

export const env = (number, defaultValue) => {
  const port = process.env[number];

  if (port) return port;

  if (defaultValue) return defaultValue;

  throw new Error(`Missing: procces.env[${number}]`);
};
