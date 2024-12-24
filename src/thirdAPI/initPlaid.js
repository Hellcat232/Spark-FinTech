import { PlaidApi, PlaidEnvironments, Configuration, Products } from 'plaid';
import { env } from '../utils/env.js';

const client_id = env('PLAID_CLIEN_ID');
const plaid_secret = env('PLAID_SANDBOX_SECRET');

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': client_id,
      'PLAID-SECRET': plaid_secret,
      'Plaid-Version': '2020-09-14',
    },
    // products: [Products.Auth, Products.Transactions],
    products: [Products.Auth, Products.Transactions, Products.Balance],
  },
});

export const plaidClient = new PlaidApi(configuration);
