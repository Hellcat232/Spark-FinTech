import createHttpError from 'http-errors';
import { dwollaClient } from '../../thirdAPI/initDwolla.js';

export const sendMoney = async () => {
  // const res = await dwollaClient.get(
  //   'https://api-sandbox.dwolla.com/customers/31ed0c35-d78a-49d1-be13-33c0e9ca07e5',
  // );
  // console.log(res);

  try {
    const transferRes = await dwollaClient.post('transfers', {
      _links: {
        source: {
          href: 'https://api-sandbox.dwolla.com/funding-sources/4c1f8b97-d54f-43d4-99eb-d4b84e6c86d7',
        },
        destination: {
          href: 'https://api-sandbox.dwolla.com/funding-sources/bd74de2d-8649-460b-b967-a33fd38729f4',
        },
      },
      amount: {
        currency: 'USD',
        value: '100.00',
      },
      // metadata: {
      //   paymentId: '12345678',
      //   note: 'Тест перевода через Dwolla',
      // },
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
