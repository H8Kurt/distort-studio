const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'; // Access token: 15 minutes
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // Refresh token: 7 days

/**
 * Generate access token (short-lived)
 */
function generateAccessToken(payload) {
  return jwt.sign(
    { ...payload, type: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Generate refresh token (long-lived)
 */
function generateRefreshToken(payload) {
  return jwt.sign(
    { ...payload, type: 'refresh', jti: uuidv4() },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
}

/**
 * Verify access token
 */
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (err) {
    return null;
  }
}

/**
 * Verify refresh token
 */
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (err) {
    return null;
  }
}

/**
 * Decode token without verification (for debugging)
 */
function decodeToken(token) {
  return jwt.decode(token);
}

/**
 * Get token expiration time
 */
function getTokenExpiration(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return null;
  }
  return new Date(decoded.exp * 1000);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  getTokenExpiration,
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
};
