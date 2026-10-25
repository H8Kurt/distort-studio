const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { getPublicSettings } = require("../lib/settings");
const Project = require("../models/Project");
const User = require("../models/User");

// GET /api/settings/public — публичные настройки для фронта (баннер, техрежим, витрина)
router.get("/public", async (req, res) => {
  try {
    const settings = await getPublicSettings();

    let featuredProjects = [];
    const ids = settings.featured?.projectIds;
    if (Array.isArray(ids) && ids.length) {
      const rows = await Project.findAll({
        where: { id: { [Op.in]: ids }, visibility: "PUBLIC" },
        include: [{ model: User, as: "owner", attributes: ["id", "username", "avatarUrl"] }],
        attributes: ["id", "title", "coverUrl", "updatedAt"],
      });
      const order = new Map(ids.map((id, i) => [Number(id), i]));
      featuredProjects = rows
        .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
        .map((p) => p.toJSON());
    }

    res.json({ ...settings, featuredProjects });
  } catch (err) {
    console.error("Ошибка публичных настроек:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;
