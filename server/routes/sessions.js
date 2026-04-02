const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Session = require('../models/Session');
const Project = require('../models/Project');

// POST /api/sessions - создать сессию (старт + стоп или только старт)
router.post('/', auth, async (req, res) => {
  try {
    const { projectId, startTime, endTime, meta } = req.body;
    
    if (!projectId || !startTime) {
      return res.status(400).json({ error: 'projectId и startTime обязательны' });
    }

    // Проверяем существование проекта
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    // Вычисляем длительность если есть endTime
    let durationSeconds = 0;
    if (endTime) {
      durationSeconds = Math.floor((new Date(endTime) - new Date(startTime)) / 1000);
      if (durationSeconds < 0) durationSeconds = 0;
    }

    const session = await Session.create({
      userId: req.user.id,
      projectId,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      durationSeconds,
      meta: meta || {},
    });

    res.json(session);
  } catch (err) {
    console.error('Ошибка создания сессии:', err);
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

    // Проверка что сессия принадлежит пользователю
    if (session.userId !== req.user.id) {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    const end = endTime ? new Date(endTime) : new Date();
    session.endTime = end;
    session.durationSeconds = Math.floor((end - new Date(session.startTime)) / 1000);
    if (session.durationSeconds < 0) session.durationSeconds = 0;
    
    await session.save();

    res.json(session);
  } catch (err) {
    console.error('Ошибка завершения сессии:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
