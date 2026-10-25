const { logger } = require("../lib/logger");

function notFound(req, res) {
  res.status(404).json({ error: "Ресурс не найден" });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err && err.name === "ZodError") {
    return res.status(400).json({ error: "Ошибка валидации", details: err.errors });
  }

  const status = err.status || err.statusCode || 500;
  logger.error({ err, path: req.path, method: req.method }, "Unhandled error");

  res.status(status).json({
    error: status === 500 ? "Ошибка сервера" : err.message || "Ошибка",
  });
}

module.exports = { notFound, errorHandler };
