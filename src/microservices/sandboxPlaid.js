import { plaidClient } from '../thirdAPI/initPlaid.js';

export const createPublicTokenSandbox = async (request) => {
  try {
    const token = await plaidClient.sandboxPublicTokenCreate(request);
    const publicToken = token.data.public_token;
    return publicToken;
  } catch (error) {
    console.log(error);
  }
};

export const exchangePublicTokenSandbox = async (token) => {
  try {
    const exchange = await plaidClient.itemPublicTokenExchange({ public_token: token });
    const accessToken = exchange.data.access_token;
    const itemId = exchange.data.item_id;

    return {
      plaidAccessToken: accessToken,
      plaidItemId: itemId,
    };
  } catch (error) {
    console.log(error);
  }
};
