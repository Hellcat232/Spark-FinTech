export const makeTraceObj = (webhook, senderUrl = null) => {
  const customerHref = webhook.payload?._links?.customer?.href || null;
  const isBankEvent = webhook.topic.startsWith('customer_bank_transfer');

  return {
    event: webhook.topic,
    at: webhook.payload.timestamp,
    customer: customerHref,
    direction:
      isBankEvent && senderUrl && customerHref
        ? customerHref === senderUrl
          ? 'debit'
          : 'credit'
        : null, // для platform-событий — без направления
    participant:
      senderUrl && customerHref ? (customerHref === senderUrl ? 'sender' : 'receiver') : null,
    raw: webhook.payload,
  };
};

export const mapStatus = (topic) => {
  if (topic.includes('completed')) return 'completed';
  if (topic.includes('failed')) return 'failed';
  return 'pending';
};

export const isDwollaBankTransferDebit = (payload, customerHref) => {
  return payload?._links?.customer?.href === customerHref;
};
