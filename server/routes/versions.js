const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const Version = require('../models/Version');
const Branch = require('../models/Branch');
const Collab = require('../models/Collab');
const User = require('../models/User');
const { notify } = require('../lib/notify');

// Хелпер проверки доступа к проекту
async function resolveAccess(req, projectId) {
  const project = await Project.findByPk(projectId);
  if (!project) return { project: null };
  const isOwner = project.UserId === req.user.id;
  const collab = await Collab.findOne({
    where: { projectId, userId: req.user.id, status: 'accepted' },
  });
  const isEditor = isOwner || (collab && (collab.role === 'owner' || collab.role === 'editor'));
  const canView = isEditor || project.visibility === 'PUBLIC' || !!collab;
  return { project, isOwner, collab, isEditor, canView };
}

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
      forkedFromId: originalProject.id,
      rootId: originalProject.rootId || originalProject.id,
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
    const { project, canView } = await resolveAccess(req, id);
    if (!project) return res.status(404).json({ error: 'Проект не найден' });
    if (!canView) return res.status(403).json({ error: 'Нет доступа к проекту' });

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
          as: 'author',
          attributes: ['id', 'username', 'avatarUrl'],
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

    const { project, isEditor } = await resolveAccess(req, id);
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }
    if (!isEditor) {
      return res.status(403).json({ error: 'Нет прав для создания версии' });
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
    const { project, canView } = await resolveAccess(req, id);
    if (!project) return res.status(404).json({ error: 'Проект не найден' });
    if (!canView) return res.status(403).json({ error: 'Нет доступа к проекту' });

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

    const { project, isEditor } = await resolveAccess(req, id);
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }
    if (!isEditor) {
      return res.status(403).json({ error: 'Нет прав для создания ветки' });
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

// GET /api/projects/:id/collabs - участники и приглашения проекта
router.get('/:id/collabs', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const access = await resolveAccess(req, id);
    if (!access.project) return res.status(404).json({ error: 'Проект не найден' });
    if (!access.canView) return res.status(403).json({ error: 'Нет доступа к проекту' });

    const collabs = await Collab.findAll({
      where: { projectId: id },
      include: [
        { model: User, attributes: ['id', 'username', 'avatarUrl'] },
        { model: User, as: 'inviter', attributes: ['id', 'username'] },
      ],
      order: [['createdAt', 'ASC']],
    });
    res.json(collabs);
  } catch (err) {
    console.error('Ошибка получения коллабораторов:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/collabs - пригласить коллаборатора (pending)
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

    if (Number(userId) === project.UserId) {
      return res.status(400).json({ error: 'Владелец уже участвует в проекте' });
    }
    if (Number(userId) === req.user.id) {
      return res.status(400).json({ error: 'Нельзя пригласить себя' });
    }

    // Проверяем что текущий пользователь имеет право приглашать
    const userCollab = await Collab.findOne({
      where: { projectId: id, userId: req.user.id, status: 'accepted' },
    });

    if (project.UserId !== req.user.id && (!userCollab || userCollab.role === 'viewer')) {
      return res.status(403).json({ error: 'Нет прав для приглашения участников' });
    }

    const targetUser = await User.findByPk(userId, { attributes: ['id', 'username'] });
    if (!targetUser) return res.status(404).json({ error: 'Пользователь не найден' });

    const inviteRole = role === 'editor' ? 'editor' : 'viewer';

    let collab = await Collab.findOne({ where: { projectId: id, userId } });
    if (collab) {
      if (collab.status === 'accepted') {
        return res.status(400).json({ error: 'Пользователь уже участник проекта' });
      }
      collab.status = 'pending';
      collab.role = inviteRole;
      collab.invitedById = req.user.id;
      await collab.save();
    } else {
      collab = await Collab.create({
        projectId: id,
        userId,
        role: inviteRole,
        status: 'pending',
        invitedById: req.user.id,
      });
    }

    await notify(req.app, {
      userId,
      actorId: req.user.id,
      type: 'collab_invite',
      projectId: project.id,
      message: `приглашает вас в проект «${project.title}»`,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`project_${id}`).emit('collab:invited', collab);
    }

    res.json(collab);
  } catch (err) {
    console.error('Ошибка приглашения коллаборатора:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:id/collaborators/:userId/role - изменить роль
router.put('/:id/collaborators/:userId/role', auth, async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { role } = req.body;

    if (!['editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Некорректная роль' });
    }

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    // Проверяем права текущего пользователя
    const userCollab = await Collab.findOne({
      where: { projectId: id, userId: req.user.id, status: 'accepted' },
    });

    if (project.UserId !== req.user.id && (!userCollab || userCollab.role !== 'owner')) {
      return res.status(403).json({ error: 'Нет прав для изменения ролей' });
    }

    const collab = await Collab.findOne({
      where: { projectId: id, userId, status: 'accepted' },
    });

    if (!collab) {
      return res.status(404).json({ error: 'Коллаборатор не найден' });
    }

    if (collab.role === 'owner') {
      return res.status(400).json({ error: 'Нельзя изменить роль владельца' });
    }

    collab.role = role;
    await collab.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`project_${id}`).emit('collab:roleChanged', collab);
    }

    res.json(collab);
  } catch (err) {
    console.error('Ошибка изменения роли:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:id/collaborators/:userId - удалить коллаборатора
router.delete('/:id/collaborators/:userId', auth, async (req, res) => {
  try {
    const { id, userId } = req.params;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    // Проверяем права текущего пользователя
    const userCollab = await Collab.findOne({
      where: { projectId: id, userId: req.user.id, status: 'accepted' },
    });

    const isSelf = Number(userId) === req.user.id;
    if (!isSelf && project.UserId !== req.user.id && (!userCollab || userCollab.role !== 'owner')) {
      return res.status(403).json({ error: 'Нет прав для удаления участников' });
    }

    const collabToDelete = await Collab.findOne({
      where: { projectId: id, userId },
    });

    if (!collabToDelete) {
      return res.status(404).json({ error: 'Коллаборатор не найден' });
    }

    if (collabToDelete.role === 'owner') {
      return res.status(400).json({ error: 'Нельзя удалить владельца проекта' });
    }

    await collabToDelete.destroy();

    const io = req.app.get('io');
    if (io) {
      io.to(`project_${id}`).emit('collab:removed', { userId });
    }

    res.json({ message: 'Коллаборатор удалён' });
  } catch (err) {
    console.error('Ошибка удаления коллаборатора:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/versions/:versionId/restore - восстановить версию
router.post('/:id/versions/:versionId/restore', auth, async (req, res) => {
  try {
    const { id, versionId } = req.params;

    const { project, isEditor } = await resolveAccess(req, id);
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }
    if (!isEditor) {
      return res.status(403).json({ error: 'Нет прав для восстановления версии' });
    }

    const versionToRestore = await Version.findByPk(versionId);
    if (!versionToRestore || versionToRestore.projectId !== id) {
      return res.status(404).json({ error: 'Версия не найдена' });
    }

    // Создаём новую версию с данными восстанавливаемой
    const newVersion = await Version.create({
      projectId: id,
      parentVersionId: versionId,
      authorId: req.user.id,
      message: `Restored from version #${versionId}`,
      storageManifest: versionToRestore.storageManifest,
    });

    // Обновляем ветку main
    const mainBranch = await Branch.findOne({
      where: { projectId: id, name: 'main' },
    });

    if (mainBranch) {
      mainBranch.versionId = newVersion.id;
      await mainBranch.save();
    } else {
      await Branch.create({
        projectId: id,
        name: 'main',
        versionId: newVersion.id,
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`project_${id}`).emit('version:restored', { oldVersionId: versionId, newVersion });
    }

    res.json(newVersion);
  } catch (err) {
    console.error('Ошибка восстановления версии:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id/tree - дерево форков (родословная)
router.get('/:id/tree', auth, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ error: 'Проект не найден' });

    // Поднимаемся к корню дерева по цепочке forkedFromId
    let root = project;
    const seenUp = new Set([root.id]);
    let guard = 0;
    while (root.forkedFromId && guard < 100) {
      const parent = await Project.findByPk(root.forkedFromId);
      if (!parent || seenUp.has(parent.id)) break;
      seenUp.add(parent.id);
      root = parent;
      guard += 1;
    }

    // BFS по потомкам (для скорости — уровни через IN-запросы)
    const nodes = [];
    const seen = new Set();
    let frontier = [root.id];
    while (frontier.length && nodes.length < 300) {
      const rows = await Project.findAll({
        where: { id: frontier },
        include: [{ model: User, as: 'owner', attributes: ['id', 'username', 'avatarUrl', 'frameId'] }],
      });
      const ordered = frontier.map((id) => rows.find((r) => r.id === id)).filter(Boolean);
      for (const r of ordered) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        nodes.push({
          id: r.id,
          title: r.title,
          coverUrl: r.coverUrl,
          visibility: r.visibility,
          publishedAt: r.publishedAt,
          forkedFromId: r.forkedFromId,
          createdAt: r.createdAt,
          owner: r.owner
            ? { id: r.owner.id, username: r.owner.username, avatarUrl: r.owner.avatarUrl, frameId: r.owner.frameId }
            : null,
        });
      }
      const children = await Project.findAll({
        where: { forkedFromId: frontier },
        attributes: ['id'],
      });
      frontier = children.map((c) => c.id).filter((id) => !seen.has(id));
    }

    res.json({
      rootId: root.id,
      currentId: project.id,
      nodes,
    });
  } catch (err) {
    console.error('Ошибка получения дерева форков:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
