const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");

const auth = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");
const User = require("../models/User");
const Report = require("../models/Report");
const Block = require("../models/Block");
const Mute = require("../models/Mute");
const Friendship = require("../models/Friendship");
const Follow = require("../models/Follow");
const { notify } = require("../lib/notify");
const { reportSchema, reportUpdateSchema, userStatusSchema } = require("../lib/validators");

const CARD = ["id", "username", "avatarUrl", "frameId", "bio", "lastSeenAt"];

function card(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    avatarUrl: u.avatarUrl || null,
    frameId: u.frameId || "none",
    bio: u.bio || null,
    lastSeenAt: u.lastSeenAt || null,
  };
}

// =========================
// === ЖАЛОБЫ
// =========================

// POST /api/moderation/reports — отправить жалобу
router.post("/reports", auth, async (req, res) => {
  try {
    const data = reportSchema.parse(req.body);

    // защита от повторных жалоб на тот же объект
    const existing = await Report.findOne({
      where: {
        reporterId: req.user.id,
        targetType: data.targetType,
        targetId: data.targetId,
        status: { [Op.in]: ["open", "reviewing"] },
      },
    });
    if (existing) {
      return res.status(409).json({ error: "Вы уже отправили жалобу на этот объект" });
    }

    const report = await Report.create({
      reporterId: req.user.id,
      targetType: data.targetType,
      targetId: data.targetId,
      reason: data.reason,
      details: data.details || null,
    });

    // уведомляем всех администраторов
    const admins = await User.findAll({ where: { role: "admin" }, attributes: ["id"] });
    await Promise.all(
      admins.map((a) =>
        notify(req.app, {
          userId: a.id,
          actorId: req.user.id,
          type: "report",
          message: `отправил жалобу (${data.targetType} #${data.targetId})`,
        })
      )
    );

    res.status(201).json({ id: report.id, status: report.status });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: "Ошибка валидации", details: err.errors });
    }
    console.error("Ошибка создания жалобы:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// GET /api/moderation/reports?status=&targetType=&page=&limit= — список жалоб (admin)
router.get("/reports", auth, requireAdmin, async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.targetType) where.targetType = req.query.targetType;

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const page = Math.max(1, Number(req.query.page) || 1);

    const { rows, count } = await Report.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset: (page - 1) * limit,
      include: [{ model: User, as: "reporter", attributes: CARD }],
    });

    const openCount = await Report.count({ where: { status: "open" } });

    res.json({
      reports: rows,
      total: count,
      page,
      pages: Math.ceil(count / limit),
      openCount,
    });
  } catch (err) {
    console.error("Ошибка получения жалоб:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// PATCH /api/moderation/reports/:id — обработать жалобу (admin)
router.patch("/reports/:id", auth, requireAdmin, async (req, res) => {
  try {
    const data = reportUpdateSchema.parse(req.body);
    const report = await Report.findByPk(req.params.id);
    if (!report) return res.status(404).json({ error: "Жалоба не найдена" });

    if (data.status !== undefined) report.status = data.status;
    if (data.resolutionNote !== undefined) report.resolutionNote = data.resolutionNote;
    if (data.status === "resolved" || data.status === "dismissed") {
      report.resolvedById = req.user.id;
      report.resolvedAt = new Date();
    }
    await report.save();

    res.json(report);
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: "Ошибка валидации", details: err.errors });
    }
    console.error("Ошибка обновления жалобы:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// =========================
// === БЛОКИРОВКИ
// =========================

// GET /api/moderation/blocks — мои блокировки
router.get("/blocks", auth, async (req, res) => {
  try {
    const rows = await Block.findAll({
      where: { blockerId: req.user.id },
      include: [{ model: User, as: "blocked", attributes: CARD }],
      order: [["createdAt", "DESC"]],
    });
    res.json(rows.map((r) => ({ id: r.id, user: card(r.blocked) })));
  } catch (err) {
    console.error("Ошибка получения блокировок:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /api/moderation/blocks/:userId — заблокировать
router.post("/blocks/:userId", auth, async (req, res) => {
  try {
    const me = req.user.id;
    const target = Number(req.params.userId);
    if (!Number.isInteger(target)) return res.status(400).json({ error: "Неверный id" });
    if (target === me) return res.status(400).json({ error: "Нельзя заблокировать себя" });

    const user = await User.findByPk(target, { attributes: ["id"] });
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    await Block.findOrCreate({ where: { blockerId: me, blockedId: target } });
    // при блокировке обрываем дружбу и подписки в обе стороны
    await Friendship.destroy({
      where: {
        [Op.or]: [
          { requesterId: me, addresseeId: target },
          { requesterId: target, addresseeId: me },
        ],
      },
    });
    await Follow.destroy({
      where: {
        [Op.or]: [
          { followerId: me, followingId: target },
          { followerId: target, followingId: me },
        ],
      },
    });

    const io = req.app.get("io");
    if (io) io.to(`user_${target}`).emit("moderation:blocked", { by: me });

    res.json({ blocked: true });
  } catch (err) {
    console.error("Ошибка блокировки:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// DELETE /api/moderation/blocks/:userId — разблокировать
router.delete("/blocks/:userId", auth, async (req, res) => {
  try {
    const target = Number(req.params.userId);
    if (!Number.isInteger(target)) return res.status(400).json({ error: "Неверный id" });
    await Block.destroy({ where: { blockerId: req.user.id, blockedId: target } });
    res.json({ blocked: false });
  } catch (err) {
    console.error("Ошибка разблокировки:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// =========================
// === МЬЮТЫ
// =========================

// GET /api/moderation/mutes — мои мьюты
router.get("/mutes", auth, async (req, res) => {
  try {
    const rows = await Mute.findAll({
      where: { userId: req.user.id },
      include: [{ model: User, as: "muted", attributes: CARD }],
      order: [["createdAt", "DESC"]],
    });
    res.json(rows.map((r) => ({ id: r.id, user: card(r.muted) })));
  } catch (err) {
    console.error("Ошибка получения мьютов:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /api/moderation/mutes/:userId — замьютить
router.post("/mutes/:userId", auth, async (req, res) => {
  try {
    const me = req.user.id;
    const target = Number(req.params.userId);
    if (!Number.isInteger(target)) return res.status(400).json({ error: "Неверный id" });
    if (target === me) return res.status(400).json({ error: "Нельзя замьютить себя" });

    const user = await User.findByPk(target, { attributes: ["id"] });
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    await Mute.findOrCreate({ where: { userId: me, mutedUserId: target } });
    res.json({ muted: true });
  } catch (err) {
    console.error("Ошибка мьюта:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// DELETE /api/moderation/mutes/:userId — снять мьют
router.delete("/mutes/:userId", auth, async (req, res) => {
  try {
    const target = Number(req.params.userId);
    if (!Number.isInteger(target)) return res.status(400).json({ error: "Неверный id" });
    await Mute.destroy({ where: { userId: req.user.id, mutedUserId: target } });
    res.json({ muted: false });
  } catch (err) {
    console.error("Ошибка снятия мьюта:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// =========================
// === АДМИН: СТАТУСЫ ПОЛЬЗОВАТЕЛЕЙ
// =========================

// POST /api/moderation/admin/users/:id/status — ban/suspend/active (admin)
router.post("/admin/users/:id/status", auth, requireAdmin, async (req, res) => {
  try {
    const data = userStatusSchema.parse(req.body);
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });
    if (user.role === "admin" && data.status !== "active") {
      return res.status(400).json({ error: "Нельзя заблокировать администратора" });
    }

    user.status = data.status;
    if (data.status === "active") {
      user.bannedAt = null;
      user.banReason = null;
    } else {
      user.bannedAt = new Date();
      user.banReason = data.reason || null;
      user.refreshToken = null; // разлогиниваем
    }
    await user.save();

    const io = req.app.get("io");
    if (io) {
      io.to(`user_${user.id}`).emit("moderation:status", { status: user.status });
      // при бане рвём активные сокеты пользователя
      if (data.status !== "active") {
        io.in(`user_${user.id}`).disconnectSockets(true);
      }
    }

    res.json({ id: user.id, status: user.status });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: "Ошибка валидации", details: err.errors });
    }
    console.error("Ошибка смены статуса:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;
