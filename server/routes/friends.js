const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const auth = require("../middleware/auth");
const User = require("../models/User");
const Friendship = require("../models/Friendship");
const { notify } = require("../lib/notify");
const { isBlockedBetween } = require("../lib/moderation");

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

async function findBetween(a, b) {
  return Friendship.findOne({
    where: {
      [Op.or]: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
  });
}

// === Список друзей ===
router.get("/", auth, async (req, res) => {
  try {
    const me = req.user.id;
    const rows = await Friendship.findAll({
      where: {
        status: "accepted",
        [Op.or]: [{ requesterId: me }, { addresseeId: me }],
      },
    });
    const ids = rows.map((r) => (r.requesterId === me ? r.addresseeId : r.requesterId));
    const users = ids.length
      ? await User.findAll({ where: { id: ids }, attributes: CARD, order: [["username", "ASC"]] })
      : [];
    res.json(users.map(card));
  } catch (err) {
    console.error("Ошибка получения друзей:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// GET /api/friends/requests — входящие и исходящие заявки
router.get("/requests", auth, async (req, res) => {
  try {
    const me = req.user.id;
    const [incoming, outgoing] = await Promise.all([
      Friendship.findAll({ where: { addresseeId: me, status: "pending" } }),
      Friendship.findAll({ where: { requesterId: me, status: "pending" } }),
    ]);

    const otherId = (r, direction) => (direction === "in" ? r.requesterId : r.addresseeId);
    const ids = [
      ...incoming.map((r) => otherId(r, "in")),
      ...outgoing.map((r) => otherId(r, "out")),
    ];
    const users = ids.length
      ? await User.findAll({ where: { id: ids }, attributes: CARD })
      : [];
    const byId = new Map(users.map((u) => [u.id, card(u)]));

    res.json({
      incoming: incoming.map((r) => ({ id: r.id, user: byId.get(r.requesterId) })),
      outgoing: outgoing.map((r) => ({ id: r.id, user: byId.get(r.addresseeId) })),
    });
  } catch (err) {
    console.error("Ошибка получения заявок:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /api/friends/request/:userId — отправить заявку
router.post("/request/:userId", auth, async (req, res) => {
  try {
    const me = req.user.id;
    const target = Number(req.params.userId);
    if (!Number.isInteger(target)) return res.status(400).json({ error: "Неверный id" });
    if (target === me) return res.status(400).json({ error: "Нельзя добавить себя" });

    const targetUser = await User.findByPk(target, { attributes: ["id"] });
    if (!targetUser) return res.status(404).json({ error: "Пользователь не найден" });

    if (await isBlockedBetween(me, target)) {
      return res.status(403).json({ error: "Пользователь недоступен" });
    }

    const existing = await findBetween(me, target);
    if (existing) {
      if (existing.status === "accepted") return res.json({ status: "friends" });
      if (existing.status === "pending") {
        return res.json({ status: existing.requesterId === me ? "outgoing" : "incoming" });
      }
      // ранее отклонённую заявку можно отправить заново
      existing.requesterId = me;
      existing.addresseeId = target;
      existing.status = "pending";
      await existing.save();
    } else {
      await Friendship.create({ requesterId: me, addresseeId: target, status: "pending" });
    }

    await notify(req.app, {
      userId: target,
      actorId: me,
      type: "friend_request",
      message: "хочет добавить вас в друзья",
    });
    res.json({ status: "outgoing" });
  } catch (err) {
    console.error("Ошибка заявки в друзья:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /api/friends/accept/:userId — принять заявку от userId
router.post("/accept/:userId", auth, async (req, res) => {
  try {
    const me = req.user.id;
    const other = Number(req.params.userId);
    const friendship = await Friendship.findOne({
      where: { requesterId: other, addresseeId: me, status: "pending" },
    });
    if (!friendship) return res.status(404).json({ error: "Заявка не найдена" });
    friendship.status = "accepted";
    await friendship.save();

    await notify(req.app, {
      userId: other,
      actorId: me,
      type: "friend_accept",
      message: "принял(а) вашу заявку в друзья",
    });
    res.json({ status: "friends" });
  } catch (err) {
    console.error("Ошибка принятия заявки:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /api/friends/decline/:userId — отклонить заявку от userId
router.post("/decline/:userId", auth, async (req, res) => {
  try {
    const me = req.user.id;
    const other = Number(req.params.userId);
    await Friendship.destroy({
      where: { requesterId: other, addresseeId: me, status: "pending" },
    });
    res.json({ status: "none" });
  } catch (err) {
    console.error("Ошибка отклонения заявки:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// DELETE /api/friends/:userId — удалить из друзей / отменить заявку
router.delete("/:userId", auth, async (req, res) => {
  try {
    const me = req.user.id;
    const other = Number(req.params.userId);
    await Friendship.destroy({
      where: {
        [Op.or]: [
          { requesterId: me, addresseeId: other },
          { requesterId: other, addresseeId: me },
        ],
      },
    });
    res.json({ status: "none" });
  } catch (err) {
    console.error("Ошибка удаления из друзей:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;
