const express = require("express");
const router = express.Router();
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const auth = require("../middleware/auth");

// === настройка multer ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = file.mimetype.startsWith("image/")
      ? path.join(__dirname, "../uploads/images")
      : path.join(__dirname, "../uploads/audio");
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const safeName = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // до 10 МБ
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("audio/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Недопустимый тип файла"), false);
    }
  },
});

// === Загрузка файла ===
router.post("/file", auth, upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "Файл не загружен" });

  const isImage = file.mimetype.startsWith("image/");
  const baseUrl = "/uploads/" + (isImage ? "images" : "audio");
  const relativePath = `${baseUrl}/${path.basename(file.path)}`;

  const response = { url: relativePath };

  // создаём миниатюру, если изображение
  if (isImage) {
    const thumbPath = path.join(path.dirname(file.path), "thumb-" + path.basename(file.path));
    await sharp(file.path).resize(300).toFile(thumbPath);
    response.thumb = `${baseUrl}/${path.basename(thumbPath)}`;
  }

  // уведомляем всех клиентов
  const io = req.app.get("io");
  io.emit("media:uploaded", response);

  res.json(response);
});

// === Получение списка всех файлов ===
router.get("/list", auth, async (req, res) => {
  try {
    const folders = [
      { path: path.join(__dirname, "../uploads/images"), baseUrl: "/uploads/images" },
      { path: path.join(__dirname, "../uploads/audio"), baseUrl: "/uploads/audio" },
    ];

    const files = [];

    for (const folder of folders) {
      if (!fs.existsSync(folder.path)) continue;
      const items = fs.readdirSync(folder.path);
      for (const item of items) {
        if (item.startsWith("thumb-")) continue; // миниатюры будут в поле thumb
        const filePath = `${folder.baseUrl}/${item}`;
        const thumbPath = fs.existsSync(path.join(folder.path, "thumb-" + item))
          ? `${folder.baseUrl}/thumb-${item}`
          : null;
        files.push({ url: filePath, thumb: thumbPath });
      }
    }

    res.json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка получения списка файлов" });
  }
});

module.exports = router;
