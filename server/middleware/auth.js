const { logger } = require('../lib/logger');
const { verifyAccessToken } = require('../lib/auth');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logger.debug({ path: req.path }, 'No authorization header');
    return res.status(401).json({ error: 'Нет токена' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Неверный формат токена' });
  }

  try {
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      logger.debug({ path: req.path }, 'Invalid or expired token');
      return res.status(401).json({ error: 'Токен истек или недействителен', expired: true });
    }

    // быстрая проверка статуса аккаунта (banned/suspended теряют доступ)
    const account = await User.findByPk(decoded.id, { attributes: ['id', 'status'] });
    if (!account) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }
    if (account.status !== 'active') {
      logger.warn({ userId: decoded.id, status: account.status }, 'Access denied: inactive account');
      return res.status(403).json({ error: 'Аккаунт заблокирован', banned: true, status: account.status });
    }

    req.user = decoded;
    logger.debug({ userId: decoded.id, path: req.path }, 'User authenticated');
    next();
  } catch (err) {
    logger.error({ err, path: req.path }, 'Token verification failed');
    res.status(401).json({ error: 'Неверный токен' });
  }
};
