import createHttpError from 'http-errors';

import { WebhookQueue } from '../database/models/webhooksModel.js';

import { findUser } from '../microservices/auth.js';

export const webhookController = async (req, res, next) => {
  if (req.body.webhook_code === 'INITIAL_UPDATE' || req.body.webhook_code === 'HISTORICAL_UPDATE')
    return;

  console.log('Webhook got', req.body);

  try {
    if (
      req.body.webhook_code === 'BANK_TRANSFERS_EVENTS_UPDATE' ||
      req.body.webhook_code === 'TRANSFER_EVENTS_UPDATE'
    ) {
      await WebhookQueue.create({
        webhook_type: req.body.webhook_type,
        webhook_code: req.body.webhook_code,
        asset_report_id: req.body.asset_report_id || null,
        transaction_id: req.body.transaction_id || null,
        payload: req.body,
        status: 'pending',
      });
    }

    if (req.body.item_id) {
      const user = await findUser({ plaidItemId: req.body.item_id });
      if (!user) {
        throw createHttpError(404, "User wasn't found");
      } else if (!user.plaidItemId) {
        throw createHttpError(400, 'Plaid not connected');
      }

      await WebhookQueue.create({
        userId: user ? user._id : null,
        webhook_type: req.body.webhook_type,
        webhook_code: req.body.webhook_code,
        asset_report_id: req.body.asset_report_id || null,
        transaction_id: req.body.transaction_id || null,
        payload: req.body,
        status: 'pending',
      });
    }

    if (req.body.asset_report_id) {
      const user = await findUser({ reportAssetsId: req.body.asset_report_id });
      if (!user) {
        throw createHttpError(404, "User wasn't found");
      } else if (!user.plaidItemId) {
        throw createHttpError(400, 'Plaid not connected');
      } else if (!user.reportAssetsId && !user.reportAssetsToken) {
        throw createHttpError(400, "Can't create report without credentials");
      }

      await WebhookQueue.create({
        userId: user ? user._id : null,
        webhook_type: req.body.webhook_type,
        webhook_code: req.body.webhook_code,
        asset_report_id: req.body.asset_report_id || null,
        transaction_id: req.body.transaction_id || null,
        payload: req.body,
        status: 'pending',
      });
    }

    res.status(200).send('Webhook received');
  } catch (error) {
    throw createHttpError(500, error.message);
  }
};
