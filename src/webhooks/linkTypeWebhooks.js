import { exchangePublicToken } from '../microservices/sandboxPlaid.js';

import { UserRegisterCollection } from '../database/models/userModel.js';

// Обработка хука для SESSION_FINISHED
export const handleSessionFinishedWebhook = async (webhookData) => {
  const { status, link_session_id, public_tokens } = webhookData;

  if (status === 'SUCCESS') {
    console.log(`Session ${link_session_id} finished successfully.`);
    for (const token of public_tokens) {
      console.log(`Processing public token: ${token}`);
      // Логика обработки токена, например, обмен на access_token
      const response = await exchangePublicToken({ public_token: token });
      const accessToken = response.data.access_token;
      const itemId = response.data.item_id;
      console.log(`Access Token: ${accessToken} handleSessionFinishedWebhook`);
      console.log(`Item ID: ${itemId} handleSessionFinishedWebhook`);
    }
    return { success: true, message: 'Session processed successfully.' };
  } else {
    console.log(`Session ${link_session_id} did not finish successfully.`);
    return { success: false, message: 'Session failed.' };
  }
};

// Обработка хука для ITEM_ADD_RESULT
export const handleItemAddResultWebhook = async (webhookData) => {
  const { public_token } = webhookData;

  console.log('Received ITEM_ADD_RESULT webhook.');
  console.log(`Public Token: ${public_token}`);

  // Логика обработки токена, например, обмен на access_token
  const response = await exchangePublicToken(public_token);
  const accessToken = response.data.access_token;
  console.log(`Access Token: ${accessToken} handleItemAddResultWebhook`);

  return { success: true, message: 'Item add result processed successfully.' };
};

// Обработка хука для EVENTS
export const handleEventsWebhook = async (webhookData) => {
  const { events } = webhookData;

  console.log('Received EVENTS webhook.');
  for (const event of events) {
    const { event_name, event_metadata, timestamp } = event;
    console.log(`Event Name: ${event_name}`);
    console.log(`Timestamp: ${timestamp}`);
    console.log(`Metadata:`, event_metadata);

    // Логика обработки конкретного события
    if (event_name === 'ERROR') {
      console.error(`Error encountered: ${event_metadata.error_message}`);
    }
  }
  return { success: true, message: 'Events processed successfully.' };
};
