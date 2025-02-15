import createHttpError from 'http-errors';

import { WebhookQueue } from '../database/models/webhooksModel.js';

import { findUser } from '../microservices/auth.js';

export const webhookController = async (req, res) => {
  try {
    const user = await findUser({ reportAssetsId: req.body.asset_report_id });
    if (!user) {
      throw createHttpError(404, "User wasn't found");
    }

    console.log(user, 'Find user within webhook controller');

    await WebhookQueue.create({
      userId: user ? user._id : null,
      webhook_type: req.body.webhook_type,
      webhook_code: req.body.webhook_code,
      asset_report_id: req.body.asset_report_id || null,
      transaction_id: req.body.transaction_id || null,
      payload: req.body,
      status: 'pending',
    });

    res.status(200).send('Webhook received');
  } catch (error) {
    throw createHttpError(500, error.message);
  }
};
