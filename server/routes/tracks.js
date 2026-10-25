const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');

const auth = require('../middleware/auth');
const { trackSchema, trackUpdateSchema } = require('../lib/validators');
const { Track, TrackLike, User } = require('../models/associations');

const TRACKS_DIR = path.join(__dirname, '../uploads/audio');

// ============================
// MULTER
// ============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(TRACKS_DIR)) fs.mkdirSync(TRACKS_DIR, { recursive: true });
    cb(null, TRACKS_DIR);
  },
  filename: (req, file, cb) => {
    const safe = Date.now() + '-' + file.originalname
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if ((file.mimetype || '').startsWith('audio/')) return cb(null, true);
    cb(new Error('Допустимы только аудиофайлы'));
  },
});

const OWNER_ATTRS = ['id', 'username', 'avatarUrl', 'frameId'];

function toPublic(track, userId) {
  const json = typeof track.toJSON === 'function' ? track.toJSON() : { ...track };
  if (json.owner) {
    json.ownerName = json.owner.username;
    json.ownerAvatar = json.owner.avatarUrl;
  }
  json.isOwner = json.UserId === userId;
  return json;
}

async function likedIds(userId, trackIds) {
  if (!trackIds.length) return new Set();
  const rows = await TrackLike.findAll({
    where: { userId, trackId: trackIds },
    attributes: ['trackId'],
  });
  return new Set(rows.map((r) => r.trackId));
}

