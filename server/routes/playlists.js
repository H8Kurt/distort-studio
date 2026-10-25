const express = require('express');
const router = express.Router();
const { fn, col } = require('sequelize');

const auth = require('../middleware/auth');
const { playlistSchema, playlistUpdateSchema } = require('../lib/validators');
const { Playlist, PlaylistTrack, Track, User } = require('../models/associations');

const OWNER_ATTRS = ['id', 'username', 'avatarUrl', 'frameId'];

async function loadPlaylist(id) {
  return Playlist.findByPk(id, {
    include: [{ model: User, as: 'owner', attributes: OWNER_ATTRS }],
  });
}

async function playlistWithTracks(playlist) {
  const items = await PlaylistTrack.findAll({
    where: { PlaylistId: playlist.id },
    include: [{ model: Track, as: 'track' }],
    order: [['position', 'ASC'], ['id', 'ASC']],
  });
  const json = typeof playlist.toJSON === 'function' ? playlist.toJSON() : { ...playlist };
  json.tracks = items.map((i) => i.track).filter(Boolean);
  json.trackCount = json.tracks.length;
  return json;
}

// ============================
// GET /api/playlists — мои плейлисты
// ============================
router.get('/', auth, async (req, res) => {
  try {
    const playlists = await Playlist.findAll({
      where: { UserId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    const counts = await PlaylistTrack.findAll({
      where: { PlaylistId: playlists.map((p) => p.id) },
      attributes: ['PlaylistId', [fn('COUNT', col('id')), 'count']],
      group: ['PlaylistId'],
    });
    const countMap = new Map(counts.map((c) => [c.PlaylistId, Number(c.get('count'))]));
    res.json(
      playlists.map((p) => {
        const json = typeof p.toJSON === 'function' ? p.toJSON() : { ...p };
        json.trackCount = countMap.get(p.id) || 0;
        return json;
      })
    );
  } catch (err) {
    console.error('Ошибка получения плейлистов:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// POST /api/playlists — создать
// ============================
router.post('/', auth, async (req, res) => {
  try {
    const data = playlistSchema.parse(req.body);
    const playlist = await Playlist.create({
      title: data.title,
      description: data.description || null,
      coverUrl: data.coverUrl || null,
      isPublic: data.isPublic ?? true,
      UserId: req.user.id,
    });
    res.status(201).json(playlist);
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Ошибка валидации', details: err.errors });
    }
    console.error('Ошибка создания плейлиста:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// GET /api/playlists/:id
// ============================
router.get('/:id', auth, async (req, res) => {
  try {
    const playlist = await loadPlaylist(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Плейлист не найден' });
    if (!playlist.isPublic && playlist.UserId !== req.user.id) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    res.json(await playlistWithTracks(playlist));
  } catch (err) {
    console.error('Ошибка получения плейлиста:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// PATCH /api/playlists/:id
// ============================
router.patch('/:id', auth, async (req, res) => {
  try {
    const playlist = await Playlist.findByPk(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Плейлист не найден' });
    if (playlist.UserId !== req.user.id) {
      return res.status(403).json({ error: 'Нет прав для редактирования' });
    }
    const data = playlistUpdateSchema.parse(req.body);
    await playlist.update(data);
    res.json(playlist);
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Ошибка валидации', details: err.errors });
    }
    console.error('Ошибка обновления плейлиста:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// DELETE /api/playlists/:id
// ============================
router.delete('/:id', auth, async (req, res) => {
  try {
    const playlist = await Playlist.findByPk(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Плейлист не найден' });
    if (playlist.UserId !== req.user.id) {
      return res.status(403).json({ error: 'Нет прав для удаления' });
    }
    await PlaylistTrack.destroy({ where: { PlaylistId: playlist.id } });
    await playlist.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка удаления плейлиста:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// POST /api/playlists/:id/tracks — добавить трек
// ============================
router.post('/:id/tracks', auth, async (req, res) => {
  try {
    const playlist = await Playlist.findByPk(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Плейлист не найден' });
    if (playlist.UserId !== req.user.id) {
      return res.status(403).json({ error: 'Нет прав' });
    }
    const trackId = Number(req.body.trackId);
    const track = await Track.findByPk(trackId);
    if (!track) return res.status(404).json({ error: 'Трек не найден' });

    const existing = await PlaylistTrack.findOne({
      where: { PlaylistId: playlist.id, trackId },
    });
    if (existing) return res.json({ success: true, already: true });

    const max = await PlaylistTrack.max('position', { where: { PlaylistId: playlist.id } });
    await PlaylistTrack.create({
      PlaylistId: playlist.id,
      trackId,
      position: Number.isFinite(max) ? max + 1 : 0,
    });
    res.status(201).json(await playlistWithTracks(playlist));
  } catch (err) {
    console.error('Ошибка добавления трека в плейлист:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// DELETE /api/playlists/:id/tracks/:trackId — убрать трек
// ============================
router.delete('/:id/tracks/:trackId', auth, async (req, res) => {
  try {
    const playlist = await Playlist.findByPk(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Плейлист не найден' });
    if (playlist.UserId !== req.user.id) {
      return res.status(403).json({ error: 'Нет прав' });
    }
    await PlaylistTrack.destroy({
      where: { PlaylistId: playlist.id, trackId: req.params.trackId },
    });
    res.json(await playlistWithTracks(playlist));
  } catch (err) {
    console.error('Ошибка удаления трека из плейлиста:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
