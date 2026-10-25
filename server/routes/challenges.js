const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  Challenge,
  ChallengeEntry,
  ChallengeVote,
  User,
  Project,
} = require('../models/associations');
const { challengeSchema, challengeEntrySchema, challengeUpdateSchema } = require('../lib/validators');
const { notify } = require('../lib/notify');

const AUTHOR_ATTRS = ['id', 'username', 'avatarUrl', 'frameId'];

function serializeChallenge(challenge, entriesCount) {
  const json = typeof challenge.toJSON === 'function' ? challenge.toJSON() : { ...challenge };
  if (json.creator) {
    json.creatorName = json.creator.username;
    json.creatorAvatar = json.creator.avatarUrl;
  }
  json.entriesCount = entriesCount ?? json.entriesCount ?? 0;
  // Динамический статус по датам (если не задан явно)
  const now = Date.now();
  if (json.status !== 'draft') {
    if (json.endsAt && new Date(json.endsAt).getTime() < now) json.status = 'ended';
    else if (json.startsAt && new Date(json.startsAt).getTime() > now) json.status = 'upcoming';
  }
  return json;
}

function serializeEntry(entry, votedIds) {
  const json = typeof entry.toJSON === 'function' ? entry.toJSON() : { ...entry };
  if (json.author) {
    json.authorName = json.author.username;
    json.authorAvatar = json.author.avatarUrl;
  }
  json.hasVoted = votedIds ? votedIds.has(json.id) : false;
  return json;
}

function toTags(theme) {
  return theme || 'Другое';
}

