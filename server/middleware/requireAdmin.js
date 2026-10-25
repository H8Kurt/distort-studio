const { logger } = require('../lib/logger');

// Пропускает только администраторов (используется после auth)
module.exports = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    logger.debug({ userId: req.user?.id, path: req.path }, 'Admin access denied');
    return res.status(403).json({ error: 'Требуются права администратора' });
  }
  next();
};
