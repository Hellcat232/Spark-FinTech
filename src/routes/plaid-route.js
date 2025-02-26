import express from 'express';
import { ctrlWrapper } from '../utils/ctrlWrapper.js';
import {
  createTransferController,
  cancelTransferController,
  transferInfoController,
  transferListController,
} from '../controllers/plaid-controllers/transfer-controller.js';

import {
  linkTokenCreateController,
  exchangePublicTokenController,
  disconnectAccountController,
} from '../controllers/plaid-controllers/connect-bank-controller.js';

import {
  createRecurringTransferController,
  cancelRecurringTransferController,
  getRecurringTransferInfoController,
  getRecurringTransferListController,
} from '../controllers/plaid-controllers/recurring-transfer-controller.js';

import {
  rtpTransferEligibilityController,
  rtpTransferCreateController,
  rtpTransferGetInfoController,
} from '../controllers/plaid-controllers/rtp-transfer-controller.js';

import {
  getUsersAssetsController,
  fetchAssetReportController,
} from '../controllers/plaid-controllers/assets-controller.js';

import { getUserBalanceController } from '../controllers/plaid-controllers/balance-controller.js';
import { getUserTransactionController } from '../controllers/plaid-controllers/transaction-controller.js';
import { getAllUserBankAccountsController } from '../controllers/plaid-controllers/accounts-controller.js';
import { getUserLiabilitiesController } from '../controllers/plaid-controllers/liabilities-controller.js';

import {
  getUserIdentityController,
  getIdentityMatchController,
  identityUploadController,
} from '../controllers/plaid-controllers/identity-controller.js';

const plaidRoute = express.Router();

plaidRoute.post('/linkToken', ctrlWrapper(linkTokenCreateController));
plaidRoute.post('/publicToken', ctrlWrapper(exchangePublicTokenController));

plaidRoute.get('/balances', ctrlWrapper(getUserBalanceController));

plaidRoute.get('/transactions', ctrlWrapper(getUserTransactionController));

plaidRoute.post('/transfer_init', ctrlWrapper(createTransferController));
plaidRoute.post('/transfer_cancel', ctrlWrapper(cancelTransferController));
plaidRoute.post('/transfer_list/:id', ctrlWrapper(transferInfoController));
plaidRoute.get('/transfer_list', ctrlWrapper(transferListController));

plaidRoute.get('/accounts', ctrlWrapper(getAllUserBankAccountsController));

plaidRoute.get('/identity', ctrlWrapper(getUserIdentityController));
plaidRoute.get('/identity_match', ctrlWrapper(getIdentityMatchController));
plaidRoute.post('/identity_upload', ctrlWrapper(identityUploadController));

plaidRoute.post('/recurring_transfer_create', ctrlWrapper(createRecurringTransferController));
plaidRoute.post('/recurring_transfer_cancel', ctrlWrapper(cancelRecurringTransferController));
plaidRoute.get('recurring_transfer_list', ctrlWrapper(getRecurringTransferListController));
plaidRoute.post('recurring_transfer_list/:id', ctrlWrapper(getRecurringTransferInfoController));

plaidRoute.get('/rtp_eligibility', ctrlWrapper(rtpTransferEligibilityController));
plaidRoute.post('/rtp_create', ctrlWrapper(rtpTransferCreateController));
plaidRoute.post('rtp_info', ctrlWrapper(rtpTransferGetInfoController));

// plaidRoute.get('/income', getUsersIncomeController);

plaidRoute.get('/liabilities', ctrlWrapper(getUserLiabilitiesController));

plaidRoute.post('/assets', ctrlWrapper(getUsersAssetsController));
plaidRoute.get('/report', ctrlWrapper(fetchAssetReportController));

plaidRoute.post('/unlink', ctrlWrapper(disconnectAccountController));

export default plaidRoute;
