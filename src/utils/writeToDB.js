import { TransferCollection } from '../database/models/transfersModel.js';

export const writeToDB = async (user, debitOrCredit, from, to, session) => {
  const transferDoc = {
    userId: user._id,
    transferId: debitOrCredit.data.transfer.id,
    amount: debitOrCredit.data.transfer.amount,
    status: 'settled',
    type: debitOrCredit.data.transfer.type,
    accountId: debitOrCredit.data.transfer.account_id,
    groupId: debitOrCredit.data.transfer.metadata.groupId,
    note: '',
    toUserId: from.userId.toString() === to.userId.toString() ? user._id : to.userId,
    via: 'dwolla',
    isExternal: from.userId.toString() === to.userId.toString() ? false : true,
    initiatedBy: user._id,
  };

  const response = await TransferCollection.create([transferDoc], { session });

  return response;
};
