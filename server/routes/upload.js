const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const auth = require('../middleware/auth'); // защищаем загрузку
const Media = require('../models/Media');

// Настройка storage (локально)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const dir = isImage ? path.join(__dirname, '..', 'uploads', 'images') : path.join(__dirname, '..', 'uploads', 'audio');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\.\-]/g, '');
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e6)}-${safe}`);
  }
});

// Валидация: тип и размер
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/', 'audio/'];
    if (allowed.some(pref => file.mimetype.startsWith(pref))) cb(null, true);
    else cb(new Error('Invalid file type'), false);
  }
});

// Конечная точка: один файл под полем "file"
router.post('/file', auth, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file' });

    const isImage = file.mimetype.startsWith('image/');
    let thumbUrl = null;

    if (isImage) {
      // создаём миниатюру 300px
      const thumbName = 'thumb-' + path.basename(file.filename);
      const thumbPath = path.join(path.dirname(file.path), thumbName);
      await sharp(file.path).resize({ width: 300 }).toFile(thumbPath);
      thumbUrl = `/uploads/images/${thumbName}`;
    }

    // сохраняем запись в БД
    const media = await Media.create({
      filename: file.filename,
      originalName: file.originalname,
      mime: file.mimetype,
      size: file.size,
      url: isImage ? `/uploads/images/${file.filename}` : `/uploads/audio/${file.filename}`,
      thumbUrl,
      type: isImage ? 'image' : 'audio',
      UserId: req.user?.id || null,
      ProjectId: req.body.projectId || null, // если фронт передал projectId
    });

    // realtime: если используешь Socket.IO
    if (global.io) {
      global.io.emit('media:uploaded', media);
    }

    res.json({ media });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Upload error' });
  }
});

module.exports = router;
