const nodemailer = require('nodemailer');

const getLoginUrl = () => process.env.FRONTEND_LOGIN_URL || `${(process.env.CORS_ORIGIN || 'http://localhost:3000').replace(/\/$/, '')}/login`;

function createMailTransporter() {
  const { MAIL_HOST, MAIL_USER, MAIL_PASS } = process.env;
  const MAIL_PORT = Number(process.env.MAIL_PORT || 587);

  if (!MAIL_HOST || !MAIL_USER || !MAIL_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: MAIL_HOST,
    port: MAIL_PORT,
    secure: MAIL_PORT === 465,
    auth: { user: MAIL_USER, pass: MAIL_PASS },
  });
}

async function sendManagerWelcomeEmail({ to, fullName, email, password, loginUrl }) {
  const transporter = createMailTransporter();
  if (!transporter) {
    return { ok: false, skipped: true, reason: 'Mail transport not configured' };
  }

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to,
    subject: 'Your Barber Management System account is ready',
    text: `Hello ${fullName},\n\nAn admin created your manager account on Barber Management System.\nEmail: ${email}\nTemporary password: ${password}\nLogin here: ${loginUrl}\n\nPlease log in and change your password.`,
    html: `<p>Hello ${fullName},</p><p>An admin created your manager account on <b>Barber Management System</b>.</p><p><b>Email:</b> ${email}<br/><b>Temporary password:</b> ${password}</p><p><a href="${loginUrl}">Click here to login</a></p><p>Please log in and change your password.</p>`,
  });

  return { ok: true };
}

async function sendContactEmail({ name, email, message }) {
  const transporter = createMailTransporter();
  if (!transporter) {
    return { ok: false, skipped: true, reason: 'Mail transport not configured' };
  }

  const supportEmail = process.env.SUPPORT_EMAIL || process.env.MAIL_FROM || process.env.MAIL_USER;
  if (!supportEmail) {
    return { ok: false, skipped: true, reason: 'Support email is not configured' };
  }

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to: supportEmail,
    replyTo: email,
    subject: `New contact request from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    html: `<p><b>Name:</b> ${name}</p><p><b>Email:</b> ${email}</p><p><b>Message:</b></p><p>${String(message).replace(/\n/g, '<br/>')}</p>`,
  });

  return { ok: true, to: supportEmail };
}

module.exports = {
  getLoginUrl,
  sendManagerWelcomeEmail,
  sendContactEmail,
};
