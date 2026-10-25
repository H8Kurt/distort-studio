const express = require("express");
const router = express.Router();
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const { Op } = require("sequelize");

const auth = require("../middleware/auth");
const { projectSchema, projectUpdateSchema } = require("../lib/validators");
const Project = require("../models/Project");
const Media = require("../models/Media");
const Collab = require("../models/Collab");
const User = require("../models/User");
const Version = require("../models/Version");
const Like = require("../models/Like");
const Comment = require("../models/Comment");
const Follow = require("../models/Follow");
const sequelize = require("../db");
const { notify } = require("../lib/notify");


// =========================
// === MULTER STORAGE
// =========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = "files";
    if (file.mimetype.startsWith("image/")) folder = "images";
    else if (file.mimetype.startsWith("video/")) folder = "videos";
    else if (file.mimetype.startsWith("audio/")) folder = "audio";
    const dest = path.join(__dirname, `../uploads/${folder}`);

    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const safe = Date.now() + "-" + file.originalname
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");
    cb(null, safe);
  }
});

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// Хелпер проверки доступа к проекту
async function resolveProjectAccess(req, projectId) {
  const project = await Project.findByPk(projectId);
  if (!project) return null;
  const isOwner = project.UserId === req.user.id;
  const collab = await Collab.findOne({ where: { projectId, userId: req.user.id, status: "accepted" } });
  const isEditor = isOwner || (collab && (collab.role === "owner" || collab.role === "editor"));
  const canView = isEditor || project.visibility === "PUBLIC" || !!collab || req.user.role === "admin";
  return { project, isOwner, collab, isEditor, canView };
}

// =========================
// === ПРОЕКТЫ
// =========================

