import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { dwollaClient } from '../../thirdAPI/initDwolla.js';
import { plaidClient } from '../../thirdAPI/initPlaid.js';
import { UserRegisterCollection } from '../../database/models/userModel.js';
import createHttpError from 'http-errors';

export const createDwollaCastomer = async (userData) => {
  try {
    const user = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      type: 'personal',
      dateOfBirth: userData.dateOfBirth,
      address1: userData.address.street,
      city: userData.address.city,
      state: userData.address.state,
      postalCode: userData.address.postCode,
      ssn: userData.ssn,
    };

    const response = await dwollaClient.post('customers', user);
    return response.headers.get('Location');
  } catch (error) {
    console.error('Ошибка при создании клиента Dwolla:', error);
    throw error;
  }
};

export const createDwollaCustomerKYC = async (user) => {
  try {
    // 1. Создаем кастомера
    const res = await dwollaClient.post('customers', {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      type: 'personal', // или 'business'
      address1: user.address?.line1,
      city: user.address?.city,
      state: user.address?.state,
      postalCode: user.address?.zip,
      dateOfBirth: user.dob, // формат: YYYY-MM-DD
      ssn: user.ssnLast4, // только последние 4 цифры
    });

    const customerUrl = res.headers.get('location');
    console.log('✅ Customer created:', customerUrl);

    // 2. Сохраняем в базу (если нужно)
    await UserRegisterCollection.findByIdAndUpdate(
      user._id,
      { $set: { dwollaCustomerUrl: customerUrl } },
      { new: true },
    );

    // 3. Проверяем статус — нужно ли KYC
    const customerData = await dwollaClient.get(customerUrl);
    const { status } = customerData.body;

    if (status === 'document') {
      console.log('📎 Требуется KYC-документ');

      const formData = new FormData();
      formData.append('documentType', 'license'); // или 'passport', 'idCard'
      formData.append('file', fs.createReadStream('./path/to/your/id.jpg'), 'id.jpg');

      const uploadRes = await axios.post(`${customerUrl}/documents`, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${dwollaClient.authToken}`,
        },
      });

      console.log('✅ Документ загружен:', uploadRes.headers.location);
    } else {
      console.log('👤 KYC-документы не требуются');
    }

    return customerUrl;
  } catch (error) {
    console.error('❌ Ошибка создания Dwolla кастомера:', error?.response?.data || error.message);
    throw error;
  }
};