// ============================
// GET /api/tracks — публичная библиотека
// ============================
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const { q, genre, sort, owner } = req.query;

    const where = {};
    if (owner === 'me') where.UserId = req.user.id;
    else where.visibility = { [Op.ne]: 'PRIVATE' };

    if (q) {
      where[Op.or] = [
        { title: { [Op.like]: `%${q}%` } },
        { artist: { [Op.like]: `%${q}%` } },
      ];
    }
    if (genre && genre !== 'Все') where.genre = genre;

    const order =
      sort === 'popular'
        ? [['plays', 'DESC'], ['likeCount', 'DESC']]
        : sort === 'liked'
          ? [['likeCount', 'DESC']]
          : [['createdAt', 'DESC']];

    const { rows, count } = await Track.findAndCountAll({
      where,
      include: [{ model: User, as: 'owner', attributes: OWNER_ATTRS }],
      order,
      limit,
      offset: (page - 1) * limit,
    });

    const liked = await likedIds(req.user.id, rows.map((t) => t.id));
    res.json({
      tracks: rows.map((t) => {
        const json = toPublic(t, req.user.id);
        json.isLiked = liked.has(t.id);
        return json;
      }),
      total: count,
      page,
      pages: Math.ceil(count / limit),
    });
  } catch (err) {
    console.error('Ошибка получения треков:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// GET /api/tracks/me — моя библиотека
// ============================
router.get('/me', auth, async (req, res) => {
  try {
    const rows = await Track.findAll({
      where: { UserId: req.user.id },
      include: [{ model: User, as: 'owner', attributes: OWNER_ATTRS }],
      order: [['createdAt', 'DESC']],
    });
    const liked = await likedIds(req.user.id, rows.map((t) => t.id));
    res.json(
      rows.map((t) => {
        const json = toPublic(t, req.user.id);
        json.isLiked = liked.has(t.id);
        return json;
      })
    );
  } catch (err) {
    console.error('Ошибка получения моих треков:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// GET /api/tracks/liked — лайкнутое
// ============================
router.get('/liked', auth, async (req, res) => {
  try {
    const likes = await TrackLike.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    const ids = likes.map((l) => l.trackId);
    if (!ids.length) return res.json([]);

    const rows = await Track.findAll({
      where: { id: ids },
      include: [{ model: User, as: 'owner', attributes: OWNER_ATTRS }],
    });
    const byId = new Map(rows.map((t) => [t.id, t]));
    res.json(
      ids
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((t) => {
          const json = toPublic(t, req.user.id);
          json.isLiked = true;
          return json;
        })
    );
  } catch (err) {
    console.error('Ошибка получения лайкнутых треков:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// GET /api/tracks/:id
// ============================
router.get('/:id', auth, async (req, res) => {
  try {
    const track = await Track.findByPk(req.params.id, {
      include: [{ model: User, as: 'owner', attributes: OWNER_ATTRS }],
    });
    if (!track) return res.status(404).json({ error: 'Трек не найден' });
    if (track.visibility === 'PRIVATE' && track.UserId !== req.user.id) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    const json = toPublic(track, req.user.id);
    const like = await TrackLike.findOne({
      where: { userId: req.user.id, trackId: track.id },
    });
    json.isLiked = !!like;
    res.json(json);
  } catch (err) {
    console.error('Ошибка получения трека:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// POST /api/tracks — загрузка
// ============================
router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Аудиофайл обязателен' });

    const data = trackSchema.parse(req.body);

    const track = await Track.create({
      title: data.title,
      artist: data.artist || req.user.username || 'Неизвестный',
      genre: data.genre || 'Другое',
      duration: data.duration ?? 0,
      visibility: data.visibility || 'PUBLIC',
      url: `/uploads/audio/${file.filename}`,
      thumbUrl: req.body.thumbUrl || null,
      UserId: req.user.id,
    });

    const io = req.app.get('io');
    if (io) io.emit('track:created', { id: track.id });

    const full = await Track.findByPk(track.id, {
      include: [{ model: User, as: 'owner', attributes: OWNER_ATTRS }],
    });
    res.status(201).json(toPublic(full, req.user.id));
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Ошибка валидации', details: err.errors });
    }
    console.error('Ошибка загрузки трека:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// PATCH /api/tracks/:id — обновление
// ============================
router.patch('/:id', auth, async (req, res) => {
  try {
    const track = await Track.findByPk(req.params.id);
    if (!track) return res.status(404).json({ error: 'Трек не найден' });
    if (track.UserId !== req.user.id) {
      return res.status(403).json({ error: 'Нет прав для редактирования' });
    }
    const data = trackUpdateSchema.parse(req.body);
    await track.update(data);
    res.json(toPublic(track, req.user.id));
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Ошибка валидации', details: err.errors });
    }
    console.error('Ошибка обновления трека:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// DELETE /api/tracks/:id
// ============================
router.delete('/:id', auth, async (req, res) => {
  try {
    const track = await Track.findByPk(req.params.id);
    if (!track) return res.status(404).json({ error: 'Трек не найден' });
    if (track.UserId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Нет прав для удаления' });
    }

    if (track.url) {
      const abs = path.join(__dirname, '..', track.url.replace('/uploads/', 'uploads/'));
      fs.promises.unlink(abs).catch(() => undefined);
    }
    await TrackLike.destroy({ where: { trackId: track.id } });
    await track.destroy();

    const io = req.app.get('io');
    if (io) io.emit('track:deleted', { id: track.id });
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка удаления трека:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// POST /api/tracks/:id/like — переключить лайк
// ============================
router.post('/:id/like', auth, async (req, res) => {
  try {
    const track = await Track.findByPk(req.params.id);
    if (!track) return res.status(404).json({ error: 'Трек не найден' });

    const existing = await TrackLike.findOne({
      where: { userId: req.user.id, trackId: track.id },
    });
    let isLiked;
    if (existing) {
      await existing.destroy();
      track.likeCount = Math.max(0, (track.likeCount || 0) - 1);
      isLiked = false;
    } else {
      await TrackLike.create({ userId: req.user.id, trackId: track.id });
      track.likeCount = (track.likeCount || 0) + 1;
      isLiked = true;
    }
    await track.save();
    res.json({ likeCount: track.likeCount, isLiked });
  } catch (err) {
    console.error('Ошибка лайка трека:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// POST /api/tracks/:id/play — счётчик прослушиваний
// ============================
router.post('/:id/play', auth, async (req, res) => {
  try {
    const track = await Track.findByPk(req.params.id);
    if (!track) return res.status(404).json({ error: 'Трек не найден' });
    track.plays = (track.plays || 0) + 1;
    await track.save();
    res.json({ plays: track.plays });
  } catch (err) {
    console.error('Ошибка счётчика прослушиваний:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обработка ошибок multer
router.use((err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message || 'Ошибка загрузки' });
  next();
});

module.exports = router;
