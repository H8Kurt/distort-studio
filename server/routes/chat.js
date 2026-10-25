const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const auth = require("../middleware/auth");
const User = require("../models/User");
const Friendship = require("../models/Friendship");
const Conversation = require("../models/Conversation");
const ConversationMember = require("../models/ConversationMember");
const Message = require("../models/Message");
const MessageReaction = require("../models/MessageReaction");
const { isBlockedBetween } = require("../lib/moderation");

const CARD = ["id", "username", "avatarUrl", "frameId", "lastSeenAt"];

const MESSAGE_INCLUDE = [
  { model: User, as: "sender", attributes: CARD },
  { model: Message, as: "replyTo", attributes: ["id", "text", "senderId"] },
  {
    model: MessageReaction,
    as: "reactions",
    attributes: ["id", "userId", "emoji"],
    include: [{ model: User, attributes: ["id", "username"] }],
  },
];

function card(u) {
  if (!u) return null;
  const j = u.toJSON ? u.toJSON() : u;
  return {
    id: j.id,
    username: j.username,
    avatarUrl: j.avatarUrl || null,
    frameId: j.frameId || "none",
    lastSeenAt: j.lastSeenAt || null,
  };
}

function serializeMessage(m, me, readBy) {
  const json = m.toJSON ? m.toJSON() : m;
  const groups = new Map();
  for (const r of json.reactions || []) {
    const g = groups.get(r.emoji) || { emoji: r.emoji, count: 0, mine: false, users: [] };
    g.count += 1;
    if (r.userId === me) g.mine = true;
    g.users.push({ id: r.userId, username: r.User?.username || "?" });
    groups.set(r.emoji, g);
  }
  const { reactions, ...rest } = json;
  return { ...rest, reactions: [...groups.values()], readBy: readBy ?? undefined };
}

