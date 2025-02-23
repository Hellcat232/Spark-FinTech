import { plaidClient } from '../../thirdAPI/initPlaid.js';

/*==============================Создаем периодический перевод======================*/
export const createRecurringTransfer = async (data, user) => {
  try {
    const request = {
      access_token: 'access-sandbox-71e02f71-0960-4a27-abd2-5631e04f2175',
      account_id: '3gE5gnRzNyfXpBK5wEEKcymJ5albGVUqg77gr',
      type: 'credit',
      network: 'ach',
      amount: '12.34',
      ach_class: 'ppd',
      description: 'payment',
      idempotency_key: '12345',
      schedule: {
        start_date: '2022-10-01',
        end_date: '20223-10-01',
        interval_unit: 'week',
        interval_count: 1,
        interval_execution_day: 5,
      },
      user: {
        legal_name: 'Anne Charleston',
      },
    };

    const transfer = await plaidClient.transferRecurringCreate(request);

    return transfer.data;
  } catch (error) {
    console.error(
      'Ошибка при создании периодического трансфера',
      error.response?.data || error.message,
    );
    throw error;
  }
};

/*==============================Отменяем периодический перевод======================*/
export const cancelRecurringTransfer = async (recurringTransferId) => {
  try {
    const transfer = await plaidClient.transferRecurringCancel({
      recurring_transfer_id: '460cbe92-2dcc-8eae-5ad6-b37d0ec90fd9',
    });

    return transfer.data;
  } catch (error) {
    console.error(
      'Ошибка при создании периодического трансфера',
      error.response?.data || error.message,
    );
    throw error;
  }
};

/*=========================Получаем информацию о переводе=================*/
export const getRecurringTransferInfo = async (recurringTransferId) => {
  try {
    const recurringTransferInfo = await plaidClient.transferRecurringGet({
      recurring_transfer_id: '460cbe92-2dcc-8eae-5ad6-b37d0ec90fd9',
    });

    return recurringTransferInfo.data;
  } catch (error) {
    console.error(
      'Ошибка при получении информации о периодическом трансфере',
      error.response?.data || error.message,
    );
    throw error;
  }
};

/*=========================Получаем список переводов за определенный период=================*/
export const getRecurringTransferList = async (period) => {
  try {
    const request = {
      start_time: '2022-09-29T20:35:49Z',
      end_time: '2022-10-29T20:35:49Z',
      count: 1,
    };

    const recurringTransferList = await plaidClient.transferRecurringList(request);

    return recurringTransferList.data;
  } catch (error) {
    console.error(
      'Ошибка при получении списка всех периодических трансферов',
      error.response?.data || error.message,
    );
    throw error;
  }
};
