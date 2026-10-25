const express = require("express");
const { Op, fn, col } = require("sequelize");
const router = express.Router();
const auth = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");
const sequelize = require("../db");
const {
  User,
  Post,
  PostLike,
  PostComment,
  Project,
  Media,
  Session,
  Version,
  Branch,
  Collab,
  File,
  Comment,
  App,
  Asset,
  AssetLike,
  Order,
  Track,
  TrackLike,
  Playlist,
  PlaylistTrack,
  Follow,
  Friendship,
  ConversationMember,
  EmailToken,
  Message,
  MessageReaction,
  Like,
  Notification,
  Report,
  Block,
  Mute,
  Room,
  RoomMember,
  RoomMessage,
  Challenge,
  ChallengeEntry,
  ChallengeVote,
} = require("../models/associations");
const { getAllSettings, setSettings } = require("../lib/settings");
const { ensureOfficialAccount } = require("../lib/official");

router.use(auth, requireAdmin);

// Видимые поля пользователя для админки
const SAFE_USER = [
  "id",
  "username",
  "email",
  "role",
  "status",
  "bio",
  "avatarUrl",
  "bannerUrl",
  "frameId",
  "rebelRank",
  "isOfficial",
  "emailVerified",
  "bannedAt",
  "banReason",
  "createdAt",
  "lastSeenAt",
];

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function startOfDay(daysAgo = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

// ============================
// GET /api/admin/stats — сводная статистика
// ============================
router.get("/stats", async (req, res) => {
  try {
    const since30 = daysAgo(30);
    const seriesQuery = (Model, since) =>
      Model.findAll({
        attributes: [
          [fn("DATE", col("createdAt")), "date"],
          [fn("COUNT", col("id")), "count"],
        ],
        where: { createdAt: { [Op.gte]: since } },
        group: [fn("DATE", col("createdAt"))],
        order: [[fn("DATE", col("createdAt")), "ASC"]],
        raw: true,
      });

    const [
      usersTotal,
      usersActive,
      usersSuspended,
      usersBanned,
      usersOfficial,
      usersToday,
      users7,
      users30,
      posts,
      projects,
      comments,
      tracks,
      assets,
      playlists,
      rooms,
      challenges,
      openReports,
      orders,
      paidOrders,
      revenue,
      signupsSeries,
      postsSeries,
    ] = await Promise.all([
      User.count(),
      User.count({ where: { status: "active" } }),
      User.count({ where: { status: "suspended" } }),
      User.count({ where: { status: "banned" } }),
      User.count({ where: { isOfficial: true } }),
      User.count({ where: { createdAt: { [Op.gte]: startOfDay() } } }),
      User.count({ where: { createdAt: { [Op.gte]: daysAgo(7) } } }),
      User.count({ where: { createdAt: { [Op.gte]: since30 } } }),
      Post.count(),
      Project.count(),
      Comment.count(),
      Track.count(),
      Asset.count(),
      Playlist.count(),
      Room.count(),
      Challenge.count(),
      Report.count({ where: { status: { [Op.in]: ["open", "reviewing"] } } }),
      Order.count(),
      Order.count({ where: { status: "paid" } }),
      Order.sum("amount", { where: { status: "paid" } }),
      seriesQuery(User, since30),
      seriesQuery(Post, since30),
    ]);

    res.json({
      users: {
        total: usersTotal,
        active: usersActive,
        suspended: usersSuspended,
        banned: usersBanned,
        official: usersOfficial,
        newToday: usersToday,
        new7: users7,
        new30: users30,
      },
      content: { posts, projects, comments, tracks, assets, playlists, rooms, challenges },
      moderation: { openReports },
      commerce: { orders, paidOrders, revenue: Number(revenue) || 0 },
      signupsSeries,
      postsSeries,
    });
  } catch (err) {
    console.error("Ошибка статистики админки:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ============================
// GET /api/admin/users — список с поиском
// ============================
router.get("/users", async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const role = req.query.role ? String(req.query.role) : "";
    const status = req.query.status ? String(req.query.status) : "";
    const page = clampInt(req.query.page, 1, 100000, 1);
    const limit = clampInt(req.query.limit, 1, 100, 25);
    const offset = (page - 1) * limit;

    const where = {};
    if (q) {
      where[Op.or] = [
        { username: { [Op.like]: `%${q}%` } },
        { email: { [Op.like]: `%${q}%` } },
      ];
    }
    if (role) where.role = role;
    if (status) where.status = status;

    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: SAFE_USER,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    res.json({ users: rows, total: count, page, limit });
  } catch (err) {
    console.error("Ошибка списка пользователей:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ============================
// GET /api/admin/users/:id — детали
// ============================
router.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, { attributes: SAFE_USER });
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    const [projects, posts, followers, following, reportsAgainst] = await Promise.all([
      Project.count({ where: { UserId: user.id } }),
      Post.count({ where: { userId: user.id } }),
      Follow.count({ where: { followingId: user.id } }),
      Follow.count({ where: { followerId: user.id } }),
      Report.count({ where: { targetType: "user", targetId: user.id } }),
    ]);

    res.json({ ...user.toJSON(), stats: { projects, posts, followers, following, reportsAgainst } });
  } catch (err) {
    console.error("Ошибка деталей пользователя:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ============================
// PATCH /api/admin/users/:id — роль/статус/подтверждение
// ============================
router.patch("/users/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    const { role, status, emailVerified, isOfficial } = req.body;

    if (role !== undefined) {
      if (!["user", "admin"].includes(role)) return res.status(400).json({ error: "Неверная роль" });
      if (user.id === req.user.id && role !== "admin") {
        return res.status(400).json({ error: "Нельзя снять права с себя" });
      }
      user.role = role;
    }
    if (emailVerified !== undefined) {
      user.emailVerified = Boolean(emailVerified);
      user.emailVerifiedAt = emailVerified ? new Date() : null;
    }
    if (isOfficial !== undefined) user.isOfficial = Boolean(isOfficial);
    if (status !== undefined) {
      if (!["active", "suspended", "banned"].includes(status)) {
        return res.status(400).json({ error: "Неверный статус" });
      }
      if (user.id === req.user.id && status !== "active") {
        return res.status(400).json({ error: "Нельзя заблокировать себя" });
      }
      user.status = status;
      if (status === "active") {
        user.bannedAt = null;
        user.banReason = null;
      } else {
        user.bannedAt = new Date();
        user.banReason = req.body.banReason ? String(req.body.banReason).slice(0, 250) : null;
      }
    }

    await user.save();
    const io = req.app.get("io");
    if (io) io.emit("user:updated", { id: user.id, status: user.status, role: user.role });

    res.json(user.toJSON());
  } catch (err) {
    console.error("Ошибка обновления пользователя:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ============================
// DELETE /api/admin/users/:id — полное удаление с каскадом
// ============================
router.delete("/users/:id", async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: "Неверный id" });
  if (userId === req.user.id) return res.status(400).json({ error: "Нельзя удалить себя" });

  const user = await User.findByPk(userId);
  if (!user) return res.status(404).json({ error: "Пользователь не найден" });
  if (user.isOfficial) return res.status(400).json({ error: "Нельзя удалить официальный аккаунт" });

  const t = await sequelize.transaction();
  try {
    // Челленджи, созданные пользователем
    const createdChallenges = await Challenge.findAll({
      where: { createdById: userId },
      attributes: ["id"],
      transaction: t,
    });
    const challengeIds = createdChallenges.map((c) => c.id);
    if (challengeIds.length) {
      const entries = await ChallengeEntry.findAll({
        where: { challengeId: { [Op.in]: challengeIds } },
        attributes: ["id"],
        transaction: t,
      });
      const entryIds = entries.map((e) => e.id);
      if (entryIds.length) {
        await ChallengeVote.destroy({ where: { entryId: { [Op.in]: entryIds } }, transaction: t });
      }
      await ChallengeEntry.destroy({ where: { challengeId: { [Op.in]: challengeIds } }, transaction: t });
      await Challenge.destroy({ where: { id: { [Op.in]: challengeIds } }, transaction: t });
    }
    // Участие в челленджах
    const myEntries = await ChallengeEntry.findAll({
      where: { userId },
      attributes: ["id"],
      transaction: t,
    });
    const myEntryIds = myEntries.map((e) => e.id);
    if (myEntryIds.length) {
      await ChallengeVote.destroy({ where: { entryId: { [Op.in]: myEntryIds } }, transaction: t });
      await ChallengeEntry.destroy({ where: { id: { [Op.in]: myEntryIds } }, transaction: t });
    }
    await ChallengeVote.destroy({ where: { userId }, transaction: t });

    // Посты
    const posts = await Post.findAll({ where: { userId }, attributes: ["id"], transaction: t });
    const postIds = posts.map((p) => p.id);
    if (postIds.length) {
      await PostLike.destroy({ where: { postId: { [Op.in]: postIds } }, transaction: t });
      await PostComment.destroy({ where: { postId: { [Op.in]: postIds } }, transaction: t });
    }
    await PostComment.destroy({ where: { userId }, transaction: t });
    await PostLike.destroy({ where: { userId }, transaction: t });
    await Post.destroy({ where: { userId }, transaction: t });

    // Проекты и связанное
    const projects = await Project.findAll({ where: { UserId: userId }, attributes: ["id"], transaction: t });
    const projectIds = projects.map((p) => p.id);
    if (projectIds.length) {
      await Comment.destroy({ where: { projectId: { [Op.in]: projectIds } }, transaction: t });
      await Like.destroy({ where: { projectId: { [Op.in]: projectIds } }, transaction: t });
      await Media.destroy({ where: { ProjectId: { [Op.in]: projectIds } }, transaction: t });
      await Branch.destroy({ where: { projectId: { [Op.in]: projectIds } }, transaction: t });
      await Collab.destroy({ where: { projectId: { [Op.in]: projectIds } }, transaction: t });
      await Session.destroy({ where: { projectId: { [Op.in]: projectIds } }, transaction: t });
      const versions = await Version.findAll({
        where: { projectId: { [Op.in]: projectIds } },
        attributes: ["id"],
        transaction: t,
      });
      const versionIds = versions.map((v) => v.id);
      if (versionIds.length) {
        await Comment.destroy({ where: { versionId: { [Op.in]: versionIds } }, transaction: t });
        await File.destroy({ where: { versionId: { [Op.in]: versionIds } }, transaction: t });
      }
      await File.destroy({ where: { projectId: { [Op.in]: projectIds } }, transaction: t });
      await Version.destroy({ where: { projectId: { [Op.in]: projectIds } }, transaction: t });
    }
    await Comment.destroy({ where: { userId }, transaction: t });
    await Like.destroy({ where: { userId }, transaction: t });
    await Collab.destroy({ where: { userId }, transaction: t });
    await Version.destroy({ where: { authorId: userId }, transaction: t });
    await Media.destroy({ where: { UserId: userId }, transaction: t });
    await Project.update({ forkedFromId: null, rootId: null }, { where: { UserId: userId }, transaction: t });
    await Project.destroy({ where: { UserId: userId }, transaction: t });

    // Музыка
    const playlists = await Playlist.findAll({ where: { UserId: userId }, attributes: ["id"], transaction: t });
    const playlistIds = playlists.map((p) => p.id);
    if (playlistIds.length) {
      await PlaylistTrack.destroy({ where: { PlaylistId: { [Op.in]: playlistIds } }, transaction: t });
    }
    await Playlist.destroy({ where: { UserId: userId }, transaction: t });
    const tracks = await Track.findAll({ where: { UserId: userId }, attributes: ["id"], transaction: t });
    const trackIds = tracks.map((tr) => tr.id);
    if (trackIds.length) {
      await TrackLike.destroy({ where: { trackId: { [Op.in]: trackIds } }, transaction: t });
      await PlaylistTrack.destroy({ where: { trackId: { [Op.in]: trackIds } }, transaction: t });
    }
    await TrackLike.destroy({ where: { userId }, transaction: t });
    await Track.destroy({ where: { UserId: userId }, transaction: t });

    // Маркетплейс
    const assets = await Asset.findAll({ where: { UserId: userId }, attributes: ["id"], transaction: t });
    const assetIds = assets.map((a) => a.id);
    if (assetIds.length) {
      await AssetLike.destroy({ where: { assetId: { [Op.in]: assetIds } }, transaction: t });
      await Order.destroy({ where: { assetId: { [Op.in]: assetIds } }, transaction: t });
    }
    await AssetLike.destroy({ where: { userId }, transaction: t });
    await Order.destroy({
      where: { [Op.or]: [{ buyerId: userId }, { sellerId: userId }] },
      transaction: t,
    });
    await Asset.destroy({ where: { UserId: userId }, transaction: t });

    // Комнаты
    const rooms = await Room.findAll({ where: { hostId: userId }, attributes: ["id"], transaction: t });
    const roomIds = rooms.map((r) => r.id);
    if (roomIds.length) {
      await RoomMessage.destroy({ where: { roomId: { [Op.in]: roomIds } }, transaction: t });
      await RoomMember.destroy({ where: { roomId: { [Op.in]: roomIds } }, transaction: t });
      await Room.destroy({ where: { id: { [Op.in]: roomIds } }, transaction: t });
    }
    await RoomMessage.destroy({ where: { userId }, transaction: t });
    await RoomMember.destroy({ where: { userId }, transaction: t });

    // Социальное
    await Follow.destroy({
      where: { [Op.or]: [{ followerId: userId }, { followingId: userId }] },
      transaction: t,
    });
    await Friendship.destroy({
      where: { [Op.or]: [{ requesterId: userId }, { addresseeId: userId }] },
      transaction: t,
    });
    await Notification.destroy({
      where: { [Op.or]: [{ userId }, { actorId: userId }] },
      transaction: t,
    });

    // Чат
    await MessageReaction.destroy({ where: { userId }, transaction: t });
    await Message.destroy({ where: { senderId: userId }, transaction: t });
    await ConversationMember.destroy({ where: { userId }, transaction: t });

    // Прочее
    await App.destroy({ where: { userId }, transaction: t });
    await EmailToken.destroy({ where: { userId }, transaction: t });
    await Report.destroy({
      where: { [Op.or]: [{ reporterId: userId }, { resolvedById: userId }] },
      transaction: t,
    });
    await Block.destroy({
      where: { [Op.or]: [{ blockerId: userId }, { blockedId: userId }] },
      transaction: t,
    });
    await Mute.destroy({
      where: { [Op.or]: [{ userId }, { mutedUserId: userId }] },
      transaction: t,
    });

    await User.destroy({ where: { id: userId }, transaction: t });
    await t.commit();

    const io = req.app.get("io");
    if (io) io.emit("user:deleted", { id: userId });
    res.json({ success: true });
  } catch (err) {
    await t.rollback();
    console.error("Ошибка удаления пользователя:", err);
    res.status(500).json({ error: "Не удалось удалить пользователя с контентом. Попробуйте заблокировать." });
  }
});

// ============================
// GET /api/admin/content?type=... — браузер контента
// ============================
const CONTENT_TYPES = ["post", "project", "comment", "asset", "track", "playlist"];

router.get("/content", async (req, res) => {
  try {
    const type = String(req.query.type || "post");
    if (!CONTENT_TYPES.includes(type)) return res.status(400).json({ error: "Неверный тип" });
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const page = clampInt(req.query.page, 1, 100000, 1);
    const limit = clampInt(req.query.limit, 1, 100, 25);
    const offset = (page - 1) * limit;
    const like = `%${q}%`;
    const base = { limit, offset, order: [["createdAt", "DESC"]] };

    let rows = [];
    let count = 0;

    if (type === "post") {
      const where = q ? { content: { [Op.like]: like } } : {};
      const r = await Post.findAndCountAll({
        ...base,
        where,
        include: [{ model: User, as: "author", attributes: ["id", "username", "avatarUrl", "isOfficial"] }],
      });
      rows = r.rows.map((p) => ({
        id: p.id,
        title: p.content ? p.content.slice(0, 120) : "(изображение)",
        thumbUrl: p.imageUrl || p.thumbUrl,
        author: p.author,
        createdAt: p.createdAt,
        pin: p.isPinned,
      }));
      count = r.count;
    } else if (type === "project") {
      const where = q ? { title: { [Op.like]: like } } : {};
      const r = await Project.findAndCountAll({
        ...base,
        where,
        include: [{ model: User, as: "owner", attributes: ["id", "username", "avatarUrl"] }],
      });
      rows = r.rows.map((p) => ({
        id: p.id,
        title: p.title,
        thumbUrl: p.coverUrl,
        author: p.owner,
        subtitle: p.visibility,
        createdAt: p.createdAt,
      }));
      count = r.count;
    } else if (type === "comment") {
      const where = q ? { content: { [Op.like]: like } } : {};
      const r = await Comment.findAndCountAll({
        ...base,
        where,
        include: [{ model: User, attributes: ["id", "username", "avatarUrl"] }],
      });
      rows = r.rows.map((c) => ({
        id: c.id,
        title: c.content ? c.content.slice(0, 160) : "",
        author: c.User,
        subtitle: `проект #${c.projectId}`,
        createdAt: c.createdAt,
      }));
      count = r.count;
    } else if (type === "asset") {
      const where = q ? { title: { [Op.like]: like } } : {};
      const r = await Asset.findAndCountAll({
        ...base,
        where,
        include: [{ model: User, as: "author", attributes: ["id", "username", "avatarUrl"] }],
      });
      rows = r.rows.map((a) => ({
        id: a.id,
        title: a.title,
        thumbUrl: a.thumbUrl,
        author: a.author,
        subtitle: a.isFree ? "бесплатно" : `${a.price} ₽`,
        createdAt: a.createdAt,
      }));
      count = r.count;
    } else if (type === "track") {
      const where = q
        ? { [Op.or]: [{ title: { [Op.like]: like } }, { artist: { [Op.like]: like } }] }
        : {};
      const r = await Track.findAndCountAll({
        ...base,
        where,
        include: [{ model: User, as: "owner", attributes: ["id", "username", "avatarUrl"] }],
      });
      rows = r.rows.map((t) => ({
        id: t.id,
        title: t.title,
        thumbUrl: t.thumbUrl,
        author: t.owner,
        subtitle: t.artist || t.genre,
        createdAt: t.createdAt,
      }));
      count = r.count;
    } else if (type === "playlist") {
      const where = q ? { title: { [Op.like]: like } } : {};
      const r = await Playlist.findAndCountAll({
        ...base,
        where,
        include: [{ model: User, as: "owner", attributes: ["id", "username", "avatarUrl"] }],
      });
      rows = r.rows.map((p) => ({
        id: p.id,
        title: p.title,
        thumbUrl: p.coverUrl,
        author: p.owner,
        subtitle: p.isPublic ? "публичный" : "приватный",
        createdAt: p.createdAt,
      }));
      count = r.count;
    }

    res.json({ type, items: rows, total: count, page, limit });
  } catch (err) {
    console.error("Ошибка браузера контента:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ============================
// DELETE /api/admin/content/:type/:id
// ============================
router.delete("/content/:type/:id", async (req, res) => {
  try {
    const { type } = req.params;
    const id = Number(req.params.id);
    if (!CONTENT_TYPES.includes(type)) return res.status(400).json({ error: "Неверный тип" });
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Неверный id" });

    if (type === "post") {
      await PostComment.destroy({ where: { postId: id } });
      await PostLike.destroy({ where: { postId: id } });
      await Post.destroy({ where: { id } });
      const io = req.app.get("io");
      if (io) io.emit("post:deleted", { id });
    } else if (type === "project") {
      await Comment.destroy({ where: { projectId: id } });
      await Like.destroy({ where: { projectId: id } });
      await Media.destroy({ where: { ProjectId: id } });
      await Branch.destroy({ where: { projectId: id } });
      await Collab.destroy({ where: { projectId: id } });
      await Session.destroy({ where: { projectId: id } });
      const versions = await Version.findAll({ where: { projectId: id }, attributes: ["id"] });
      const versionIds = versions.map((v) => v.id);
      if (versionIds.length) {
        await Comment.destroy({ where: { versionId: { [Op.in]: versionIds } } });
        await File.destroy({ where: { versionId: { [Op.in]: versionIds } } });
      }
      await File.destroy({ where: { projectId: id } });
      await Version.destroy({ where: { projectId: id } });
      await Project.destroy({ where: { id } });
      const io = req.app.get("io");
      if (io) io.emit("project:deleted", { id });
    } else if (type === "comment") {
      await Comment.destroy({ where: { id } });
    } else if (type === "asset") {
      await AssetLike.destroy({ where: { assetId: id } });
      await Order.destroy({ where: { assetId: id } });
      const asset = await Asset.findByPk(id);
      await Asset.destroy({ where: { id } });
      const io = req.app.get("io");
      if (io) io.emit("asset:deleted", { id: asset?.id ?? id });
    } else if (type === "track") {
      await TrackLike.destroy({ where: { trackId: id } });
      await PlaylistTrack.destroy({ where: { trackId: id } });
      await Track.destroy({ where: { id } });
      const io = req.app.get("io");
      if (io) io.emit("track:deleted", { id });
    } else if (type === "playlist") {
      await PlaylistTrack.destroy({ where: { PlaylistId: id } });
      await Playlist.destroy({ where: { id } });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Ошибка удаления контента:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ============================
// Объявления (посты официального аккаунта)
// ============================
router.get("/posts", async (req, res) => {
  try {
    const official = await User.findOne({ where: { isOfficial: true }, attributes: ["id"] });
    if (!official) return res.json({ posts: [] });
    const posts = await Post.findAll({
      where: { userId: official.id },
      order: [["isPinned", "DESC"], ["createdAt", "DESC"]],
      limit: 50,
    });
    res.json({ posts });
  } catch (err) {
    console.error("Ошибка объявлений:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/posts", async (req, res) => {
  try {
    const official = (await User.findOne({ where: { isOfficial: true } })) || (await ensureOfficialAccount());
    if (!official) return res.status(500).json({ error: "Официальный аккаунт недоступен" });

    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    const imageUrl = typeof req.body.imageUrl === "string" && req.body.imageUrl ? req.body.imageUrl : null;
    if (!content && !imageUrl) return res.status(400).json({ error: "Введите текст объявления" });

    const post = await Post.create({
      userId: official.id,
      content: content || "",
      imageUrl,
      isPinned: Boolean(req.body.pinned),
    });

    const full = await Post.findByPk(post.id, {
      include: [{ model: User, as: "author", attributes: ["id", "username", "avatarUrl", "isOfficial"] }],
    });
    const io = req.app.get("io");
    if (io) io.emit("post:created", full);
    res.status(201).json(full);
  } catch (err) {
    console.error("Ошибка создания объявления:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.patch("/posts/:id", async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ error: "Пост не найден" });
    if (req.body.isPinned !== undefined) post.isPinned = Boolean(req.body.isPinned);
    if (typeof req.body.content === "string") post.content = req.body.content.trim();
    await post.save();
    const io = req.app.get("io");
    if (io) io.emit("post:updated", post);
    res.json(post);
  } catch (err) {
    console.error("Ошибка обновления объявления:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.delete("/posts/:id", async (req, res) => {
  try {
    await PostComment.destroy({ where: { postId: req.params.id } });
    await PostLike.destroy({ where: { postId: req.params.id } });
    await Post.destroy({ where: { id: req.params.id } });
    const io = req.app.get("io");
    if (io) io.emit("post:deleted", { id: Number(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    console.error("Ошибка удаления объявления:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ============================
// Настройки сайта
// ============================
router.get("/settings", async (req, res) => {
  try {
    res.json(await getAllSettings({ fresh: true }));
  } catch (err) {
    console.error("Ошибка чтения настроек:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.put("/settings", async (req, res) => {
  try {
    const allowed = ["maintenance", "signupsOpen", "announcement", "featured"];
    const patch = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    }
    if (!Object.keys(patch).length) return res.status(400).json({ error: "Нет изменений" });
    const saved = await setSettings(patch);
    const io = req.app.get("io");
    if (io) io.emit("settings:changed", saved);
    res.json(saved);
  } catch (err) {
    console.error("Ошибка сохранения настроек:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;
