import express from 'express';

import {
  webhookControllerPlaid,
  webhookControllerDwolla,
} from '../controllers/webhooks-controller.js';

const webhooksRoute = express.Router();

webhooksRoute.post('/plaid', webhookControllerPlaid);
webhooksRoute.post('/dwolla', webhookControllerDwolla);

export default webhooksRoute;
