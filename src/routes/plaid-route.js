import express from 'express';

import {
  linkTokenCreateController,
  exchangePublicTokenController,
  getUserBalanceController,
  getUserTransactionController,
  getAllUserBankAccountsController,
  disconnectAccountController,
  getUserIdentityController,
  getUsersAssetsController,
  fetchAssetReportController,
  createTransferController,
  cancelTransferController,
  getUserLiabilitiesController,
} from '../controllers/plaid-controller.js';

const plaidRoute = express.Router();

plaidRoute.post('/linkToken', linkTokenCreateController);

plaidRoute.post('/publicToken', exchangePublicTokenController);

plaidRoute.get('/balances', getUserBalanceController);

plaidRoute.get('/transactions', getUserTransactionController);

plaidRoute.post('/transfer_init', createTransferController);

plaidRoute.post('/transfer_cancel', cancelTransferController);

plaidRoute.get('/accounts', getAllUserBankAccountsController);

plaidRoute.get('/identity', getUserIdentityController);

// plaidRoute.get('/income', getUsersIncomeController);

plaidRoute.get('/liabilities', getUserLiabilitiesController);

plaidRoute.post('/assets', getUsersAssetsController);

plaidRoute.get('/report', fetchAssetReportController);

plaidRoute.post('/unlink', disconnectAccountController);

export default plaidRoute;
