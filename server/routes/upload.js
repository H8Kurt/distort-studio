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
    const dest = file.mimetype.startsWith("image/")
      ? path.join(__dirname, "../uploads/images")
      : path.join(__dirname, "../uploads/audio");

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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
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
    const baseUrl = "/uploads/" + (isImage ? "images" : "audio");
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
      type: isImage ? "image" : "audio",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка загрузки файла" });
  }
});

module.exports = router;
