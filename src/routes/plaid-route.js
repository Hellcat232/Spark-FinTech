import express from 'express';

import { getLinkTokenController, webhookController } from '../controllers/plaid-controllers.js';

const plaidRoute = express.Router();

plaidRoute.post('/linkToken', getLinkTokenController);

plaidRoute.post('/webhook', webhookController);

plaidRoute.post('/oauth-complete', async (req, res) => {
  const event = req.body;
  // console.log('from /api/plaid/oauth-complete', req);

  if (event.webhook_code === 'TRANSACTIONS_UPDATED') {
    // Обработайте обновление транзакций
    console.log('Transactions updated:', event);
  } else if (event.webhook_code === 'ITEM_ERROR') {
    // Обработайте ошибку элемента
    console.error('Item error:', event);
  }

  res.status(200).json({
    message: 'complete oauth',
    data: {
      token: req.params,
      token2: req.query,
      token3: req.headers,
      token4: req.body,
    },
  });
});

export default plaidRoute;
