import { dwollaClient } from '../thirdAPI/initDwolla.js';

export const simulateDwollaTransferStatus = async (dwollaTransferUrl, status) => {
  try {
    await dwollaClient.post('sandbox-simulations', {
      _links: {
        transfer: {
          href: dwollaTransferUrl,
        },
      },
      status: status, // или 'failed' или 'cancelled'
    });
    console.log(`✅ Симуляция Dwolla Transfer прошла успешно: ${dwollaTransferUrl}`);
  } catch (err) {
    console.warn(`⚠️ Ошибка симуляции Dwolla Transfer: ${err.message}`);
  }
};
