import dwolla from 'dwolla-v2';
import { env } from '../utils/env.js';
import { plaidClient } from './initPlaid.js';
import { BankAccountCollection } from '../database/models/accountsModel.js';
import { UserRegisterCollection } from '../database/models/userModel.js';

export const dwollaClient = new dwolla.Client({
  key: env('DWOLLA_CLIENT_KEY'),
  secret: env('DWOLLA_CLIENT_SECRET'),
  environment: env('DWOLLA_ENVIRONMENT'), // 'sandbox' или 'production'
});

export const createProcessorTokenAndFundingSource = async (accessToken, userId) => {
  try {
    const { data } = await plaidClient.accountsGet({ access_token: accessToken });

    const { dwollaCustomerURL } = await UserRegisterCollection.findById(userId);

    const bankAccounts = [];

    for (const acc of data.accounts) {
      if (acc.type !== 'depository') continue;

      const processor = await plaidClient.processorTokenCreate({
        access_token: accessToken,
        account_id: acc.account_id,
        processor: 'dwolla',
      });

      let fundingSourceUrl = null;

      //Пробуем создать funding source
      try {
        const response = await dwollaClient.post(`${dwollaCustomerURL}/funding-sources`, {
          plaidToken: processor.data.processor_token,
          name: acc.name || 'Bank Account',
        });
        fundingSourceUrl = response.headers.get('location');
      } catch (error) {
        //Обработка DuplicateResource (уже существует)
        if (error.body?.code === 'DuplicateResource') {
          fundingSourceUrl = error?.body?._links?.about?.href;
          console.log('🔁 Funding source уже существует. Используем старый:', fundingSourceUrl);
        } else {
          console.error('❌ Ошибка создания funding source:', error.body.message);
          throw error;
        }
      }

      bankAccounts.push({
        userId,
        accountId: acc.account_id,
        dwollaProcessorToken: processor.data.processor_token,
        fundingSourceURL: fundingSourceUrl,
        mask: acc.mask,
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype,
      });
    }

    if (bankAccounts.length) {
      await BankAccountCollection.insertMany(bankAccounts);
      console.log('✅ Банковские аккаунты и источники успешно добавлены');
    } else {
      console.log('⚠️ Нет доступных аккаунтов для создания processor token');
    }
  } catch (error) {
    console.log(
      'Ошибка создания processor токенов и funding sources:',
      error.response?.data || error.message || error?.body?.message,
    );
  }
};

export const registerDwollaWebhook = async () => {
  try {
    // Получаем список всех подписок
    const response = await dwollaClient.get('webhook-subscriptions');
    const existing = response.body._embedded?.['webhook-subscriptions'] || [];

    // Проверяем, зарегистрирован ли уже Webhook на нужный URL
    const webhookExists = existing.some((hook) => hook.url === env('DWOLLA_WEBHOOK_URL'));
    if (webhookExists) {
      console.log('✅ Dwolla Webhook уже зарегистрирован.');
      return;
    }

    // Если Webhook ещё не зарегистрирован — создаём
    const createRes = await dwollaClient.post('webhook-subscriptions', {
      url: env('DWOLLA_WEBHOOK_URL'),
      secret: env('DWOLLA_WEBHOOK_SECRET'),
    });

    const webhookUrl = createRes.headers.get('location');
    console.log('✅ Dwolla Webhook создан:', webhookUrl);
  } catch (error) {
    console.log(error);

    console.error('❌ Ошибка при создании Dwolla Webhook:', error.response?.data || error.message);
  }
};

export const updateDwollaWebhook = async (webhookId, paused = false) => {
  try {
    const res = await dwollaClient.post(`webhook-subscriptions/${webhookId}`, { paused });

    console.log(`🔄 Webhook ${webhookId} обновлён: paused = ${paused}`);
    return res;
  } catch (error) {
    console.error(
      `❌ Ошибка при обновлении Dwolla Webhook (${webhookId}):`,
      error?.response?.data || error.message,
    );
    throw error;
  }
};

export const getDwollaWebhookSubscriptions = async () => {
  try {
    const response = await dwollaClient.get('webhook-subscriptions');

    const webhooks = response.body._embedded?.['webhook-subscriptions'] || [];

    console.log(`📬 Найдено ${webhooks.length} подписок на вебхуки:\n`);

    for (const hook of webhooks) {
      console.log(`🧷 ID: ${hook.id}`);
      console.log(`🌐 URL: ${hook.url}`);
      console.log(`⏸️ Paused: ${hook.paused}`);
      console.log(`📅 Created: ${hook.created}`);
      console.log('----------------------------------');
    }

    return webhooks;
  } catch (error) {
    console.error(
      '❌ Ошибка при получении списка webhook-подписок:',
      error?.response?.data || error.message,
    );
    return [];
  }
};