async function areFriends(a, b) {
  const row = await Friendship.findOne({
    where: {
      status: "accepted",
      [Op.or]: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
  });
  return !!row;
}

async function getMembership(convoId, userId) {
  return ConversationMember.findOne({ where: { conversationId: convoId, userId } });
}

async function loadConversation(id, me) {
  const convo = await Conversation.findByPk(id);
  if (!convo) return null;
  const member = await getMembership(convo.id, me);
  if (!member) return null;
  return { convo, member };
}

async function getMemberIds(convoId) {
  const rows = await ConversationMember.findAll({
    where: { conversationId: convoId },
    attributes: ["userId"],
  });
  return rows.map((r) => r.userId);
}

async function ensureMembers(convoId, entries) {
  for (const e of entries) {
    await ConversationMember.findOrCreate({
      where: { conversationId: convoId, userId: e.userId },
      defaults: { role: e.role || "member" },
    });
  }
}

async function loadMemberCards(convoId) {
  const rows = await ConversationMember.findAll({
    where: { conversationId: convoId },
    include: [{ model: User, as: "user", attributes: CARD }],
    order: [["role", "ASC"], ["createdAt", "ASC"]],
  });
  return rows.map((r) => ({ ...card(r.user), role: r.role, muted: r.muted, lastReadAt: r.lastReadAt }));
}

async function unreadCount(convoId, me, member) {
  const where = { conversationId: convoId, senderId: { [Op.ne]: me } };
  if (member?.lastReadAt) where.createdAt = { [Op.gt]: member.lastReadAt };
  return Message.count({ where });
}

function previewOf(message) {
  if (message.text) return message.text.slice(0, 200);
  if (message.attachmentUrl) {
    const labels = { image: "📷 Изображение", video: "🎬 Видео", audio: "🎵 Аудио", file: "📎 Файл" };
    return labels[message.attachmentType] || "📎 Вложение";
  }
  return "";
}

// =========================
// === СПИСОК ДИАЛОГОВ
// =========================

// GET /api/chat/conversations — список диалогов (direct + group)
router.get("/conversations", auth, async (req, res) => {
  try {
    const me = req.user.id;
    const myMemberships = await ConversationMember.findAll({ where: { userId: me } });
    const myByConvo = new Map(myMemberships.map((m) => [m.conversationId, m]));
    const convoIds = [...myByConvo.keys()];

    if (convoIds.length === 0) return res.json([]);

    const convos = await Conversation.findAll({
      where: { id: { [Op.in]: convoIds } },
      order: [["lastMessageAt", "DESC"]],
    });

    const allMembers = await ConversationMember.findAll({
      where: { conversationId: { [Op.in]: convoIds } },
      include: [{ model: User, as: "user", attributes: CARD }],
    });
    const membersByConvo = new Map();
    for (const m of allMembers) {
      const list = membersByConvo.get(m.conversationId) || [];
      list.push({ ...card(m.user), role: m.role });
      membersByConvo.set(m.conversationId, list);
    }

    const result = [];
    for (const c of convos) {
      const member = myByConvo.get(c.id);
      const members = membersByConvo.get(c.id) || [];
      let peer = null;
      if (c.type === "direct") {
        const otherId = c.userAId === me ? c.userBId : c.userAId;
        peer = members.find((m) => m.id === otherId) || null;
      }
      result.push({
        id: c.id,
        type: c.type,
        title: c.title || null,
        avatarUrl: c.avatarUrl || null,
        user: peer,
        members: c.type === "group" ? members : undefined,
        memberCount: members.length,
        role: member?.role || "member",
        lastMessage: c.lastMessagePreview || "",
        lastMessageAt: c.lastMessageAt,
        unread: await unreadCount(c.id, me, member),
      });
    }

    res.json(result);
  } catch (err) {
    console.error("Ошибка получения диалогов:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /api/chat/conversations — создать/найти личный диалог с другом
router.post("/conversations", auth, async (req, res) => {
  try {
    const me = req.user.id;
    const other = Number(req.body?.userId);
    if (!Number.isInteger(other)) return res.status(400).json({ error: "Неверный userId" });
    if (other === me) return res.status(400).json({ error: "Нельзя открыть чат с собой" });

    if (await isBlockedBetween(me, other)) {
      return res.status(403).json({ error: "Пользователь недоступен" });
    }
    if (!(await areFriends(me, other))) {
      return res.status(403).json({ error: "Чат доступен только между друзьями" });
    }

    const pair = Conversation.ensurePair(me, other);
    let convo = await Conversation.findOne({ where: { ...pair, type: "direct" } });
    if (!convo) convo = await Conversation.create({ ...pair, type: "direct", ownerId: me });
    await ensureMembers(convo.id, [{ userId: pair.userAId }, { userId: pair.userBId }]);

    const otherUser = await User.findByPk(other, { attributes: CARD });
    res.json({ id: convo.id, type: "direct", user: card(otherUser), lastMessage: convo.lastMessagePreview || "", unread: 0 });
  } catch (err) {
    console.error("Ошибка создания диалога:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /api/chat/conversations/group — создать групповой чат
router.post("/conversations/group", auth, async (req, res) => {
  try {
    const me = req.user.id;
    const title = String(req.body?.title || "").trim();
    if (title.length < 1 || title.length > 120) {
      return res.status(400).json({ error: "Название группы: 1–120 символов" });
    }

    const rawIds = Array.isArray(req.body?.memberIds) ? req.body.memberIds : [];
    const memberIds = [...new Set(rawIds.map(Number).filter((n) => Number.isInteger(n) && n !== me))];
    if (memberIds.length === 0) {
      return res.status(400).json({ error: "Добавьте хотя бы одного участника" });
    }

    for (const uid of memberIds) {
      const u = await User.findByPk(uid, { attributes: ["id"] });
      if (!u) return res.status(404).json({ error: `Пользователь ${uid} не найден` });
      if (await isBlockedBetween(me, uid)) {
        return res.status(403).json({ error: "Среди участников есть заблокированный пользователь" });
      }
      if (!(await areFriends(me, uid))) {
        return res.status(403).json({ error: "В группу можно добавлять только друзей" });
      }
    }

    const convo = await Conversation.create({
      type: "group",
      title,
      ownerId: me,
      avatarUrl: req.body?.avatarUrl || null,
      lastMessagePreview: "",
    });
    await ConversationMember.create({ conversationId: convo.id, userId: me, role: "owner", lastReadAt: new Date() });
    await ensureMembers(convo.id, memberIds.map((userId) => ({ userId, role: "member" })));

    // системное сообщение о создании
    const sys = await Message.create({
      conversationId: convo.id,
      senderId: me,
      text: `создал(а) группу «${title}»`,
    });
    convo.lastMessagePreview = previewOf(sys);
    convo.lastMessageAt = new Date();
    await convo.save();

    const io = req.app.get("io");
    if (io) {
      for (const uid of [me, ...memberIds]) {
        io.to(`user_${uid}`).socketsJoin(`conversation_${convo.id}`);
      }
      io.to(`conversation_${convo.id}`).emit("chat:conversation", { conversationId: convo.id });
    }

    const members = await loadMemberCards(convo.id);
    res.status(201).json({
      id: convo.id,
      type: "group",
      title: convo.title,
      avatarUrl: convo.avatarUrl,
      ownerId: convo.ownerId,
      members,
      memberCount: members.length,
    });
  } catch (err) {
    console.error("Ошибка создания группы:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// GET /api/chat/conversations/:id — детали диалога
router.get("/conversations/:id", auth, async (req, res) => {
  try {
    const me = req.user.id;
    const loaded = await loadConversation(Number(req.params.id), me);
    if (!loaded) return res.status(404).json({ error: "Диалог не найден" });
    const { convo, member } = loaded;

    const members = await loadMemberCards(convo.id);
    const peer = convo.type === "direct"
      ? members.find((m) => m.id === (convo.userAId === me ? convo.userBId : convo.userAId)) || null
      : null;

    res.json({
      id: convo.id,
      type: convo.type,
      title: convo.title || null,
      avatarUrl: convo.avatarUrl || null,
      ownerId: convo.ownerId,
      user: peer,
      members,
      memberCount: members.length,
      role: member.role,
    });
  } catch (err) {
    console.error("Ошибка получения диалога:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// PATCH /api/chat/conversations/:id — переименовать группу / аватар
router.patch("/conversations/:id", auth, async (req, res) => {
  try {
    const me = req.user.id;
    const loaded = await loadConversation(Number(req.params.id), me);
    if (!loaded) return res.status(404).json({ error: "Диалог не найден" });
    const { convo, member } = loaded;
    if (convo.type !== "group") return res.status(400).json({ error: "Только для групп" });
    if (member.role !== "owner" && member.role !== "admin") {
      return res.status(403).json({ error: "Недостаточно прав" });
    }

    if (req.body?.title !== undefined) {
      const title = String(req.body.title).trim();
      if (title.length < 1 || title.length > 120) {
        return res.status(400).json({ error: "Название: 1–120 символов" });
      }
      convo.title = title;
    }
    if (req.body?.avatarUrl !== undefined) convo.avatarUrl = req.body.avatarUrl || null;
    await convo.save();

    const io = req.app.get("io");
    if (io) io.to(`conversation_${convo.id}`).emit("chat:conversation-updated", { conversationId: convo.id, title: convo.title, avatarUrl: convo.avatarUrl });

    res.json({ id: convo.id, title: convo.title, avatarUrl: convo.avatarUrl });
  } catch (err) {
    console.error("Ошибка обновления группы:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /api/chat/conversations/:id/members — добавить участников
router.post("/conversations/:id/members", auth, async (req, res) => {
  try {
    const me = req.user.id;
    const loaded = await loadConversation(Number(req.params.id), me);
    if (!loaded) return res.status(404).json({ error: "Диалог не найден" });
    const { convo, member } = loaded;
    if (convo.type !== "group") return res.status(400).json({ error: "Только для групп" });
    if (member.role !== "owner" && member.role !== "admin") {
      return res.status(403).json({ error: "Недостаточно прав" });
    }

    const rawIds = Array.isArray(req.body?.userIds) ? req.body.userIds : [];
    const existing = new Set(await getMemberIds(convo.id));
    const toAdd = [...new Set(rawIds.map(Number).filter((n) => Number.isInteger(n) && !existing.has(n)))];

    const added = [];
    for (const uid of toAdd) {
      const u = await User.findByPk(uid, { attributes: ["id"] });
      if (!u) continue;
      if (await isBlockedBetween(me, uid)) continue;
      if (!(await areFriends(me, uid))) continue;
      await ConversationMember.create({ conversationId: convo.id, userId: uid, role: "member", lastReadAt: new Date() });
      added.push(uid);
    }

    const io = req.app.get("io");
    if (io) {
      for (const uid of added) io.to(`user_${uid}`).socketsJoin(`conversation_${convo.id}`);
      io.to(`conversation_${convo.id}`).emit("chat:conversation", { conversationId: convo.id });
    }

    res.json({ added, members: await loadMemberCards(convo.id) });
  } catch (err) {
    console.error("Ошибка добавления участников:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// DELETE /api/chat/conversations/:id/members/:userId — удалить участника / выйти
router.delete("/conversations/:id/members/:userId", auth, async (req, res) => {
  try {
    const me = req.user.id;
    const loaded = await loadConversation(Number(req.params.id), me);
    if (!loaded) return res.status(404).json({ error: "Диалог не найден" });
    const { convo, member } = loaded;
    if (convo.type !== "group") return res.status(400).json({ error: "Только для групп" });

    const target = Number(req.params.userId);
    const isSelf = target === me;
    if (!isSelf && member.role !== "owner" && member.role !== "admin") {
      return res.status(403).json({ error: "Недостаточно прав" });
    }

    const targetMember = await getMembership(convo.id, target);
    if (!targetMember) return res.status(404).json({ error: "Участник не найден" });
    if (targetMember.role === "owner" && !isSelf) {
      return res.status(400).json({ error: "Нельзя удалить владельца группы" });
    }

    await targetMember.destroy();
    const remaining = await loadMemberCards(convo.id);

    const io = req.app.get("io");

    if (remaining.length === 0) {
      await Message.destroy({ where: { conversationId: convo.id } });
      await ConversationMember.destroy({ where: { conversationId: convo.id } });
      await convo.destroy();
      if (io) io.to(`user_${target}`).emit("chat:conversation", { conversationId: convo.id, removed: true });
      return res.json({ left: true, deleted: true });
    }

    if (targetMember.role === "owner") {
      const next = remaining.find((m) => m.role === "admin") || remaining[0];
      const nm = await getMembership(convo.id, next.id);
      if (nm) {
        nm.role = "owner";
        await nm.save();
      }
      if (io) io.to(`conversation_${convo.id}`).emit("chat:conversation-updated", { conversationId: convo.id });
    }

    if (io) {
      io.to(`user_${target}`).socketsLeave(`conversation_${convo.id}`);
      io.to(`user_${target}`).emit("chat:conversation", { conversationId: convo.id, removed: !isSelf });
      io.to(`conversation_${convo.id}`).emit("chat:conversation", { conversationId: convo.id });
    }

    res.json({ left: isSelf, removed: target, members: remaining });
  } catch (err) {
    console.error("Ошибка выхода/удаления участника:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// =========================
// === СООБЩЕНИЯ
// =========================

// GET /api/chat/conversations/:id/messages — история
router.get("/conversations/:id/messages", auth, async (req, res) => {
  try {
    const me = req.user.id;
    const loaded = await loadConversation(Number(req.params.id), me);
    if (!loaded) return res.status(404).json({ error: "Диалог не найден" });
    const { convo } = loaded;

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 40));
    const where = { conversationId: convo.id };
    if (req.query.before) where.id = { [Op.lt]: Number(req.query.before) };
    if (req.query.q && String(req.query.q).trim()) {
      where.text = { [Op.like]: `%${String(req.query.q).trim()}%` };
    }

    const rows = await Message.findAll({
      where,
      order: [["id", "DESC"]],
      limit,
      include: MESSAGE_INCLUDE,
    });

    let readerMap = [];
    if (convo.type === "group") {
      const members = await ConversationMember.findAll({
        where: { conversationId: convo.id, userId: { [Op.ne]: me } },
        attributes: ["userId", "lastReadAt"],
      });
      readerMap = members.filter((m) => m.lastReadAt);
    }

    const serialized = rows.reverse().map((m) => {
      let readBy;
      if (convo.type === "group") {
        readBy = readerMap.filter((r) => new Date(r.lastReadAt) >= new Date(m.createdAt)).length;
      }
      return serializeMessage(m, me, readBy);
    });

    res.json(serialized);
  } catch (err) {
    console.error("Ошибка получения сообщений:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /api/chat/conversations/:id/messages — отправить сообщение
router.post("/conversations/:id/messages", auth, async (req, res) => {
  try {
    const me = req.user.id;
    const loaded = await loadConversation(Number(req.params.id), me);
    if (!loaded) return res.status(404).json({ error: "Диалог не найден" });
    const { convo } = loaded;

    if (convo.type === "direct") {
      const peerId = convo.userAId === me ? convo.userBId : convo.userAId;
      if (await isBlockedBetween(me, peerId)) {
        return res.status(403).json({ error: "Общение недоступно" });
      }
    }

    const text = String(req.body?.text || "").trim();
    if (text.length > 4000) return res.status(400).json({ error: "Сообщение слишком длинное" });

    const a = req.body?.attachment;
    let attachment = null;
    if (a && a.url) {
      attachment = {
        attachmentUrl: String(a.url).slice(0, 500),
        attachmentType: ["image", "video", "audio", "file"].includes(a.type) ? a.type : "file",
        attachmentName: a.name ? String(a.name).slice(0, 255) : null,
        attachmentMime: a.mime ? String(a.mime).slice(0, 120) : null,
        attachmentSize: Number.isFinite(Number(a.size)) ? Number(a.size) : null,
      };
    }

    if (!text && !attachment) return res.status(400).json({ error: "Пустое сообщение" });

    const replyToId = req.body?.replyToId ? Number(req.body.replyToId) : null;
    let replyTarget = null;
    if (replyToId) {
      replyTarget = await Message.findOne({
        where: { id: replyToId, conversationId: convo.id },
        attributes: ["id", "text", "senderId"],
      });
    }

    const message = await Message.create({
      conversationId: convo.id,
      senderId: me,
      text,
      replyToId: replyTarget ? replyTarget.id : null,
      ...attachment,
    });

    convo.lastMessagePreview = previewOf(message);
    convo.lastMessageAt = new Date();
    await convo.save();

    const messageJson = {
      ...message.toJSON(),
      sender: card(await User.findByPk(me, { attributes: CARD })),
      replyTo: replyTarget ? { id: replyTarget.id, text: replyTarget.text, senderId: replyTarget.senderId } : null,
      reactions: [],
      readBy: convo.type === "group" ? 0 : undefined,
    };

    const io = req.app.get("io");
    if (io) {
      if (convo.type === "direct") {
        const other = convo.userAId === me ? convo.userBId : convo.userAId;
        const otherUser = await User.findByPk(other, { attributes: CARD });
        const base = { id: convo.id, type: "direct", lastMessage: convo.lastMessagePreview, lastMessageAt: convo.lastMessageAt };
        io.to(`user_${other}`).emit("chat:message", { message: messageJson, conversation: { ...base, user: card(messageJson.sender) } });
        io.to(`user_${me}`).emit("chat:message", { message: messageJson, conversation: { ...base, user: card(otherUser) } });
      } else {
        io.to(`conversation_${convo.id}`).emit("chat:message", {
          message: messageJson,
          conversation: { id: convo.id, type: "group", title: convo.title, lastMessage: convo.lastMessagePreview, lastMessageAt: convo.lastMessageAt },
        });
      }
    }

    res.json(messageJson);
  } catch (err) {
    console.error("Ошибка отправки сообщения:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// PATCH /api/chat/messages/:messageId — редактировать своё сообщение
router.patch("/messages/:messageId", auth, async (req, res) => {
  try {
    const me = req.user.id;
    const message = await Message.findByPk(Number(req.params.messageId));
    if (!message) return res.status(404).json({ error: "Сообщение не найдено" });

    const loaded = await loadConversation(message.conversationId, me);
    if (!loaded) return res.status(404).json({ error: "Диалог не найден" });
    if (message.senderId !== me) return res.status(403).json({ error: "Можно редактировать только свои сообщения" });

    const text = String(req.body?.text || "").trim();
    if (text.length > 4000) return res.status(400).json({ error: "Сообщение слишком длинное" });
    if (!text && !message.attachmentUrl) return res.status(400).json({ error: "Пустое сообщение" });

    message.text = text;
    message.editedAt = new Date();
    await message.save();

    const { convo } = loaded;
    if (new Date(convo.lastMessageAt).getTime() <= new Date(message.createdAt).getTime()) {
      convo.lastMessagePreview = previewOf(message);
      await convo.save();
    }

    const io = req.app.get("io");
    if (io) io.to(`conversation_${convo.id}`).emit("chat:message-edited", { conversationId: convo.id, messageId: message.id, text, editedAt: message.editedAt });

    res.json({ id: message.id, text, editedAt: message.editedAt });
  } catch (err) {
    console.error("Ошибка редактирования:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// DELETE /api/chat/messages/:messageId — удалить сообщение
router.delete("/messages/:messageId", auth, async (req, res) => {
  try {
    const me = req.user.id;
    const message = await Message.findByPk(Number(req.params.messageId));
    if (!message) return res.status(404).json({ error: "Сообщение не найдено" });

    const loaded = await loadConversation(message.conversationId, me);
    if (!loaded) return res.status(404).json({ error: "Диалог не найден" });
    const { convo, member } = loaded;

    const canDelete = message.senderId === me || (convo.type === "group" && (member.role === "owner" || member.role === "admin"));
    if (!canDelete) return res.status(403).json({ error: "Недостаточно прав" });

    await MessageReaction.destroy({ where: { messageId: message.id } });
    await message.destroy();

    const io = req.app.get("io");
    if (io) io.to(`conversation_${convo.id}`).emit("chat:message-deleted", { conversationId: convo.id, messageId: message.id });

    res.json({ deleted: true });
  } catch (err) {
    console.error("Ошибка удаления сообщения:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /api/chat/conversations/:id/read — отметить прочитанным
router.post("/conversations/:id/read", auth, async (req, res) => {
  try {
    const me = req.user.id;
    const loaded = await loadConversation(Number(req.params.id), me);
    if (!loaded) return res.status(404).json({ error: "Диалог не найден" });
    const { convo, member } = loaded;

    member.lastReadAt = new Date();
    await member.save();

    // для direct сохраняем и на сообщениях (обратная совместимость)
    if (convo.type === "direct") {
      await Message.update(
        { readAt: member.lastReadAt },
        { where: { conversationId: convo.id, senderId: { [Op.ne]: me }, readAt: null } }
      );
    }

    const io = req.app.get("io");
    if (io) io.to(`conversation_${convo.id}`).emit("chat:read", { conversationId: convo.id, by: me, at: member.lastReadAt });

    res.json({ success: true });
  } catch (err) {
    console.error("Ошибка отметки прочтения:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /api/chat/messages/:messageId/reactions — поставить/снять реакцию
router.post("/messages/:messageId/reactions", auth, async (req, res) => {
  try {
    const me = req.user.id;
    const emoji = String(req.body?.emoji || "").slice(0, 8);
    if (!emoji) return res.status(400).json({ error: "Не указана реакция" });

    const message = await Message.findByPk(Number(req.params.messageId));
    if (!message) return res.status(404).json({ error: "Сообщение не найдено" });

    const loaded = await loadConversation(message.conversationId, me);
    if (!loaded) return res.status(404).json({ error: "Диалог не найден" });
    const { convo } = loaded;

    const existing = await MessageReaction.findOne({ where: { messageId: message.id, userId: me, emoji } });
    if (existing) await existing.destroy();
    else await MessageReaction.create({ messageId: message.id, userId: me, emoji });

    const reactions = await MessageReaction.findAll({
      where: { messageId: message.id },
      attributes: ["id", "userId", "emoji"],
      include: [{ model: User, attributes: ["id", "username"] }],
    });
    const groups = new Map();
    for (const r of reactions) {
      const g = groups.get(r.emoji) || { emoji: r.emoji, count: 0, mine: false, users: [] };
      g.count += 1;
      if (r.userId === me) g.mine = true;
      g.users.push({ id: r.userId, username: r.User?.username || "?" });
      groups.set(r.emoji, g);
    }
    const payload = { messageId: message.id, conversationId: convo.id, reactions: [...groups.values()] };

    const io = req.app.get("io");
    if (io) io.to(`conversation_${convo.id}`).emit("chat:reaction", payload);

    res.json(payload);
  } catch (err) {
    console.error("Ошибка реакции:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;
