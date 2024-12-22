import nodemailer from 'nodemailer';

import { env } from './env.js';

const config = {
  host: env('SMTP_HOST'),
  port: env('SMTP_PORT'),
  secure: false,
  auth: {
    user: env('SMTP_USER'),
    pass: env('SMTP_PASSWORD'),
  },
};

const transport = nodemailer.createTransport(config);

export const sendEmail = async (option) => {
  return await transport.sendMail({
    from: `"Spark FinTech 👻" ${env('SMTP_FROM')}`, // sender address
    to: option.email, // list of receivers
    subject: 'Connect your bank account ✔', // Subject line
    text: `Click the link to connect your account: https://link.plaid.com/?token${option.linkToken} `, // plain text body
    html: `<b>Hello ${option.firstName}</b>`, // html body
  });
};
