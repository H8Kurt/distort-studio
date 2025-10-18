require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const sequelize = require("./db"); // подключение к БД
const User = require("./models/User");
const Project = require("./models/Project");
const Upload = require("./models/Upload"); // модель для файлов

const app = express();

// === middleware ===
app.use(cors());
app.use(express.json());

// === маршруты ===
const userRoutes = require("./routes/users");
const projectRoutes = require("./routes/projects");
const authRoutes = require("./routes/auth");
const uploadRoutes = require("./routes/upload");

app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);

// === отдаём файлы из папки uploads ===
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// === синхронизация БД ===
sequelize
  .sync({ alter: true })
  .then(() => console.log("✅ DB synced"))
  .catch(console.error);

// === тестовый маршрут ===
app.get("/api/ping", (req, res) => {
  res.json({ message: "pong" });
});

// === получение всех загруженных файлов ===
app.get("/api/uploads", async (req, res) => {
  try {
    const files = await Upload.findAll();
    const response = files.map(f => ({
      id: f.id,
      url: `/uploads/${f.filename}`,
      thumb: f.thumb ? `/uploads/${f.thumb}` : null,
    }));
    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка получения файлов" });
  }
});

// === настройка Socket.IO с правильным CORS ===
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // адрес React dev server
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("🟢 Пользователь подключился:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 Пользователь отключился:", socket.id);
  });
});

// сохраняем io, чтобы использовать его в uploadRoutes
app.set("io", io);

// === запуск сервера ===
server.listen(4000, () => console.log("🚀 Server started on port 4000"));
