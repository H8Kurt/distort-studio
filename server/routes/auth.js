const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { logger } = require('../lib/logger');
const { registerSchema, loginSchema } = require('../lib/validators');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../lib/auth');
const User = require('../models/User');

// Store for refresh tokens (in production, use Redis or database)
const refreshTokensStore = new Map();

// ✅ Регистрация
router.post('/register', async (req, res) => {
  try {
    // Validate input
    const { username, email, password } = registerSchema.parse(req.body);
    
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      logger.info({ email }, 'Registration attempt with existing email');
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }

    const newUser = await User.create({ username, email, passwordHash: password });
    
    // Generate tokens
    const accessToken = generateAccessToken({ id: newUser.id, email: newUser.email, role: newUser.role });
    const refreshToken = generateRefreshToken({ id: newUser.id });
    
    // Store refresh token
    refreshTokensStore.set(refreshToken, { userId: newUser.id, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
    
    // Save refresh token to DB
    await newUser.update({ refreshToken });
    
    logger.info({ userId: newUser.id, email }, 'User registered successfully');
    
    res.status(201).json({ 
      message: 'Регистрация успешна', 
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
      token: accessToken,
      refreshToken,
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      logger.warn({ errors: err.errors }, 'Validation error on registration');
      return res.status(400).json({ error: 'Ошибка валидации', details: err.errors });
    }
    logger.error({ err }, 'Registration error');
    res.status(500).json({ error: err.message });
  }
});

// ✅ Вход
router.post('/login', async (req, res) => {
  try {
    // Validate input
    const { email, password } = loginSchema.parse(req.body);
    
    const user = await User.findOne({ where: { email } });
    if (!user) {
      logger.warn({ email }, 'Login attempt with non-existent email');
      return res.status(400).json({ error: 'Неверная почта или пароль' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      logger.warn({ email }, 'Login attempt with wrong password');
      return res.status(400).json({ error: 'Неверная почта или пароль' });
    }

    // Generate tokens
    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });
    
    // Store refresh token
    refreshTokensStore.set(refreshToken, { userId: user.id, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
    
    // Save refresh token to DB
    await user.update({ refreshToken });
    
    logger.info({ userId: user.id, email }, 'User logged in successfully');

    res.json({
      message: 'Успешный вход',
      token: accessToken,
      refreshToken,
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      logger.warn({ errors: err.errors }, 'Validation error on login');
      return res.status(400).json({ error: 'Ошибка валидации', details: err.errors });
    }
    logger.error({ err }, 'Login error');
    res.status(500).json({ error: err.message });
  }
});

// ✅ Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }
    
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      logger.warn({ refreshToken: refreshToken.substring(0, 20) + '...' }, 'Invalid refresh token');
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    
    // Check if token is in store (not revoked)
    const tokenData = refreshTokensStore.get(refreshToken);
    if (!tokenData || tokenData.expiresAt < Date.now()) {
      logger.warn({ userId: decoded.id }, 'Refresh token not found or expired');
      return res.status(401).json({ error: 'Refresh token revoked or expired' });
    }
    
    // Get user
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate new access token
    const newAccessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    
    // Optional: Rotate refresh token (generate new one, invalidate old)
    const newRefreshToken = generateRefreshToken({ id: user.id });
    refreshTokensStore.delete(refreshToken); // Invalidate old
    refreshTokensStore.set(newRefreshToken, { userId: user.id, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
    await user.update({ refreshToken: newRefreshToken });
    
    logger.debug({ userId: user.id }, 'Token refreshed successfully');
    
    res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    logger.error({ err }, 'Token refresh error');
    res.status(500).json({ error: err.message });
  }
});

// ✅ Logout (revoke refresh token)
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      refreshTokensStore.delete(refreshToken);
      
      // Also clear from DB
      const decoded = verifyRefreshToken(refreshToken);
      if (decoded) {
        const user = await User.findByPk(decoded.id);
        if (user) {
          await user.update({ refreshToken: null });
        }
      }
    }
    
    logger.info({ userId: req.user?.id }, 'User logged out');
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    logger.error({ err }, 'Logout error');
    res.status(500).json({ error: err.message });
  }
});

// получить инфо о текущем пользователе
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = verifyRefreshToken(token) || require('../lib/auth').verifyAccessToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Неверный токен' });
    }
    
    const user = await User.findByPk(decoded.id, { 
      attributes: ['id','username','email','role','bio','avatarUrl','rebelRank','createdAt'] 
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    logger.error({ err }, 'Get current user error');
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
