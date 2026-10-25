const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const User = require("../models/User");
const Follow = require("../models/Follow");
const Friendship = require("../models/Friendship");
const Like = require("../models/Like");
const Project = require("../models/Project");
const auth = require("../middleware/auth");
const { notify } = require("../lib/notify");
const { computeProfileStats } = require("../lib/profile");
const { getBlockedIds, getMutedIds } = require("../lib/moderation");

const HIDDEN = ["passwordHash", "refreshToken"];

function publicUser(user) {
  const json = typeof user.toJSON === "function" ? user.toJSON() : { ...user };
  for (const key of HIDDEN) delete json[key];
  return json;
}

// Публичное представление пользователя для чужих глаз (без email)
function publicCard(user) {
  const json = publicUser(user);
  delete json.email;
  return json;
}

// === Получить всех пользователей ===
router.get("/", async (req, res) => {
  try {
    const users = await User.findAll({ where: { status: "active" } });
    res.json(users.map(publicCard));
  } catch (err) {
    console.error("Ошибка получения пользователей:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// === Публичный профиль пользователя + соцстатистика ===
router.get("/:id", auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Неверный id" });

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    const isSelf = req.user.id === id;
    if (!isSelf && user.status !== "active" && req.user.role !== "admin") {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    let isBlocked = false;
    let isMuted = false;
    if (!isSelf) {
      const [blockedIds, mutedIds] = await Promise.all([
        getBlockedIds(req.user.id),
        getMutedIds(req.user.id),
      ]);
      isBlocked = blockedIds.includes(id);
      isMuted = mutedIds.includes(id);
      if (isBlocked) {
        return res.status(403).json({ error: "Пользователь недоступен", blocked: true });
      }
    }

    const [followersCount, followingCount, projectsCount, likesCount, follow, projects, stats, friendship, friendsCount] =
      await Promise.all([
        Follow.count({ where: { followingId: id } }),
        Follow.count({ where: { followerId: id } }),
        Project.count({ where: { UserId: id, visibility: "PUBLIC" } }),
        Like.count({ include: [{ model: Project, where: { UserId: id }, attributes: [] }] }),
        Follow.findOne({ where: { followerId: req.user.id, followingId: id } }),
        Project.findAll({
          where: { UserId: id, visibility: "PUBLIC" },
          include: [{ model: User, as: "owner", attributes: ["id", "username", "avatarUrl", "frameId"] }],
          order: [["createdAt", "DESC"]],
        }),
        computeProfileStats(id),
        Friendship.findOne({
          where: {
            [Op.or]: [
              { requesterId: req.user.id, addresseeId: id },
              { requesterId: id, addresseeId: req.user.id },
            ],
          },
        }),
        Friendship.count({
          where: {
            status: "accepted",
            [Op.or]: [{ requesterId: id }, { addresseeId: id }],
          },
        }),
      ]);

    let friendStatus = "none";
    if (req.user.id !== id && friendship) {
      if (friendship.status === "accepted") friendStatus = "friends";
      else if (friendship.status === "pending") {
        friendStatus = friendship.requesterId === req.user.id ? "outgoing" : "incoming";
      }
    }

    res.json({
      ...publicCard(user),
      followersCount,
      followingCount,
      projectsCount,
      likesCount,
      isFollowing: !!follow,
      isSelf,
      isBlocked,
      isMuted,
      friendStatus,
      friendsCount,
      projects,
      stats,
    });
  } catch (err) {
    console.error("Ошибка получения профиля:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// === Подписаться на пользователя ===
router.post("/:id/follow", auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: "Нельзя подписаться на себя" });

    const target = await User.findByPk(id);
    if (!target) return res.status(404).json({ error: "Пользователь не найден" });

    const [, created] = await Follow.findOrCreate({
      where: { followerId: req.user.id, followingId: id },
    });
    const followersCount = await Follow.count({ where: { followingId: id } });

    if (created) {
      await notify(req.app, {
        userId: id,
        actorId: req.user.id,
        type: "follow",
        message: "подписался на вас",
      });
    }

    res.json({ following: true, followersCount });
  } catch (err) {
    console.error("Ошибка подписки:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// === Отписаться ===
router.delete("/:id/follow", auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await Follow.destroy({ where: { followerId: req.user.id, followingId: id } });
    const followersCount = await Follow.count({ where: { followingId: id } });
    res.json({ following: false, followersCount });
  } catch (err) {
    console.error("Ошибка отписки:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// === Подписчики ===
router.get("/:id/followers", auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await Follow.findAll({
      where: { followingId: id },
      include: [{ model: User, as: "follower", attributes: ["id", "username", "avatarUrl", "bio"] }],
      order: [["createdAt", "DESC"]],
    });
    res.json(rows.map((r) => r.follower));
  } catch (err) {
    console.error("Ошибка получения подписчиков:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// === Подписки ===
router.get("/:id/following", auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await Follow.findAll({
      where: { followerId: id },
      include: [{ model: User, as: "following", attributes: ["id", "username", "avatarUrl", "bio"] }],
      order: [["createdAt", "DESC"]],
    });
    res.json(rows.map((r) => r.following));
  } catch (err) {
    console.error("Ошибка получения подписок:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// === Создать пользователя (только авторизованным) ===
router.post("/", auth, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email) return res.status(400).json({ error: "Введите имя и email" });

    const user = await User.create({ username, email, passwordHash: password || 'changeme123' });
    res.status(201).json(publicUser(user));

    // отправляем обновление всем клиентам
    const io = req.app.get("io");
    if (io) io.emit("user:created", publicUser(user));
  } catch (err) {
    console.error("Ошибка создания пользователя:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// === Обновить профиль пользователя ===
router.put("/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    const { username, email, bio, avatarUrl, bannerUrl, frameId, rebelRank } = req.body;

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
    if (bannerUrl !== undefined) user.bannerUrl = bannerUrl;
    if (frameId !== undefined) user.frameId = frameId;
    if (rebelRank !== undefined) user.rebelRank = rebelRank;

    await user.save();

    const io = req.app.get("io");
    if (io) io.emit("user:updated", publicUser(user));

    res.json(publicUser(user));
  } catch (err) {
    console.error("Ошибка обновления пользователя:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// === Удалить пользователя ===
router.delete("/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;

    if (String(req.user.id) !== String(id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Нет прав для удаления" });
    }

    await User.destroy({ where: { id } });

    const io = req.app.get("io");
    if (io) io.emit("user:deleted", { id });

    res.json({ success: true });
  } catch (err) {
    console.error("Ошибка удаления пользователя:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;
