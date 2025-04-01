import createHttpError from 'http-errors';

import { plaidWebhookQueue } from '../database/models/plaidWebhooksModel.js';
import { DwollaWebhoolQueue } from '../database/models/dwollaWebhookModel.js';

import { findUser } from '../microservices/auth.js';
import { dwollaClient } from '../thirdAPI/initDwolla.js';
import { verifyDwollaSignature } from '../microservices/dwolla/verify-dwolla-signature.js';
import { UserRegisterCollection } from '../database/models/userModel.js';

export const webhookControllerPlaid = async (req, res, next) => {
  try {
    // const itemId = req.body?.item_id || null;
    console.log('Webhook-Plaid', req.body);

    const user = await UserRegisterCollection.findOne({
      plaidItemId: req.body?.item_id || null,
    }).lean();
    if (user) {
      await plaidWebhookQueue.create({
        userId: user._id,
        webhook_type: req.body.webhook_type,
        webhook_code: req.body.webhook_code,
        asset_report_id: req.body.asset_report_id || null,
        transaction_id: req.body.transaction_id || null,
        payload: req.body,
        status: 'pending',
      });
    } else {
      await plaidWebhookQueue.create({
        userId: null,
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

    const user = await UserRegisterCollection.findOne({
      dwollaCustomerURL: req.body?._links?.customer?.href,
    });
    if (!user) {
      console.log('User was deleted from base');
      return res.status(200).send('User was deleted from base');
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
