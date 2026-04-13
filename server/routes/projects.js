const express = require("express");
const router = express.Router();
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const auth = require("../middleware/auth");
const Project = require("../models/Project");
const Media = require("../models/Media");


// =========================
// === MULTER STORAGE
// =========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = file.mimetype.startsWith("image/")
      ? path.join(__dirname, "../uploads/images")
      : path.join(__dirname, "../uploads/audio");

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

const upload = multer({ storage });
// =========================
// === ПРОЕКТЫ
// =========================

// Получить все проекты
router.get("/", async (req, res) => {
  try {
    const { visibility, view } = req.query;
    const where = {};
    
    if (visibility) {
      where.visibility = visibility;
    }
    
    const projects = await Project.findAll({ where });
    res.json(projects);
  } catch (err) {
    console.error("Ошибка получения проектов:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Создать проект (авторизованный пользователь)
router.post("/", auth, async (req, res) => {
  try {
    const { title, description, UserId, visibility } = req.body;
    if (!title) return res.status(400).json({ error: "Введите название проекта" });

    const project = await Project.create({ 
      title, 
      description, 
      UserId,
      visibility: visibility || 'PRIVATE'
    });

    // уведомляем всех клиентов
    const io = req.app.get("io");
    io.emit("project:created", project);

    res.json(project);
  } catch (err) {
    console.error("Ошибка создания проекта:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Обновить проект
router.put("/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    const { title, description, visibility } = req.body;

    const project = await Project.findByPk(id);
    if (!project) return res.status(404).json({ error: "Проект не найден" });

    project.title = title;
    project.description = description;
    if (visibility) project.visibility = visibility;
    await project.save();

    const io = req.app.get("io");
    io.emit("project:updated", project);

    res.json(project);
  } catch (err) {
    console.error("Ошибка обновления проекта:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Удалить проект
router.delete("/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    await Project.destroy({ where: { id } });

    const io = req.app.get("io");
    io.emit("project:deleted", { id });

    res.json({ success: true });
  } catch (err) {
    console.error("Ошибка удаления проекта:", err);
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
      const baseUrl = isImage ? "/uploads/images" : "/uploads/audio";

      let thumbUrl = null;

      // если картинка — делаем превью
      if (isImage) {
        const thumbPath = path.dirname(file.path) + "/thumb-" + file.filename;
        await sharp(file.path).resize(300).toFile(thumbPath);
        thumbUrl = `${baseUrl}/thumb-${file.filename}`;
      }

      // сохраняем в БД
      const media = await Media.create({
        filename: file.filename,
        originalName: file.originalname,
        mime: file.mimetype,
        size: file.size,
        url: `${baseUrl}/${file.filename}`,
        thumbUrl,
        type: isImage ? "image" : "audio",
        UserId: req.user.id,
        ProjectId: project.id,
      });

      // realtime уведомление
      const io = req.app.get("io");
      io.to(`project_${project.id}`).emit("media:added", media);

      res.json(media);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Ошибка загрузки" });
    }
  }
);
router.get("/:id/media", async (req, res) => {
  try {
    const projectId = req.params.id;

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
module.exports = router;
