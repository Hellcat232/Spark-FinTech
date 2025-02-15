import express from 'express';

import { webhookController } from '../controllers/webhooks-controller.js';

const webhooksRoute = express.Router();

webhooksRoute.post('/', webhookController);

export default webhooksRoute;
