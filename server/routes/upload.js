const express = require("express");
const router = express.Router();
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const auth = require("../middleware/auth");

// ============================
// MULTER STORAGE
// ============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = "documents";
    if (file.mimetype.startsWith("image/")) folder = "images";
    else if (file.mimetype.startsWith("video/")) folder = "videos";
    else if (file.mimetype.startsWith("audio/")) folder = "audio";
    const dest = path.join(__dirname, `../uploads/${folder}`);

    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    cb(null, dest);
  },

  filename: (req, file, cb) => {
    const safeName =
      Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const mime = file.mimetype || "";
    const isMedia =
      mime.startsWith("image/") ||
      mime.startsWith("audio/") ||
      mime.startsWith("video/");
    const docMimes = [
      "application/pdf",
      "application/zip",
      "application/msword",
      "application/json",
      "text/plain",
      "text/csv",
      "text/markdown",
    ];
    const isDoc =
      mime.startsWith("text/") ||
      mime.includes("officedocument") ||
      mime.includes("opendocument") ||
      docMimes.includes(mime);
    if (isMedia || isDoc) {
      cb(null, true);
    } else {
      cb(new Error("Недопустимый тип файла"), false);
    }
  },
});

// ============================
// POST /api/upload/file
// ❗ ТОЛЬКО ФАЙЛ, БЕЗ БД
// ============================
router.post("/file", auth, upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "Файл не загружен" });
    }

    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");
    const isAudio = file.mimetype.startsWith("audio/");
    const folder = isImage ? "images" : isVideo ? "videos" : isAudio ? "audio" : "documents";
    const baseUrl = "/uploads/" + folder;
    const url = `${baseUrl}/${file.filename}`;

    let thumbUrl = null;

    if (isImage) {
      const thumbName = "thumb-" + file.filename;
      const thumbPath = path.join(file.destination, thumbName);

      await sharp(file.path)
        .resize(300)
        .toFile(thumbPath);

      thumbUrl = `${baseUrl}/${thumbName}`;
    }

    // ❗ НИКАКОЙ Media.create()
    // ❗ ProjectId здесь не нужен

    res.json({
      filename: file.filename,
      originalName: file.originalname,
      url,
      thumbUrl,
      type: isImage ? "image" : isVideo ? "video" : isAudio ? "audio" : "file",
      mime: file.mimetype,
      size: file.size,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка загрузки файла" });
  }
});

// Обработка ошибок multer (в т.ч. недопустимый тип файла)
router.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message || "Ошибка загрузки файла" });
  }
  next();
});

module.exports = router;
