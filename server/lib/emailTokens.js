const crypto = require("crypto");
const { Op } = require("sequelize");
const { EmailToken } = require("../models/associations");

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 часа
const RESET_TTL_MS = 60 * 60 * 1000; // 1 час

function hashToken(raw) {
  return crypto.createHash("sha256").update(String(raw)).digest("hex");
}

/**
 * Выпускает новый одноразовый токен. Возвращает «сырой» токен (в БД — только хэш).
 * Старые неиспользованные токены того же типа инвалидируются.
 */
async function issueToken(userId, type) {
  const raw = crypto.randomBytes(32).toString("hex");
  const ttl = type === "reset" ? RESET_TTL_MS : VERIFY_TTL_MS;

  await EmailToken.update(
    { usedAt: new Date() },
    { where: { userId, type, usedAt: null } }
  );

  await EmailToken.create({
    userId,
    type,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + ttl),
  });

  return raw;
}

/**
 * Находит валидный (неиспользованный и не истёкший) токен.
 */
async function findValidToken(raw, type) {
  if (!raw) return null;
  return EmailToken.findOne({
    where: {
      tokenHash: hashToken(raw),
      type,
      usedAt: null,
      expiresAt: { [Op.gt]: new Date() },
    },
  });
}

async function consumeToken(token) {
  token.usedAt = new Date();
  await token.save();
}

module.exports = {
  issueToken,
  findValidToken,
  consumeToken,
  hashToken,
  VERIFY_TTL_MS,
  RESET_TTL_MS,
};