// ============================
// GET /api/challenges — список
// ============================
router.get('/', auth, async (req, res) => {
  try {
    const { status, theme, mode } = req.query;
    const where = {};
    if (status) where.status = status;
    if (theme) where.theme = theme;
    if (mode) where.mode = mode;

    const rows = await Challenge.findAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: AUTHOR_ATTRS },
        { model: ChallengeEntry, as: 'entries', attributes: ['id'] },
      ],
      order: [
        ['createdAt', 'DESC'],
      ],
    });

    const list = rows
      .map((c) => serializeChallenge(c, c.entries ? c.entries.length : 0))
      .sort((a, b) => {
        const rank = (s) => (s === 'active' ? 0 : s === 'upcoming' ? 1 : s === 'draft' ? 2 : 3);
        const diff = rank(a.status) - rank(b.status);
        if (diff !== 0) return diff;
        const ae = a.endsAt ? new Date(a.endsAt).getTime() : Infinity;
        const be = b.endsAt ? new Date(b.endsAt).getTime() : Infinity;
        return ae - be;
      });

    res.json(list);
  } catch (err) {
    console.error('Ошибка получения челленджей:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// POST /api/challenges — создать
// ============================
router.post('/', auth, async (req, res) => {
  try {
    const data = challengeSchema.parse(req.body);
    const challenge = await Challenge.create({
      title: data.title,
      description: data.description || null,
      theme: toTags(data.theme),
      coverUrl: data.coverUrl || null,
      mode: data.mode || 'any',
      startsAt: data.startsAt || null,
      endsAt: data.endsAt || null,
      status: data.status || 'active',
      createdById: req.user.id,
    });

    const io = req.app.get('io');
    if (io) io.emit('challenge:changed', { challengeId: challenge.id });

    const full = await Challenge.findByPk(challenge.id, {
      include: [{ model: User, as: 'creator', attributes: AUTHOR_ATTRS }],
    });
    res.status(201).json(serializeChallenge(full, 0));
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Ошибка валидации', details: err.errors });
    }
    console.error('Ошибка создания челленджа:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// GET /api/challenges/:id — детали + работы (лидерборд)
// ============================
router.get('/:id', auth, async (req, res) => {
  try {
    const challenge = await Challenge.findByPk(req.params.id, {
      include: [{ model: User, as: 'creator', attributes: AUTHOR_ATTRS }],
    });
    if (!challenge) return res.status(404).json({ error: 'Челлендж не найден' });

    const entries = await ChallengeEntry.findAll({
      where: { challengeId: challenge.id },
      include: [
        { model: User, as: 'author', attributes: AUTHOR_ATTRS },
        { model: Project, as: 'project', attributes: ['id', 'title', 'coverUrl'] },
      ],
      order: [
        ['votesCount', 'DESC'],
        ['createdAt', 'ASC'],
      ],
    });

    const myVotes = await ChallengeVote.findAll({
      where: { userId: req.user.id, entryId: entries.map((e) => e.id) },
      attributes: ['entryId'],
    });
    const votedIds = new Set(myVotes.map((v) => v.entryId));

    res.json({
      ...serializeChallenge(challenge, entries.length),
      entries: entries.map((e) => serializeEntry(e, votedIds)),
      myEntryIds: entries.filter((e) => e.userId === req.user.id).map((e) => e.id),
    });
  } catch (err) {
    console.error('Ошибка получения челленджа:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// PATCH /api/challenges/:id — обновить
// ============================
router.patch('/:id', auth, async (req, res) => {
  try {
    const challenge = await Challenge.findByPk(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Челлендж не найден' });
    if (challenge.createdById !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Нет прав для редактирования' });
    }
    const data = challengeUpdateSchema.parse(req.body);
    await challenge.update(data);
    const io = req.app.get('io');
    if (io) io.emit('challenge:changed', { challengeId: challenge.id });
    res.json(serializeChallenge(challenge));
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Ошибка валидации', details: err.errors });
    }
    console.error('Ошибка обновления челленджа:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// DELETE /api/challenges/:id
// ============================
router.delete('/:id', auth, async (req, res) => {
  try {
    const challenge = await Challenge.findByPk(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Челлендж не найден' });
    if (challenge.createdById !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Нет прав для удаления' });
    }
    const entryIds = (
      await ChallengeEntry.findAll({
        where: { challengeId: challenge.id },
        attributes: ['id'],
      })
    ).map((e) => e.id);
    if (entryIds.length) {
      await ChallengeVote.destroy({ where: { entryId: entryIds } });
    }
    await ChallengeEntry.destroy({ where: { challengeId: challenge.id } });
    await challenge.destroy();

    const io = req.app.get('io');
    if (io) io.emit('challenge:changed', { challengeId: challenge.id, deleted: true });
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка удаления челленджа:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// POST /api/challenges/:id/entries — подать работу
// ============================
router.post('/:id/entries', auth, async (req, res) => {
  try {
    const challenge = await Challenge.findByPk(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Челлендж не найден' });
    if (challenge.status === 'ended') {
      return res.status(400).json({ error: 'Челлендж уже завершён' });
    }
    const data = challengeEntrySchema.parse(req.body);

    const entry = await ChallengeEntry.create({
      challengeId: challenge.id,
      userId: req.user.id,
      projectId: data.projectId || null,
      title: data.title,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
    });

    await notify(req.app, {
      userId: challenge.createdById,
      actorId: req.user.id,
      type: 'challenge_entry',
      message: `участвует в челлендже «${challenge.title}»`,
    });

    const io = req.app.get('io');
    if (io) io.emit('challenge:changed', { challengeId: challenge.id });

    const full = await ChallengeEntry.findByPk(entry.id, {
      include: [{ model: User, as: 'author', attributes: AUTHOR_ATTRS }],
    });
    res.status(201).json(serializeEntry(full));
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Ошибка валидации', details: err.errors });
    }
    console.error('Ошибка подачи работы:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// DELETE /api/challenges/:id/entries/:entryId
// ============================
router.delete('/:id/entries/:entryId', auth, async (req, res) => {
  try {
    const entry = await ChallengeEntry.findOne({
      where: { id: req.params.entryId, challengeId: req.params.id },
    });
    if (!entry) return res.status(404).json({ error: 'Работа не найдена' });
    if (entry.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Нет прав для удаления' });
    }
    await ChallengeVote.destroy({ where: { entryId: entry.id } });
    await entry.destroy();

    const io = req.app.get('io');
    if (io) io.emit('challenge:changed', { challengeId: Number(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка удаления работы:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================
// POST /api/challenges/:id/entries/:entryId/vote — переключить голос
// ============================
router.post('/:id/entries/:entryId/vote', auth, async (req, res) => {
  try {
    const challenge = await Challenge.findByPk(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Челлендж не найден' });
    if (challenge.status === 'ended') {
      return res.status(400).json({ error: 'Голосование завершено' });
    }
    const entry = await ChallengeEntry.findOne({
      where: { id: req.params.entryId, challengeId: challenge.id },
    });
    if (!entry) return res.status(404).json({ error: 'Работа не найдена' });
    if (entry.userId === req.user.id) {
      return res.status(400).json({ error: 'Нельзя голосовать за свою работу' });
    }

    const existing = await ChallengeVote.findOne({
      where: { entryId: entry.id, userId: req.user.id },
    });
    let voted;
    if (existing) {
      await existing.destroy();
      entry.votesCount = Math.max(0, (entry.votesCount || 0) - 1);
      voted = false;
    } else {
      await ChallengeVote.create({ entryId: entry.id, userId: req.user.id });
      entry.votesCount = (entry.votesCount || 0) + 1;
      voted = true;
      await notify(req.app, {
        userId: entry.userId,
        actorId: req.user.id,
        type: 'challenge_vote',
        message: `голосует за вашу работу «${entry.title}»`,
      });
    }
    await entry.save();

    const io = req.app.get('io');
    if (io) io.emit('challenge:changed', { challengeId: challenge.id });

    res.json({ votesCount: entry.votesCount, voted });
  } catch (err) {
    console.error('Ошибка голосования:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
