const express = require("express");
const { Op } = require("sequelize");
const router = express.Router();
const User = require("../models/User");
const Project = require("../models/Project");
const Post = require("../models/Post");
const Asset = require("../models/Asset");
const auth = require("../middleware/auth");
const { getHiddenUserIds } = require("../lib/moderation");

const LIMIT = 8;

// GET /api/search?q= — единый поиск по пользователям, проектам, постам, тегам и ассетам
router.get("/", auth, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 1) {
      return res.json({ query: q, users: [], projects: [], posts: [], assets: [], tags: [] });
    }
    const like = `%${q}%`;
    const hidden = await getHiddenUserIds(req.user.id);
    const notHidden = hidden.length ? { [Op.notIn]: hidden } : undefined;

    const userWhere = { username: { [Op.like]: like }, status: "active" };
    if (notHidden) userWhere.id = notHidden;
    const projectWhere = { title: { [Op.like]: like }, visibility: "PUBLIC" };
    if (notHidden) projectWhere.UserId = notHidden;
    const postWhere = { content: { [Op.like]: like } };
    if (notHidden) postWhere.userId = notHidden;
    const assetWhere = { title: { [Op.like]: like } };
    if (notHidden) assetWhere.UserId = notHidden;
    const tagWhere = { visibility: "PUBLIC" };
    if (notHidden) tagWhere.UserId = notHidden;

    const [users, projects, posts, assets, tagSource] = await Promise.all([
      User.findAll({
        where: userWhere,
        attributes: ["id", "username", "avatarUrl", "frameId", "bio"],
        limit: 6,
      }),
      Project.findAll({
        where: projectWhere,
        include: [{ model: User, as: "owner", attributes: ["id", "username", "avatarUrl"] }],
        order: [["createdAt", "DESC"]],
        limit: 6,
      }),
      Post.findAll({
        where: postWhere,
        include: [{ model: User, as: "author", attributes: ["id", "username", "avatarUrl"] }],
        order: [["createdAt", "DESC"]],
        limit: 6,
      }),
      Asset.findAll({
        where: assetWhere,
        include: [{ model: User, as: "author", attributes: ["id", "username", "avatarUrl"] }],
        order: [["createdAt", "DESC"]],
        limit: 6,
      }),
      Project.findAll({ where: tagWhere, attributes: ["tags"], limit: 500 }),
    ]);

    const counts = new Map();
    for (const p of tagSource) {
      for (const tag of p.tags || []) {
        const key = String(tag);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    const tags = [...counts.entries()]
      .filter(([tag]) => tag.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    res.json({ query: q, users, projects, posts, assets, tags });
  } catch (err) {
    console.error("Ошибка поиска:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;