// Получить свои проекты ("Моя мастерская")
router.get("/", auth, async (req, res) => {
  try {
    const { visibility } = req.query;
    const where = { UserId: req.user.id };

    if (visibility) {
      where.visibility = visibility;
    }

    const projects = await Project.findAll({
      where,
      include: [
        { model: User, as: 'owner', attributes: ['id', 'username', 'avatarUrl'] },
        { model: Media, attributes: [] }
      ],
      attributes: {
        include: [
          [sequelize.fn('COUNT', sequelize.col('Media.id')), 'mediaCount'],
          [sequelize.literal('(SELECT COUNT(*) FROM Likes WHERE Likes.projectId = Project.id)'), 'likesCount'],
          [sequelize.literal('(SELECT COUNT(*) FROM Comments WHERE Comments.projectId = Project.id)'), 'commentCount'],
        ]
      },
      group: ['Project.id'],
      order: [["updatedAt", "DESC"]],
    });
    res.json(projects);
  } catch (err) {
    console.error("Ошибка получения проектов:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Создать проект (авторизованный пользователь)
router.post("/", auth, async (req, res) => {
  try {
    const { title, description, visibility, coverUrl, tags } = projectSchema.parse(req.body);

    const project = await Project.create({ 
      title, 
      description, 
      coverUrl,
      tags,
      UserId: req.user.id,
      visibility: visibility || 'PRIVATE'
    });

    // уведомляем всех клиентов
    const io = req.app.get("io");
    if (io) io.emit("project:created", project);

    res.status(201).json(project);
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: "Ошибка валидации", details: err.errors });
    }
    console.error("Ошибка создания проекта:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Обновить проект
router.put("/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    const { title, description, visibility, coverUrl, tags } = projectUpdateSchema.parse(req.body);

    const project = await Project.findByPk(id);
    if (!project) return res.status(404).json({ error: "Проект не найден" });

    // Проверяем права доступа
    const isOwner = project.UserId === req.user.id;
    const isCollab = await Collab.findOne({ 
      where: { projectId: id, userId: req.user.id, status: "accepted", role: { [Op.in]: ['owner', 'editor'] } }
    });
    
    if (!isOwner && !isCollab) {
      return res.status(403).json({ error: "Нет прав для редактирования проекта" });
    }

    if (title !== undefined) project.title = title;
    if (description !== undefined) project.description = description;
    if (visibility !== undefined) project.visibility = visibility;
    if (coverUrl !== undefined) project.coverUrl = coverUrl;
    if (tags !== undefined) project.tags = tags;
    await project.save();

    const io = req.app.get("io");
    if (io) io.emit("project:updated", project);

    res.json(project);
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: "Ошибка валидации", details: err.errors });
    }
    console.error("Ошибка обновления проекта:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Удалить проект
router.delete("/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    const project = await Project.findByPk(id);
    
    if (!project) return res.status(404).json({ error: "Проект не найден" });
    
    // Проверяем права - только владелец может удалить
    if (project.UserId !== req.user.id) {
      return res.status(403).json({ error: "Только владелец может удалить проект" });
    }
    
    await Project.destroy({ where: { id } });

    const io = req.app.get("io");
    if (io) io.emit("project:deleted", { id });

    res.json({ success: true });
  } catch (err) {
    console.error("Ошибка удаления проекта:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Опубликовать проект в ленту
router.post("/:id/publish", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const access = await resolveProjectAccess(req, id);
    if (!access) return res.status(404).json({ error: "Проект не найден" });
    if (!access.isEditor) return res.status(403).json({ error: "Нет прав" });

    const project = access.project;
    project.visibility = "PUBLIC";
    project.publishedAt = new Date();
    await project.save();

    const io = req.app.get("io");
    if (io) io.emit("project:updated", project);

    // Уведомляем подписчиков автора
    const followers = await Follow.findAll({
      where: { followingId: project.UserId },
      attributes: ["followerId"],
    });
    await Promise.all(
      followers.map((f) =>
        notify(req.app, {
          userId: f.followerId,
          actorId: project.UserId,
          type: "project_update",
          projectId: project.id,
          message: "опубликовал новый проект",
        })
      )
    );

    res.json(project);
  } catch (err) {
    console.error("Ошибка публикации проекта:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Снять проект с публикации
router.post("/:id/unpublish", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const access = await resolveProjectAccess(req, id);
    if (!access) return res.status(404).json({ error: "Проект не найден" });
    if (!access.isEditor) return res.status(403).json({ error: "Нет прав" });

    const project = access.project;
    project.publishedAt = null;
    await project.save();

    const io = req.app.get("io");
    if (io) io.emit("project:updated", project);

    res.json(project);
  } catch (err) {
    console.error("Ошибка снятия с публикации:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Получить один проект с деталями
router.get("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const access = await resolveProjectAccess(req, id);
    if (!access) return res.status(404).json({ error: "Проект не найден" });
    const { project, canView, isOwner, isEditor } = access;
    if (!canView) return res.status(403).json({ error: "Нет доступа к проекту" });

    const [owner, collabs, mediaCount, versionCount, likesCount, commentCount, like] = await Promise.all([
      User.findByPk(project.UserId, { attributes: ["id", "username", "avatarUrl"] }),
      Collab.findAll({
        where: { projectId: id, status: "accepted" },
        include: [{ model: User, attributes: ["id", "username", "avatarUrl"] }],
      }),
      Media.count({ where: { ProjectId: id } }),
      Version.count({ where: { projectId: id } }),
      Like.count({ where: { projectId: id } }),
      Comment.count({ where: { projectId: id } }),
      Like.findOne({ where: { projectId: id, userId: req.user.id } }),
    ]);

    res.json({
      ...project.toJSON(),
      owner,
      collabs,
      mediaCount,
      versionCount,
      likesCount,
      commentCount,
      isLiked: !!like,
      isOwner,
      isEditor,
    });
  } catch (err) {
    console.error("Ошибка получения проекта:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// =========================
// === ЛАЙКИ ПРОЕКТА
// =========================

// Поставить лайк
router.post("/:id/like", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const access = await resolveProjectAccess(req, id);
    if (!access) return res.status(404).json({ error: "Проект не найден" });
    if (!access.canView) return res.status(403).json({ error: "Нет доступа к проекту" });

    const [like, created] = await Like.findOrCreate({
      where: { userId: req.user.id, projectId: id },
    });
    const likesCount = await Like.count({ where: { projectId: id } });

    if (created) {
      await notify(req.app, {
        userId: access.project.UserId,
        actorId: req.user.id,
        type: "like",
        projectId: Number(id),
        message: "оценил ваш проект",
      });
      const io = req.app.get("io");
      if (io) io.to(`project_${id}`).emit("project:liked", { projectId: Number(id), likesCount });
    }

    res.json({ liked: true, likesCount, likeId: like.id });
  } catch (err) {
    console.error("Ошибка лайка:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Убрать лайк
router.delete("/:id/like", auth, async (req, res) => {
  try {
    const { id } = req.params;
    await Like.destroy({ where: { userId: req.user.id, projectId: id } });
    const likesCount = await Like.count({ where: { projectId: id } });

    const io = req.app.get("io");
    if (io) io.to(`project_${id}`).emit("project:liked", { projectId: Number(id), likesCount });

    res.json({ liked: false, likesCount });
  } catch (err) {
    console.error("Ошибка снятия лайка:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// =========================
// === МЕДИА ПРОЕКТА
// =========================

// Загрузка файла в проект
router.post(
  "/:projectId/media",
  auth,
  upload.single("file"),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const file = req.file;

      if (!file) return res.status(400).json({ error: "Файл не загружен" });

      // проверяем проект
      const project = await Project.findByPk(projectId);
      if (!project) return res.status(404).json({ error: "Проект не найден" });

      const isImage = file.mimetype.startsWith("image/");
      const isVideo = file.mimetype.startsWith("video/");
      const isAudio = file.mimetype.startsWith("audio/");
      const baseUrl = isImage
        ? "/uploads/images"
        : isVideo
        ? "/uploads/videos"
        : isAudio
        ? "/uploads/audio"
        : "/uploads/files";

      let thumbUrl = null;

      // если картинка — делаем превью
      if (isImage) {
        try {
          const thumbPath = path.dirname(file.path) + "/thumb-" + file.filename;
          await sharp(file.path).resize(300).toFile(thumbPath);
          thumbUrl = `${baseUrl}/thumb-${file.filename}`;
        } catch {
          // не удалось построить превью (некорректный/неподдерживаемый файл) — оставляем без него
        }
      }

      // сохраняем в БД
      const media = await Media.create({
        filename: file.filename,
        originalName: file.originalname,
        mime: file.mimetype,
        size: file.size,
        url: `${baseUrl}/${file.filename}`,
        thumbUrl,
        type: isImage ? "image" : isVideo ? "video" : isAudio ? "audio" : "file",
        UserId: req.user.id,
        ProjectId: project.id,
      });

      // realtime уведомление
      const io = req.app.get("io");
      if (io) io.to(`project_${project.id}`).emit("media:added", media);

      res.json(media);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Ошибка загрузки" });
    }
  }
);
// Получить медиа проекта с проверкой доступа
router.get("/:id/media", auth, async (req, res) => {
  try {
    const projectId = req.params.id;
    
    // Проверяем доступ к проекту
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ error: "Проект не найден" });
    }
    
    // Проверяем права доступа
    const isOwner = project.UserId === req.user.id;
    const isPublic = project.visibility === 'PUBLIC';
    const isCollab = await Collab.findOne({ 
      where: { projectId, userId: req.user.id, status: "accepted" }
    });
    
    if (!isOwner && !isPublic && !isCollab) {
      return res.status(403).json({ error: "Нет доступа к проекту" });
    }

    const media = await Media.findAll({
      where: { ProjectId: projectId },
      order: [["createdAt", "DESC"]],
    });

    res.json(media);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка загрузки медиа проекта" });
  }
});

// Скачать файл
router.get("/media/:filename/download", auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const media = await Media.findOne({ where: { filename } });
    
    if (!media) {
      return res.status(404).json({ error: "Файл не найден" });
    }
    
    // Проверяем доступ к проекту
    const project = await Project.findByPk(media.ProjectId);
    if (!project) {
      return res.status(404).json({ error: "Проект не найден" });
    }
    
    const isOwner = project.UserId === req.user.id;
    const isPublic = project.visibility === 'PUBLIC';
    const isCollab = await Collab.findOne({ 
      where: { projectId: media.ProjectId, userId: req.user.id, status: "accepted" }
    });
    
    if (!isOwner && !isPublic && !isCollab) {
      return res.status(403).json({ error: "Нет доступа к файлу" });
    }
    
    const filePath = path.join(__dirname, '..', media.url.replace('/uploads/', 'uploads/'));
    res.download(filePath, media.originalName || filename);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка скачивания файла" });
  }
});

// Переименовать медиа
router.put("/:id/media/:mediaId", auth, async (req, res) => {
  try {
    const { id, mediaId } = req.params;
    const access = await resolveProjectAccess(req, id);
    if (!access) return res.status(404).json({ error: "Проект не найден" });
    if (!access.isEditor) return res.status(403).json({ error: "Нет прав" });

    const media = await Media.findOne({ where: { id: mediaId, ProjectId: id } });
    if (!media) return res.status(404).json({ error: "Файл не найден" });

    const name = typeof req.body.originalName === "string" ? req.body.originalName.trim() : "";
    if (!name) return res.status(400).json({ error: "Новое имя обязательно" });
    media.originalName = name.slice(0, 255);
    await media.save();

    const io = req.app.get("io");
    if (io) io.to(`project_${id}`).emit("media:updated", media);

    res.json(media);
  } catch (err) {
    console.error("Ошибка переименования медиа:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Сделать медиа обложкой проекта
router.post("/:id/media/:mediaId/cover", auth, async (req, res) => {
  try {
    const { id, mediaId } = req.params;
    const access = await resolveProjectAccess(req, id);
    if (!access) return res.status(404).json({ error: "Проект не найден" });
    if (!access.isEditor) return res.status(403).json({ error: "Нет прав" });

    const media = await Media.findOne({ where: { id: mediaId, ProjectId: id } });
    if (!media) return res.status(404).json({ error: "Файл не найден" });

    access.project.coverUrl = media.thumbUrl || media.url;
    await access.project.save();

    const io = req.app.get("io");
    if (io) io.emit("project:updated", access.project);

    res.json(access.project);
  } catch (err) {
    console.error("Ошибка установки обложки:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Удалить медиа
router.delete("/:id/media/:mediaId", auth, async (req, res) => {
  try {
    const { id, mediaId } = req.params;
    const access = await resolveProjectAccess(req, id);
    if (!access) return res.status(404).json({ error: "Проект не найден" });
    if (!access.isEditor) return res.status(403).json({ error: "Нет прав" });

    const media = await Media.findOne({ where: { id: mediaId, ProjectId: id } });
    if (!media) return res.status(404).json({ error: "Файл не найден" });

    // Удаляем файл из uploads (не критично, если не найдётся)
    try {
      const filePath = path.join(__dirname, "..", media.url.replace("/uploads/", "uploads/"));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      if (media.thumbUrl) {
        const thumbPath = path.join(__dirname, "..", media.thumbUrl.replace("/uploads/", "uploads/"));
        if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
      }
    } catch (e) {
      console.warn("Не удалось удалить файл медиа:", e.message);
    }

    await media.destroy();

    const io = req.app.get("io");
    if (io) io.to(`project_${id}`).emit("media:removed", { id: mediaId });

    res.json({ success: true });
  } catch (err) {
    console.error("Ошибка удаления медиа:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;
