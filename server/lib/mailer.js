const nodemailer = require("nodemailer");
const { logger } = require("./logger");

const APP_URL = (process.env.APP_URL || process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
const MAIL_FROM = process.env.MAIL_FROM || "Distort Studio <no-reply@distort.studio>";

let transporter = null;
let warnedMissingConfig = false;

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (transporter) return transporter;
  if (!isConfigured()) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

/**
 * Отправляет письмо. Если SMTP не настроен — письмо не отправляется,
 * ссылка пишется в лог (dev-режим), чтобы поток можно было протестировать.
 */
async function sendMail({ to, subject, text, html }) {
  const tx = getTransporter();
  if (!tx) {
    if (!warnedMissingConfig) {
      logger.warn("SMTP не настроен — письма не отправляются (ссылки пишутся в лог)");
      warnedMissingConfig = true;
    }
    logger.info({ to, subject, text }, "Email (dev, SMTP отключён)");
    return { skipped: true };
  }
  try {
    const info = await tx.sendMail({ from: MAIL_FROM, to, subject, text, html });
    logger.info({ to, subject, messageId: info.messageId }, "Email sent");
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    logger.error({ err, to, subject }, "Не удалось отправить письмо");
    return { error: err.message };
  }
}

function verifyLink(token) {
  return `${APP_URL}/?verify=${token}`;
}

function resetLink(token) {
  return `${APP_URL}/?reset=${token}`;
}

function layout(title, bodyHtml) {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#131316;color:#e9e9ee;border-radius:14px">
  <div style="font-size:20px;font-weight:700;margin-bottom:12px">Distort Studio</div>
  <h2 style="font-size:18px;margin:0 0 12px">${title}</h2>
  ${bodyHtml}
  <p style="margin-top:24px;color:#8b8b96;font-size:12px">Если вы не запрашивали это письмо — просто проигнорируйте его.</p>
</div>`;
}

function button(href, label) {
  return `<a href="${href}" style="display:inline-block;background:#7c5cff;color:#fff;text-decoration:none;padding:11px 20px;border-radius:9px;font-weight:600">${label}</a>`;
}

async function sendVerificationEmail(user, token) {
  const link = verifyLink(token);
  return sendMail({
    to: user.email,
    subject: "Подтвердите почту — Distort Studio",
    text: `Здравствуйте, ${user.username}!\nПодтвердите почту: ${link}`,
    html: layout(
      "Подтверждение почты",
      `<p>Здравствуйте, <b>${user.username}</b>! Подтвердите адрес электронной почты, чтобы завершить регистрацию.</p>
       <p style="margin:18px 0">${button(link, "Подтвердить почту")}</p>
       <p style="color:#8b8b96;font-size:12px">Ссылка действует 24 часа.</p>`
    ),
  });
}

async function sendPasswordResetEmail(user, token) {
  const link = resetLink(token);
  return sendMail({
    to: user.email,
    subject: "Сброс пароля — Distort Studio",
    text: `Здравствуйте, ${user.username}!\nСбросить пароль: ${link}`,
    html: layout(
      "Сброс пароля",
      `<p>Здравствуйте, <b>${user.username}</b>! Мы получили запрос на сброс пароля.</p>
       <p style="margin:18px 0">${button(link, "Сбросить пароль")}</p>
       <p style="color:#8b8b96;font-size:12px">Ссылка действует 1 час. Если это были не вы — проигнорируйте письмо.</p>`
    ),
  });
}

module.exports = {
  sendMail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  verifyLink,
  resetLink,
  isConfigured,
};
