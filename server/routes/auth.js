const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

const { logger } = require('../lib/logger');
const {
  registerSchema,
  loginSchema,
  emailTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../lib/validators');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../lib/auth');
const { authLimiter, strictLimiter } = require('../middleware/rateLimiter');
const { issueToken, findValidToken, consumeToken } = require('../lib/emailTokens');
const { sendVerificationEmail, sendPasswordResetEmail, isConfigured } = require('../lib/mailer');
const auth = require('../middleware/auth');
const User = require('../models/User');
const { getSetting } = require('../lib/settings');

const isProd = process.env.NODE_ENV === 'production';
// В dev без настроенного SMTP возвращаем ссылку в ответе, чтобы поток можно было протестировать
const exposeDevLink = () => !isProd && !isConfigured();

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    bannerUrl: user.bannerUrl,
    frameId: user.frameId,
    rebelRank: user.rebelRank,
    emailVerified: Boolean(user.emailVerified),
    isOfficial: Boolean(user.isOfficial),
    createdAt: user.createdAt,
  };
}

// ✅ Регистрация
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const signupsOpen = await getSetting('signupsOpen', true);
    if (signupsOpen === false) {
      return res.status(403).json({ error: 'Регистрация временно закрыта', signupsClosed: true });
    }
    const { username, email, password, avatarUrl } = registerSchema.parse(req.body);

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }

    const newUser = await User.create({
      username,
      email,
      passwordHash: password,
      avatarUrl: avatarUrl || null,
    });

    const accessToken = generateAccessToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });
    const refreshToken = generateRefreshToken({ id: newUser.id });

    await newUser.update({ refreshToken });

    let devVerifyLink;
    try {
      const raw = await issueToken(newUser.id, 'verify');
      const sent = await sendVerificationEmail(newUser, raw);
      if (exposeDevLink() || sent?.skipped) devVerifyLink = require('../lib/mailer').verifyLink(raw);
    } catch (mailErr) {
      logger.error({ err: mailErr, userId: newUser.id }, 'Не удалось отправить письмо подтверждения');
    }

    logger.info({ userId: newUser.id, email }, 'User registered');

    res.status(201).json({
      message: 'Регистрация успешна',
      user: publicUser(newUser),
      token: accessToken,
      refreshToken,
      ...(devVerifyLink ? { devVerifyLink } : {}),
    });
  } catch (err) {
    next(err);
  }
});

// ✅ Вход
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Неверная почта или пароль' });
    }

    if (user.status && user.status !== 'active') {
      return res.status(403).json({ error: 'Аккаунт заблокирован', banned: true, status: user.status });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ error: 'Неверная почта или пароль' });
    }

    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = generateRefreshToken({ id: user.id });

    await user.update({ refreshToken });

    logger.info({ userId: user.id, email }, 'User logged in');

    res.json({
      message: 'Успешный вход',
      user: publicUser(user),
      token: accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// ✅ Обновление access-токена
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await User.findByPk(decoded.id);
    // Токен должен совпадать с сохранённым в БД (ротация + инвалидация при logout)
    if (!user || user.refreshToken !== refreshToken) {
      logger.warn({ userId: decoded.id }, 'Refresh token mismatch/revoked');
      return res.status(401).json({ error: 'Refresh token revoked' });
    }

    if (user.status && user.status !== 'active') {
      return res.status(403).json({ error: 'Аккаунт заблокирован', banned: true, status: user.status });
    }

    const newAccessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    const newRefreshToken = generateRefreshToken({ id: user.id });

    await user.update({ refreshToken: newRefreshToken });

    res.json({ token: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
});

// ✅ Выход
router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const decoded = verifyRefreshToken(refreshToken);
      if (decoded) {
        const user = await User.findByPk(decoded.id);
        if (user) await user.update({ refreshToken: null });
      }
    }

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// ✅ Текущий пользователь
router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: [
        'id',
        'username',
        'email',
        'role',
        'bio',
        'avatarUrl',
        'bannerUrl',
        'frameId',
        'rebelRank',
        'emailVerified',
        'createdAt',
      ],
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (err) {
    next(err);
  }
});

// ✅ Подтверждение почты по токену из письма
router.post('/verify-email', authLimiter, async (req, res, next) => {
  try {
    const { token } = emailTokenSchema.parse(req.body);
    const row = await findValidToken(token, 'verify');
    if (!row) return res.status(400).json({ error: 'Ссылка недействительна или устарела' });

    const user = await User.findByPk(row.userId);
    if (!user) return res.status(400).json({ error: 'Пользователь не найден' });

    if (!user.emailVerified) {
      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
      await user.save();
    }
    await consumeToken(row);

    res.json({ message: 'Почта подтверждена', emailVerified: true });
  } catch (err) {
    next(err);
  }
});

// ✅ Повторная отправка письма с подтверждением
router.post('/resend-verification', auth, strictLimiter, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    if (user.emailVerified) return res.status(400).json({ error: 'Почта уже подтверждена' });

    const raw = await issueToken(user.id, 'verify');
    const sent = await sendVerificationEmail(user, raw);
    const devLink = exposeDevLink() || sent?.skipped ? require('../lib/mailer').verifyLink(raw) : undefined;

    res.json({ message: 'Письмо отправлено', ...(devLink ? { devVerifyLink: devLink } : {}) });
  } catch (err) {
    next(err);
  }
});

// ✅ Запрос на сброс пароля
router.post('/forgot-password', authLimiter, async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await User.findOne({ where: { email } });

    let devResetLink;
    if (user && user.status === 'active') {
      const raw = await issueToken(user.id, 'reset');
      const sent = await sendPasswordResetEmail(user, raw);
      if (exposeDevLink() || sent?.skipped) devResetLink = require('../lib/mailer').resetLink(raw);
    }

    // Не раскрываем, существует ли аккаунт с такой почтой
    res.json({
      message: 'Если аккаунт существует, письмо со ссылкой отправлено',
      ...(devResetLink ? { devResetLink } : {}),
    });
  } catch (err) {
    next(err);
  }
});

// ✅ Сброс пароля по токену
router.post('/reset-password', authLimiter, async (req, res, next) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const row = await findValidToken(token, 'reset');
    if (!row) return res.status(400).json({ error: 'Ссылка недействительна или устарела' });

    const user = await User.findByPk(row.userId);
    if (!user) return res.status(400).json({ error: 'Пользователь не найден' });

    user.passwordHash = await bcrypt.hash(password, 10);
    user.refreshToken = null;
    await user.save();
    await consumeToken(row);

    logger.info({ userId: user.id }, 'Password reset');
    res.json({ message: 'Пароль обновлён' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
