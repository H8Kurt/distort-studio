const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const Version = require('../models/Version');
const Branch = require('../models/Branch');
const Collab = require('../models/Collab');
const User = require('../models/User');

// POST /api/projects/:id/fork - создать форк проекта
router.post('/:id/fork', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Находим оригинальный проект
    const originalProject = await Project.findByPk(id);
    if (!originalProject) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    // Создаём новый проект как копию
    const forkedProject = await Project.create({
      title: name || `${originalProject.title} (Fork)`,
      description: `Fork of "${originalProject.title}" by ${originalProject.description || ''}`,
      UserId: req.user.id,
    });

    // Копируем последнюю версию если есть
    const latestVersion = await Version.findOne({
      where: { projectId: id },
      order: [['createdAt', 'DESC']],
    });

    if (latestVersion) {
      const newVersion = await Version.create({
        projectId: forkedProject.id,
        parentVersionId: latestVersion.id,
        authorId: req.user.id,
        message: `Forked from version #${latestVersion.id}`,
        storageManifest: latestVersion.storageManifest,
      });

      // Создаём ветку main для форка
      await Branch.create({
        projectId: forkedProject.id,
        name: 'main',
        versionId: newVersion.id,
      });
    } else {
      // Если версий нет, создаём пустую
      const initialVersion = await Version.create({
        projectId: forkedProject.id,
        parentVersionId: null,
        authorId: req.user.id,
        message: 'Initial version (fork)',
        storageManifest: [],
      });

      await Branch.create({
        projectId: forkedProject.id,
        name: 'main',
        versionId: initialVersion.id,
      });
    }

    // Добавляем создателя как коллаборатора с ролью owner
    await Collab.create({
      projectId: forkedProject.id,
      userId: req.user.id,
      role: 'owner',
    });

    // Уведомляем через socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('project:forked', { originalId: id, forkedProject });
    }

    res.json(forkedProject);
  } catch (err) {
    console.error('Ошибка создания форка:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id/versions - получить все версии проекта
router.get('/:id/versions', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const versions = await Version.findAll({
      where: { projectId: id },
      include: [
        { 
          model: Version, 
          as: 'parentVersion', 
          attributes: ['id', 'message', 'createdAt'] 
        },
        {
          model: User,
          attributes: ['id', 'username'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(versions);
  } catch (err) {
    console.error('Ошибка получения версий:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/versions - создать новую версию
router.post('/:id/versions', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { message, storageManifest, parentVersionId } = req.body;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    // Если parentVersionId не указан, берём последнюю версию
    let actualParentId = parentVersionId;
    if (!actualParentId) {
      const latest = await Version.findOne({
        where: { projectId: id },
        order: [['createdAt', 'DESC']],
      });
      actualParentId = latest ? latest.id : null;
    }

    const version = await Version.create({
      projectId: id,
      parentVersionId: actualParentId,
      authorId: req.user.id,
      message: message || 'New version',
      storageManifest: storageManifest || [],
    });

    // Обновляем ветку main если это новая последняя версия
    const mainBranch = await Branch.findOne({
      where: { projectId: id, name: 'main' },
    });

    if (mainBranch) {
      mainBranch.versionId = version.id;
      await mainBranch.save();
    } else {
      // Создаём main если нет
      await Branch.create({
        projectId: id,
        name: 'main',
        versionId: version.id,
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`project_${id}`).emit('version:created', version);
    }

    res.json(version);
  } catch (err) {
    console.error('Ошибка создания версии:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id/branches - получить ветки проекта
router.get('/:id/branches', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const branches = await Branch.findAll({
      where: { projectId: id },
      include: [{ model: Version, attributes: ['id', 'message', 'createdAt'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(branches);
  } catch (err) {
    console.error('Ошибка получения веток:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/branches - создать ветку
router.post('/:id/branches', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, versionId } = req.body;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    // Если versionId не указан, берём версию из main
    let actualVersionId = versionId;
    if (!actualVersionId) {
      const mainBranch = await Branch.findOne({
        where: { projectId: id, name: 'main' },
      });
      actualVersionId = mainBranch ? mainBranch.versionId : null;
    }

    const branch = await Branch.create({
      projectId: id,
      name: name || 'unnamed',
      versionId: actualVersionId,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`project_${id}`).emit('branch:created', branch);
    }

    res.json(branch);
  } catch (err) {
    console.error('Ошибка создания ветки:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id/collabs - получить коллабораторов
router.get('/:id/collabs', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const collabs = await Collab.findAll({
      where: { projectId: id },
      include: [{ model: User, attributes: ['id', 'username', 'email'] }],
    });
    res.json(collabs);
  } catch (err) {
    console.error('Ошибка получения коллабораторов:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/collabs - добавить коллаборатора
router.post('/:id/collabs', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId обязателен' });
    }

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    // Проверяем что текущий пользователь имеет право добавлять
    const userCollab = await Collab.findOne({
      where: { projectId: id, userId: req.user.id },
    });

    if (project.UserId !== req.user.id && (!userCollab || userCollab.role === 'viewer')) {
      return res.status(403).json({ error: 'Нет прав для добавления участников' });
    }

    const collab = await Collab.create({
      projectId: id,
      userId,
      role: role || 'viewer',
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`project_${id}`).emit('collab:added', collab);
    }

    res.json(collab);
  } catch (err) {
    console.error('Ошибка добавления коллаборатора:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
