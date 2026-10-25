const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');

const auth = require('../middleware/auth');
const { assetSchema, assetUpdateSchema } = require('../lib/validators');
const Asset = require('../models/Asset');
const AssetLike = require('../models/AssetLike');
const Order = require('../models/Order');
const User = require('../models/User');

async function purchasedAssetIds(userId, assetIds) {
  if (!assetIds.length) return new Set();
  const rows = await Order.findAll({
    where: { buyerId: userId, status: 'paid', assetId: assetIds },
    attributes: ['assetId'],
  });
  return new Set(rows.map((r) => r.assetId));
}

const ASSETS_DIR = path.join(__dirname, '../uploads/assets');

// ============================
// MULTER
// ============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });
    cb(null, ASSETS_DIR);
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
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ============================
// HELPERS
// ============================
function parseTags(tags) {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function typeFromMime(mime = '') {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('font/') || /\.(ttf|otf|woff2?)$/i.test(mime)) return 'font';
  return 'other';
}

function toPublic(asset) {
  const json = typeof asset.toJSON === 'function' ? asset.toJSON() : { ...asset };
  json.tags = parseTags(json.tags);
  return json;
}

// ============================
// GET /api/assets — список
// ============================
router.get('/', auth, async (req, res) => {
  try {
    const { q, category, type, owner, sort } = req.query;
    const where = {};

    if (q) {
      where[Op.or] = [
        { title: { [Op.like]: `%${q}%` } },
        { description: { [Op.like]: `%${q}%` } },
      ];
    }
    if (category && category !== 'Все') where.category = category;
    if (type && type !== 'all') where.fileType = type;
    if (owner === 'me') where.UserId = req.user.id;

    const orderBy = sort === 'popular' ? [['downloadsCount', 'DESC']] : [['createdAt', 'DESC']];

    const assets = await Asset.findAll({
      where,
      include: [{ model: User, as: 'author', attributes: ['id', 'username', 'avatarUrl'] }],
      order: orderBy,
    });

    const purchased = await purchasedAssetIds(req.user.id, assets.map((a) => a.id));
    res.json(
      assets.map((a) => {
        const json = toPublic(a);
        json.isPurchased = purchased.has(a.id);
        return json;
      })
    );
  } catch (err) {
    console.error('Ошибка получения ассетов:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// GET /api/assets/:id
// ============================
router.get('/:id', auth, async (req, res) => {
  try {
    const asset = await Asset.findByPk(req.params.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'username', 'avatarUrl'] }],
    });
    if (!asset) return res.status(404).json({ error: 'Ассет не найден' });
    const json = toPublic(asset);
    if (asset.UserId !== req.user.id && !asset.isFree && Number(asset.price) > 0) {
      const paid = await Order.findOne({
        where: { buyerId: req.user.id, assetId: asset.id, status: 'paid' },
      });
      json.isPurchased = !!paid;
    } else {
      json.isPurchased = true;
    }
    res.json(json);
  } catch (err) {
    console.error('Ошибка получения ассета:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// POST /api/assets — создать лот
// ============================
router.post(
  '/',
  auth,
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const data = assetSchema.parse(req.body);
      const file = req.files?.file?.[0];
      const thumbnail = req.files?.thumbnail?.[0];

      if (!file) return res.status(400).json({ error: 'Файл ассета обязателен' });

      let thumbUrl = null;
      if (thumbnail) {
        thumbUrl = `/uploads/assets/${thumbnail.filename}`;
      } else if (file.mimetype.startsWith('image/')) {
        const thumbName = 'thumb-' + file.filename;
        await sharp(file.path).resize(500).toFile(path.join(ASSETS_DIR, thumbName));
        thumbUrl = `/uploads/assets/${thumbName}`;
      }

      const fileType = data.fileType || typeFromMime(file.mimetype);
      const price = data.price ?? 0;

      const asset = await Asset.create({
        title: data.title,
        description: data.description || '',
        price,
        category: data.category || 'Другое',
        fileUrl: `/uploads/assets/${file.filename}`,
        thumbUrl,
        fileType,
        tags: data.tags || [],
        isFree: data.isFree ?? price <= 0,
        UserId: req.user.id,
      });

      const io = req.app.get('io');
      if (io) io.emit('asset:created', toPublic(asset));

      const full = await Asset.findByPk(asset.id, {
        include: [{ model: User, as: 'author', attributes: ['id', 'username', 'avatarUrl'] }],
      });
      res.status(201).json(toPublic(full));
    } catch (err) {
      if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Ошибка валидации', details: err.errors });
      }
      console.error('Ошибка создания ассета:', err);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
);

// ============================
// PUT /api/assets/:id
// ============================
router.put('/:id', auth, async (req, res) => {
  try {
    const asset = await Asset.findByPk(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Ассет не найден' });
    if (asset.UserId !== req.user.id) {
      return res.status(403).json({ error: 'Нет прав для редактирования' });
    }

    const data = assetUpdateSchema.parse(req.body);
    if (data.title !== undefined) asset.title = data.title;
    if (data.description !== undefined) asset.description = data.description;
    if (data.price !== undefined) {
      asset.price = data.price;
      if (data.isFree === undefined) asset.isFree = data.price <= 0;
    }
    if (data.category !== undefined) asset.category = data.category;
    if (data.fileType !== undefined) asset.fileType = data.fileType;
    if (data.tags !== undefined) asset.tags = data.tags;
    if (data.isFree !== undefined) asset.isFree = data.isFree;

    await asset.save();
    res.json(toPublic(asset));
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Ошибка валидации', details: err.errors });
    }
    console.error('Ошибка обновления ассета:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// DELETE /api/assets/:id
// ============================
router.delete('/:id', auth, async (req, res) => {
  try {
    const asset = await Asset.findByPk(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Ассет не найден' });
    if (asset.UserId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Нет прав для удаления' });
    }

    for (const rel of [asset.fileUrl, asset.thumbUrl]) {
      if (!rel) continue;
      const abs = path.join(__dirname, '..', rel.replace('/uploads/', 'uploads/'));
      fs.promises.unlink(abs).catch(() => undefined);
    }

    await asset.destroy();

    const io = req.app.get('io');
    if (io) io.emit('asset:deleted', { id: asset.id });

    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка удаления ассета:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// POST /api/assets/:id/like
// ============================
router.post('/:id/like', auth, async (req, res) => {
  try {
    const asset = await Asset.findByPk(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Ассет не найден' });

    const [, created] = await AssetLike.findOrCreate({
      where: { userId: req.user.id, assetId: asset.id },
    });
    if (created) {
      asset.likesCount = (asset.likesCount || 0) + 1;
      await asset.save();
    }
    res.json({ likesCount: asset.likesCount, isLiked: true });
  } catch (err) {
    console.error('Ошибка лайка:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// POST /api/assets/:id/download
// ============================
router.post('/:id/download', auth, async (req, res) => {
  try {
    const asset = await Asset.findByPk(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Ассет не найден' });

    const isOwner = asset.UserId === req.user.id;
    const isPaid = !asset.isFree && Number(asset.price) > 0;
    if (isPaid && !isOwner) {
      const paid = await Order.findOne({
        where: { buyerId: req.user.id, assetId: asset.id, status: 'paid' },
      });
      if (!paid) {
        return res.status(402).json({ error: 'Требуется оплата' });
      }
    }

    asset.downloadsCount = (asset.downloadsCount || 0) + 1;
    await asset.save();

    res.json({ url: asset.fileUrl, downloadsCount: asset.downloadsCount });
  } catch (err) {
    console.error('Ошибка скачивания:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
