import createHttpError from 'http-errors';
import { dwollaClient } from '../../thirdAPI/initDwolla.js';

export const sendMoney = async (from, to, amount) => {
  try {
    const transferRes = await dwollaClient.post('transfers', {
      _links: {
        source: {
          href: from?.fundingSourceURL,
        },
        destination: {
          href: to?.fundingSourceURL,
        },
      },
      amount: {
        currency: 'USD',
        value: amount,
      },
    });

    return transferRes;
  } catch (error) {
    if (error.body.code === 'ValidationError') {
      console.log(error?.body);
      throw createHttpError(400, error?.body);
    }

    console.log(error);
  }
};

export const dwollaGetTransferInfo = async (resourceId) => {
  try {
    const info = await dwollaClient.get(`transfers/${resourceId}`);

    return info;
  } catch (error) {
    console.log(error);
    throw createHttpError(400, error?.body);
  }
};
