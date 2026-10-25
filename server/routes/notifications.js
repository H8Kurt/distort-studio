const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Project = require("../models/Project");

const ACTOR = { model: User, as: "actor", attributes: ["id", "username", "avatarUrl"] };
const PROJECT = { model: Project, attributes: ["id", "title"] };

// GET /api/notifications — список уведомлений текущего пользователя
router.get("/", auth, async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      include: [ACTOR, PROJECT],
      order: [["createdAt", "DESC"]],
      limit: 50,
    });
    res.json(notifications);
  } catch (err) {
    console.error("Ошибка получения уведомлений:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// GET /api/notifications/unread-count
router.get("/unread-count", auth, async (req, res) => {
  try {
    const count = await Notification.count({ where: { userId: req.user.id, read: false } });
    res.json({ count });
  } catch (err) {
    console.error("Ошибка подсчёта уведомлений:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /api/notifications/read-all
router.post("/read-all", auth, async (req, res) => {
  try {
    await Notification.update({ read: true }, { where: { userId: req.user.id, read: false } });
    res.json({ success: true });
  } catch (err) {
    console.error("Ошибка отметки уведомлений:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /api/notifications/:id/read
router.post("/:id/read", auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!notification) return res.status(404).json({ error: "Уведомление не найдено" });
    notification.read = true;
    await notification.save();
    res.json(notification);
  } catch (err) {
    console.error("Ошибка отметки уведомления:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// DELETE /api/notifications/:id
router.delete("/:id", auth, async (req, res) => {
  try {
    await Notification.destroy({ where: { id: req.params.id, userId: req.user.id } });
    res.json({ success: true });
  } catch (err) {
    console.error("Ошибка удаления уведомления:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;
