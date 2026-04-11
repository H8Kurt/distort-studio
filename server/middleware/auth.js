const jwt = require('jsonwebtoken');
const { logger } = require('../lib/logger');
const { verifyAccessToken } = require('../lib/auth');

module.exports = (req, res, next) => {
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
    
    req.user = decoded;
    logger.debug({ userId: decoded.id, path: req.path }, 'User authenticated');
    next();
  } catch (err) {
    logger.error({ err, path: req.path }, 'Token verification failed');
    res.status(401).json({ error: 'Неверный токен' });
  }
};
