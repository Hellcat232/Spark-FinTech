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

export const sendEmail = async (option, link) => {
  return await transport.sendMail({
    from: `"Spark FinTech 👻" ${env('SMTP_FROM')}`,
    to: option.email,
    subject: 'Connect your bank account ✔',
    html: `
      <b>Hello ${option.firstName}</b>
      <p>Click the link to connect your account:</p>
      <a href="${link}" target="_blank">Connect your account</a>
      <p>If you cannot click the link, copy and paste this URL into your browser:</p>
      <p>${link}</p>
    `,
  });
};
