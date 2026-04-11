const pino = require('pino');
const { v4: uuidv4 } = require('uuid');

/**
 * Logger with request ID correlation
 * Usage: logger.info({ userId, action }, 'User logged in')
 */
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'production' 
    ? undefined 
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Generate a unique request ID
 */
function generateRequestId() {
  return uuidv4();
}

/**
 * Pino HTTP middleware - logs all requests
 */
const pinoHttp = require('pino-http');

const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => {
    const existing = req.headers['x-request-id'];
    return existing || generateRequestId();
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} completed`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} failed: ${err.message}`;
  },
  customAttributeKeys: {
    req: 'request',
    res: 'response',
    err: 'error',
    responseTime: 'duration',
  },
  redact: {
    paths: ['req.headers.authorization', 'req.body.password', 'res.body.token'],
    censor: '**REDACTED**',
  },
});

module.exports = {
  logger,
  httpLogger,
  generateRequestId,
};
