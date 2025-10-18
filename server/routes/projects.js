const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const auth = require("../middleware/auth");

// === Получить все проекты ===
router.get("/", async (req, res) => {
  try {
    const projects = await Project.findAll();
    res.json(projects);
  } catch (err) {
    console.error("Ошибка получения проектов:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// === Создать проект (авторизованный пользователь) ===
router.post("/", auth, async (req, res) => {
  try {
    const { title, description, UserId } = req.body;
    if (!title) return res.status(400).json({ error: "Введите название проекта" });

    const project = await Project.create({ title, description, UserId });
    res.json(project);

    // уведомляем всех клиентов
    const io = req.app.get("io");
    io.emit("project:created", project);
  } catch (err) {
    console.error("Ошибка создания проекта:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// === Обновить проект ===
router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { title, description } = req.body;

    const project = await Project.findByPk(id);
    if (!project) return res.status(404).json({ error: "Проект не найден" });

    project.title = title;
    project.description = description;
    await project.save();

    const io = req.app.get("io");
    io.emit("project:updated", project);

    res.json(project);
  } catch (err) {
    console.error("Ошибка обновления проекта:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// === Удалить проект ===
router.delete("/:id", async (req, res) => {
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

module.exports = router;
