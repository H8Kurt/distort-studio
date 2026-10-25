const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { sessionSchema, sessionSyncSchema } = require('../lib/validators');
const Session = require('../models/Session');
const Project = require('../models/Project');
const Collab = require('../models/Collab');

// Проверка доступа пользователя к проекту
async function canAccessProject(userId, projectId) {
  const project = await Project.findByPk(projectId);
  if (!project) return { ok: false, status: 404, error: 'Проект не найден' };
  if (project.UserId === userId || project.visibility === 'PUBLIC') return { ok: true, project };
  const isCollaborator = await Collab.findOne({
    where: { projectId, userId, status: 'accepted' },
  });
  if (isCollaborator) return { ok: true, project };
  return { ok: false, status: 403, error: 'Нет доступа к проекту' };
}

function computeDuration(startTime, endTime) {
  if (!endTime) return 0;
  const d = Math.floor((new Date(endTime) - new Date(startTime)) / 1000);
  return d > 0 ? d : 0;
}

// Создать или обновить сессию по clientId (идемпотентно)
async function upsertSession(userId, data) {
  let session = null;
  if (data.clientId) {
    session = await Session.findOne({ where: { userId, clientId: data.clientId } });
  }
  const endTime = data.endTime ? new Date(data.endTime) : null;
  const durationSeconds = computeDuration(data.startTime, endTime);

  if (session) {
    if (endTime) {
      session.endTime = endTime;
      session.durationSeconds = durationSeconds;
    }
    if (data.meta) session.meta = { ...(session.meta || {}), ...data.meta };
    await session.save();
    return session;
  }

  return Session.create({
    userId,
    projectId: data.projectId,
    startTime: new Date(data.startTime),
    endTime,
    durationSeconds,
    meta: data.meta || {},
    clientId: data.clientId || null,
  });
}

// POST /api/sessions - создать сессию (старт + стоп или только старт)
router.post('/', auth, async (req, res) => {
  try {
    const data = sessionSchema.parse(req.body);

    const access = await canAccessProject(req.user.id, data.projectId);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const session = await upsertSession(req.user.id, data);
    res.status(201).json(session);
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Ошибка валидации', details: err.errors });
    }
    console.error('Ошибка создания сессии:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions/sync - пакетная синхронизация сессий (оффлайн-очередь)
router.post('/sync', auth, async (req, res) => {
  try {
    const { sessions } = sessionSyncSchema.parse(req.body);

    const saved = [];
    for (const item of sessions) {
      const access = await canAccessProject(req.user.id, item.projectId);
      if (!access.ok) continue;
      saved.push(await upsertSession(req.user.id, item));
    }

    res.json({ synced: saved.length, sessions: saved });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Ошибка валидации', details: err.errors });
    }
    console.error('Ошибка синхронизации сессий:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/my - получить все сессии текущего пользователя
router.get('/my', auth, async (req, res) => {
  try {
    const sessions = await Session.findAll({
      where: { userId: req.user.id },
      include: [{ model: Project, attributes: ['id', 'title'] }],
      order: [['startTime', 'DESC']],
    });
    res.json(sessions);
  } catch (err) {
    console.error('Ошибка получения сессий:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/project/:projectId - сессии по проекту
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const sessions = await Session.findAll({
      where: { projectId },
      include: [{ model: require('../models/User'), attributes: ['id', 'username', 'email'] }],
      order: [['startTime', 'DESC']],
    });
    res.json(sessions);
  } catch (err) {
    console.error('Ошибка получения сессий проекта:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sessions/:id/stop - завершить сессию
router.put('/:id/stop', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { endTime } = req.body;

    const session = await Session.findByPk(id);
    if (!session) {
      return res.status(404).json({ error: 'Сессия не найдена' });
    }

    if (session.userId !== req.user.id) {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    const end = endTime ? new Date(endTime) : new Date();
    session.endTime = end;
    session.durationSeconds = computeDuration(session.startTime, end);

    await session.save();

    res.json(session);
  } catch (err) {
    console.error('Ошибка завершения сессии:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
