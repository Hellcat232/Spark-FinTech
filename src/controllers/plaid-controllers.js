import jwt from 'jsonwebtoken';
import createHttpError from 'http-errors';

import { createLinkToken, exchangePublicToken } from '../microservices/sandboxPlaid.js';

import { env } from '../utils/env.js';
import { sendEmail } from '../utils/sendEmail.js';

import { findUser } from '../microservices/auth.js';

import {
  handleSessionFinishedWebhook,
  handleItemAddResultWebhook,
  handleEventsWebhook,
} from '../utils/webhooks.js';

export const getLinkTokenController = async (req, res) => {
  const { accessToken } = req.body;

  const encode = await jwt.verify(accessToken, env('JWT_SECRET'));
  if (!encode) {
    throw createHttpError(401, 'Token invalid!');
  }

  const user = await findUser({ _id: encode.userId });
  if (!user) {
    throw createHttpError(404, 'User not found!');
  }

  const linkToken = await createLinkToken();
  console.log(linkToken);

  await sendEmail(user, linkToken);

  res.status(200).json({
    message: 'get public_token',
    data: linkToken,
  });
};

export const webhookController = async (req, res) => {
  try {
    // Получаем данные из тела запроса
    const { webhook_type, webhook_code } = req.body;

    if (!webhook_type || !webhook_code) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook payload: missing webhook_type or webhook_code.',
      });
    }

    let response;

    // Обрабатываем по webhook_code
    switch (webhook_code) {
      case 'SESSION_FINISHED':
        response = await handleSessionFinishedWebhook(req.body);
        break;

      case 'ITEM_ADD_RESULT':
        response = await handleItemAddResultWebhook(req.body);
        break;

      case 'EVENTS':
        response = await handleEventsWebhook(req.body);
        break;

      default:
        console.warn(`Unhandled webhook code: ${webhook_code}`);
        return res.status(400).json({
          success: false,
          message: `Unhandled webhook code: ${webhook_code}`,
        });
    }

    // Возвращаем результат обработки
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error handling webhook:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
      error: error.message,
    });
  }
};
