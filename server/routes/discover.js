const express = require("express");
const router = express.Router();
const { literal, Op } = require("sequelize");
const Project = require("../models/Project");
const User = require("../models/User");
const auth = require("../middleware/auth");
const { getHiddenUserIds } = require("../lib/moderation");

const OWNER = { model: User, as: "owner", attributes: ["id", "username", "avatarUrl", "frameId"] };
const PROJECT_LIKES = [
  literal(
    "(SELECT COUNT(*) FROM Likes WHERE Likes.projectId = Project.id)"
  ),
  "likesCount",
];
const USER_FOLLOWERS = [
  literal(
    "(SELECT COUNT(*) FROM Follows WHERE Follows.followingId = User.id)"
  ),
  "followersCount",
];

// GET /api/discover — тренды, топ-проекты, новые проекты, авторы
router.get("/", auth, async (req, res) => {
  try {
    const hidden = await getHiddenUserIds(req.user.id);
    const projectWhere = { visibility: "PUBLIC" };
    const userWhere = { status: "active" };
    if (hidden.length) {
      projectWhere.UserId = { [Op.notIn]: hidden };
      userWhere.id = { [Op.notIn]: hidden };
    }

    const [topProjects, newProjects, tagSource, creators] = await Promise.all([
      Project.findAll({
        where: projectWhere,
        attributes: { include: [PROJECT_LIKES] },
        include: [OWNER],
        order: [[literal("likesCount"), "DESC"], ["createdAt", "DESC"]],
        limit: 8,
      }),
      Project.findAll({
        where: projectWhere,
        include: [OWNER],
        order: [["createdAt", "DESC"]],
        limit: 8,
      }),
      Project.findAll({ where: projectWhere, attributes: ["tags"], limit: 500 }),
      User.findAll({
        where: userWhere,
        attributes: { include: [USER_FOLLOWERS] },
        order: [[literal("followersCount"), "DESC"], ["createdAt", "ASC"]],
        limit: 8,
      }),
    ]);

    const counts = new Map();
    for (const p of tagSource) {
      for (const tag of p.tags || []) {
        const key = String(tag);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    const trendingTags = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tag, count]) => ({ tag, count }));

    res.json({ topProjects, newProjects, trendingTags, creators });
  } catch (err) {
    console.error("Ошибка discover:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;
