import { plaidClient } from '../thirdAPI/initPlaid.js';

export const linkTokenCreator = async (body, userId) => {
  const request = {
    user: {
      client_user_id: userId,
      phone_number: `+${body.phoneNumber}`,
    },
    client_name: `${body.firstName} ${body.lastName}`,
    products: ['transactions'],
    transactions: {
      days_requested: 730,
    },
    country_codes: ['US'],
    language: 'en',
    webhook: 'https://sample-web-hook.com',
    redirect_uri: 'https://domainname.com/oauth-page.html',
    account_filters: {
      depository: {
        account_subtypes: ['checking', 'savings'],
      },
      credit: {
        account_subtypes: ['credit card'],
      },
    },
  };
  try {
    const link = await plaidClient.linkTokenCreate(request);
    console.log(link.data.link_token);
    const linkToken = link.data.link_token;
    return linkToken;
  } catch (error) {
    console.log(error);
  }
};

export const createPublicToken = async (linkToken) => {
  const token = await plaidClient.itemCreatePublicToken({ link_token: linkToken });
  const publicToken = token.data.public_token;
  return publicToken;
};

export const exchangePublicToken = async (token) => {
  const exchange = await plaidClient.itemPublicTokenExchange({ public_token: token });
  const accessToken = exchange.data.access_token;
  const itemId = exchange.data.item_id;

  return {
    plaidAccessToken: accessToken,
    plaidItemId: itemId,
  };
};
