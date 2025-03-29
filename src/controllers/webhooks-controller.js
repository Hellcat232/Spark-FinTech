import createHttpError from 'http-errors';

import { plaidWebhookQueue } from '../database/models/plaidWebhooksModel.js';
import { DwollaWebhoolQueue } from '../database/models/dwollaWebhookModel.js';

import { findUser } from '../microservices/auth.js';
import { dwollaClient } from '../thirdAPI/initDwolla.js';
import { verifyDwollaSignature } from '../microservices/dwolla/verify-dwolla-signature.js';

export const webhookControllerPlaid = async (req, res, next) => {
  if (
    req.body.webhook_code === 'INITIAL_UPDATE' ||
    req.body.webhook_code === 'HISTORICAL_UPDATE' ||
    req.body.webhook_code === 'DEFAULT_UPDATE'
  )
    return;

  console.log('Webhook got', req.body);

  try {
    if (
      req.body.webhook_code === 'BANK_TRANSFERS_EVENTS_UPDATE' ||
      req.body.webhook_code === 'TRANSFER_EVENTS_UPDATE'
    ) {
      await plaidWebhookQueue.create({
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

      await plaidWebhookQueue.create({
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

      await plaidWebhookQueue.create({
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

export const webhookControllerDwolla = async (req, res, next) => {
  try {
    const signature = req.headers['x-request-signature-sha-256'];
    const rawBody = JSON.stringify(req.body);
    const isValid = verifyDwollaSignature(signature, rawBody);

    console.log('Webhook-Dwolla', req.body);

    // Проверяем, был ли уже такой webhook по resourceId + topic
    const duplicate = await DwollaWebhoolQueue.findOne({
      resourceId: req.body.resourceId,
      topic: req.body.topic,
    }).lean();
    if (duplicate) {
      console.log(
        `⛔ Повторный Webhook для resourceId: ${req.body.resourceId}, topic: ${req.body.topic}`,
      );
      return res.status(200).send('Duplicate ignored');
    }

    // Добавляем webhook в очередь
    await DwollaWebhoolQueue.create({
      webhookId: req.body.id,
      topic: req.body.topic,
      resourceId: req.body.resourceId,
      payload: req.body,
      status: isValid ? 'pending' : 'rejected',
      signatureValid: isValid,
    });

    const transferDetails = await dwollaClient.get(`transfers/${req.body.resourceId}`);
    if (transferDetails.body.status === 'pending') {
      await dwollaClient.post(`sandbox-simulations`, {
        _links: {
          transfer: {
            href: transferDetails?.body?._links?.self?.href, // твой transfer.href
          },
        },
        status: 'processed', // Или 'failed' или 'cancelled'
      });
    }

    if (!isValid) {
      console.warn(`❌ Подпись не прошла проверку: ${req.body.id}`);
      return res.status(403).send('Invalid signature');
    }

    res.status(200).send('Webhook received');
  } catch (err) {
    if (err.code === 11000) {
      console.log(`ℹ️ Дубликат webhook: ${req.body.resourceId}, topic: ${req.body.topic}`);
      return res.status(200).send('Duplicate');
    }

    console.error('❌ Ошибка в webhookControllerDwolla:', err.message);
    res.status(500).send('Server error');
  }
};
