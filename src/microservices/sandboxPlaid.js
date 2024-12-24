import { plaidClient } from '../thirdAPI/initPlaid.js';

import { env } from '../utils/env.js';

export const createLinkToken = async (data) => {
  const request = {
    user: {
      client_user_id: 'user-id',
      phone_number: '+1 415 5550123',
    },
    client_name: 'Personal Finance App',
    products: ['auth', 'transactions'],
    transactions: {
      days_requested: 730,
    },
    country_codes: ['US'],
    language: 'en',
    webhook: env('WEBHOOK_URL'),
    // redirect_uri: 'http://localhost:3000/plaid/oauth-complete',
    hosted_link: {
      completion_redirect_uri: 'http://localhost:3000/api/plaid/oauth-complete',
      is_mobile_app: false,
      url_lifetime_seconds: 900,
    },
    account_filters: {
      depository: {
        account_subtypes: ['checking', 'savings'],
      },
      credit: {
        account_subtypes: ['credit card'],
      },
    },
  };

  const response = await plaidClient.linkTokenCreate(request);

  const linkToken = response.data.hosted_link_url;

  return linkToken;
};

// export const createPublicTokenSandbox = async (linkToken) => {
//   try {
//     const token = await plaidClient.itemPublicTokenExchange({ link_token: linkToken });
//     const publicToken = token.data.public_token;
//     return publicToken;
//   } catch (error) {
//     console.log(error);
//   }
// };

export const exchangePublicToken = async (publicToken) => {
  const request = {
    public_token: publicToken,
  };

  try {
    const exchange = await plaidClient.itemPublicTokenExchange(request);
    const accessToken = exchange.data.access_token;
    const itemId = exchange.data.item_id;

    console.log('Access Token:', accessToken);
    console.log('Item ID:', itemId);

    return {
      plaidAccessToken: accessToken,
      plaidItemId: itemId,
    };
  } catch (error) {
    console.log(error);
  }
};
