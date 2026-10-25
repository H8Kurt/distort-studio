const crypto = require('crypto');
const User = require('../models/User');
const { logger } = require('./logger');

const OFFICIAL_EMAIL = process.env.OFFICIAL_EMAIL || 'official@distort.studio';
const OFFICIAL_USERNAME = process.env.OFFICIAL_USERNAME || 'Distort Studio';

/**
 * Идемпотентно создаёт/находит официальный аккаунт «Distort Studio».
 * Войти под ним нельзя — пароль случайный и нигде не сохраняется.
 */
async function ensureOfficialAccount() {
  try {
    let user = await User.findOne({ where: { isOfficial: true } });
    if (!user) {
      const passwordHash = crypto.randomBytes(32).toString('hex');
      user = await User.create({
        username: OFFICIAL_USERNAME,
        email: OFFICIAL_EMAIL,
        passwordHash,
        role: 'user',
        isOfficial: true,
        status: 'active',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        bio: 'Официальный аккаунт Distort Studio — новости, анонсы и обновления платформы.',
      });
      logger.info({ userId: user.id }, 'Official account created');
    }
    return user;
  } catch (err) {
    logger.error({ err }, 'ensureOfficialAccount failed');
    return null;
  }
}

module.exports = { ensureOfficialAccount, OFFICIAL_EMAIL, OFFICIAL_USERNAME };
