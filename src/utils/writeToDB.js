import { TransferCollection } from '../database/models/transfersModel.js';
import { UserRegisterCollection } from '../database/models/userModel.js';
import { findUser } from '../microservices/auth.js';

export const writeToDB = async (user, debitOrCredit, from, to, session, extra = {}) => {
  const senderUrl = await findUser({ _id: user._id });

  const transferDoc = {
    userId: user._id,
    transferId: debitOrCredit.data.transfer.id,
    amount: debitOrCredit.data.transfer.amount,
    status: debitOrCredit.data.transfer.status,
    // status: 'settled', //for sandbox
    type: debitOrCredit.data.transfer.type,
    accountId: debitOrCredit.data.transfer.account_id,
    groupId: debitOrCredit.data.transfer.metadata.groupId,
    note: '',
    toUserId: from.userId.toString() === to.userId.toString() ? user._id : to.userId,
    via: 'dwolla',
    isExternal: from.userId.toString() === to.userId.toString() ? false : true,
    initiatedBy: user._id,
    senderUrl: senderUrl.dwollaCustomerURL,
    ...extra,
  };

  const response = await TransferCollection.create([transferDoc], { session });

  return response;
};
