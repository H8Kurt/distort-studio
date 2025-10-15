const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = file.mimetype.startsWith('image') ? 'uploads/images' : 'uploads/audio';
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// 📸 Загрузка изображения
router.post('/image', upload.single('file'), (req, res) => {
  res.json({ path: `/uploads/images/${req.file.filename}` });
});

// 🎵 Загрузка аудио
router.post('/audio', upload.single('file'), (req, res) => {
  res.json({ path: `/uploads/audio/${req.file.filename}` });
});

module.exports = router;
