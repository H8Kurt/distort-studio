const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/auth");

// === Получить всех пользователей ===
router.get("/", async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (err) {
    console.error("Ошибка получения пользователей:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// === Создать пользователя (только авторизованным) ===
router.post("/", auth, async (req, res) => {
  try {
    const { username, email } = req.body;
    if (!username || !email) return res.status(400).json({ error: "Введите имя и email" });

    const user = await User.create({ username, email });
    res.json(user);

    // отправляем обновление всем клиентам
    const io = req.app.get("io");
    io.emit("user:created", user);
  } catch (err) {
    console.error("Ошибка создания пользователя:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// === Обновить профиль пользователя ===
router.put("/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    const { username, email, bio, avatarUrl, rebelRank } = req.body;

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    // Проверяем, что пользователь редактирует только свой профиль
    if (req.user.id !== user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Нет прав для редактирования" });
    }

    if (username) user.username = username;
    if (email) user.email = email;
    if (bio !== undefined) user.bio = bio;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (rebelRank !== undefined) user.rebelRank = rebelRank;

    await user.save();

    const io = req.app.get("io");
    io.emit("user:updated", user);

    res.json(user);
  } catch (err) {
    console.error("Ошибка обновления пользователя:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// === Удалить пользователя ===
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await User.destroy({ where: { id } });

    const io = req.app.get("io");
    io.emit("user:deleted", { id });

    res.json({ success: true });
  } catch (err) {
    console.error("Ошибка удаления пользователя:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;
