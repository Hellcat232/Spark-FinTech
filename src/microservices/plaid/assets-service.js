import createHttpError from 'http-errors';
import { plaidClient } from '../../thirdAPI/initPlaid.js';
import { env } from '../../utils/env.js';

import { UserRegisterCollection } from '../../database/models/userModel.js';

/*=============Создания отчёта о финансовом здоровье пользователя================*/
export const createUsersAssets = async (user) => {
  try {
    const createReport = await plaidClient.assetReportCreate({
      access_tokens: [user.plaidAccessToken],
      days_requested: 60,
      options: {
        webhook: env('WEBHOOK_URL'),
      },
    });

    if (!createReport.data?.asset_report_token || !createReport.data?.asset_report_id) {
      throw new Error('Ошибка: Не удалось получить asset_report_token или asset_report_id!');
    }

    const updatedUser = await UserRegisterCollection.findByIdAndUpdate(
      user._id,
      {
        $set: {
          reportAssetsToken: createReport.data.asset_report_token,
          reportAssetsId: createReport.data.asset_report_id,
        },
      },
      { new: true, upsert: true },
    ).lean();

    if (!updatedUser) {
      throw new Error('Ошибка: Не удалось сохранить asset_report_token!');
    }

    return createReport;
  } catch (error) {
    console.log('Ошибка при создании отчета:', error.response?.data || error.message);
  }
};

/*=============Получение отчёта о финансовом здоровье пользователя================*/
export const fetchAssetReport = async (user) => {
  try {
    if (!user) {
      throw createHttpError(
        404,
        `Ошибка: Пользователь с asset_report_id ${user.reportAssetsId} не найден в базе!`,
      );
    }

    if (!user.reportAssetsToken) {
      throw createHttpError(
        404,
        `Ошибка: reportAssetsToken отсутствует для asset_report_id ${user.reportAssetsId}`,
      );
    }

    const response = await plaidClient.assetReportGet({
      asset_report_token: user.reportAssetsToken,
      include_insights: true,
    });

    return response;
  } catch (error) {
    console.log(error || 'Ошибка получения отчёта');
  }
};
