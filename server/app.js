require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const { httpLogger } = require("./lib/logger");
const { apiLimiter } = require("./middleware/rateLimiter");
const { notFound, errorHandler } = require("./middleware/errorHandler");

// Регистрируем ассоциации моделей ДО подключения роутов
require("./models/associations");

const app = express();

// === CORS ===
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : true; // в dev разрешаем всё

app.use(cors({ origin: corsOrigins, credentials: true }));

// === Логирование запросов ===
app.use(httpLogger);

// === Парсер тела запроса ===
app.use(express.json({ limit: "2mb" }));

// === Статика (загруженные файлы) ===
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// === Healthcheck ===
app.get("/health", async (req, res) => {
  const sequelize = require("./db");
  let db = "disconnected";
  try {
    await sequelize.authenticate();
    db = "connected";
  } catch (err) {
    db = "error";
  }
  res.json({ status: "ok", db, uptime: process.uptime() });
});

app.get("/api/ping", (req, res) => {
  res.json({ message: "pong" });
});

// === Общий rate limit для API ===
app.use("/api", apiLimiter);

// === Режим техобслуживания ===
const { verifyAccessToken } = require("./lib/auth");
const { getSetting } = require("./lib/settings");
const MAINTENANCE_ALLOW = ["/api/auth", "/api/admin", "/api/settings/public", "/api/ping"];
app.use(async (req, res, next) => {
  if (!req.path.startsWith("/api")) return next();
  if (MAINTENANCE_ALLOW.some((p) => req.path.startsWith(p))) return next();
  try {
    const maintenance = await getSetting("maintenance", { enabled: false });
    if (!maintenance || !maintenance.enabled) return next();
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const decoded = verifyAccessToken(authHeader.slice(7));
      if (decoded && decoded.role === "admin") return next();
    }
    return res.status(503).json({ error: "maintenance", message: "Сайт на техническом обслуживании" });
  } catch {
    return next();
  }
});

// === Маршруты ===
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/projects", require("./routes/versions"));
app.use("/api/projects", require("./routes/comments"));
app.use("/api/feed", require("./routes/feed"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/search", require("./routes/search"));
app.use("/api/discover", require("./routes/discover"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/friends", require("./routes/friends"));
app.use("/api/chat", require("./routes/chat"));
app.use("/api/collabs", require("./routes/collabs"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/sessions", require("./routes/sessions"));
app.use("/api/apps", require("./routes/apps"));
app.use("/api/assets", require("./routes/assets"));
app.use("/api/tracks", require("./routes/tracks"));
app.use("/api/playlists", require("./routes/playlists"));
app.use("/api/rooms", require("./routes/rooms"));
app.use("/api/challenges", require("./routes/challenges"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/moderation", require("./routes/moderation"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/settings", require("./routes/settings"));

// === Обработка ошибок ===
app.use(notFound);
app.use(errorHandler);

module.exports = app;
