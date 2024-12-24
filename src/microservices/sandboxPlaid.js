import { plaidClient } from '../thirdAPI/initPlaid.js';

import { cuttingISO } from '../constants/authConstants.js';

import { env } from '../utils/env.js';

export const createUserToken = async (userCredentials) => {
  const request = {
    client_user_id: userCredentials[0]._id,
    consumer_report_user_identity: {
      first_name: userCredentials[0].firstName,
      last_name: userCredentials[0].lastName,
      phone_numbers: [`+${userCredentials[0].phoneNumber}`],
      emails: [`${userCredentials[0].email}`],
      ssn_last_4: userCredentials[0].ssn,
      date_of_birth: cuttingISO(userCredentials[0].dateOfBirth),
      primary_address: {
        city: userCredentials[0].address.city,
        region: userCredentials[0].address.state,
        street: userCredentials[0].address.street,
        postal_code: userCredentials[0].address.postCode,
        country: 'US',
      },
    },
  };

  try {
    const response = await plaidClient.userCreate(request);
    console.log(response.data);

    return response;
  } catch (error) {
    console.log(error);
  }
};

export const createLinkToken = async (user) => {
  const request = {
    user: {
      client_user_id: user._id,
      phone_number: `+${user.phoneNumber}`,
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

export const getLinkToken = async (token) => {
  if (!token) return;

  const request = {
    link_token: token,
  };

  const response = await plaidClient.linkTokenGet(request);
  // const linkToken = response.config.data.user;

  console.log('FROM getLinkToken', response);
  return response;
};

export const exchangePublicToken = async (publicToken) => {
  const request = {
    public_token: publicToken,
  };

  try {
    const response = await plaidClient.itemPublicTokenExchange(request);
    // const accessToken = exchange.data.access_token;
    // const itemId = exchange.data.item_id;

    // console.log('Access Token:', accessToken);
    // console.log('Item ID:', itemId);

    // return {
    //   plaidAccessToken: accessToken,
    //   plaidItemId: itemId,
    // };

    return response;
  } catch (error) {
    console.log(error);
  }
};
