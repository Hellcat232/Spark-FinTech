import { PlaidApi, PlaidEnvironments, Configuration } from 'plaid';
import { env } from './env.js';

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': env('PLAID_CLIEN_ID'),
      'PLAID-SECRET': env('PLAID_SANDBOX_SECRET'),
      'Plaid-Version': '2020-09-14',
    },
  },
});

export const client = new PlaidApi(configuration);
