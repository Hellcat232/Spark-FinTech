import crypto from 'crypto';
import { env } from '../../utils/env.js';

const DWOLLA_WEBHOOK_SECRET = env('DWOLLA_WEBHOOK_SECRET');

export const verifyDwollaSignature = (signature, rawBody) => {
  const hash = crypto.createHmac('sha256', DWOLLA_WEBHOOK_SECRET).update(rawBody).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hash));
};
