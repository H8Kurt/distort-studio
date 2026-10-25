require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const sequelize = require("./db");
const { logger } = require("./lib/logger");
const { verifyAccessToken } = require("./lib/auth");
const {
  User,
  Conversation,
  ConversationMember,
  Room,
  RoomMember,
  RoomMessage,
} = require("./models/associations");
const roomState = require("./lib/roomState");
const { ensureOfficialAccount } = require("./lib/official");

const server = http.createServer(app);
const onlineCounts = new Map();

// Присутствие в комнатах: roomId -> Map<socketId, { userId, username, avatarUrl }>
const roomPresence = new Map();

function parseRoomQueue(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseRoomData(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

// Сохраняем слепок режима (канбан/рисование/видео) в Room.data
function persistRoomData(roomId) {
  const data = roomState.persistData(roomId);
  if (data == null) return;
  Room.update({ data: JSON.stringify(data) }, { where: { id: roomId } }).catch(() => {});
}

function uniqueRoomMembers(roomId) {
  const map = roomPresence.get(roomId);
  if (!map) return [];
  const byUser = new Map();
  for (const info of map.values()) byUser.set(info.userId, info);
  return [...byUser.values()];
}

function addPresence(roomId, socketId, info) {
  if (!roomPresence.has(roomId)) roomPresence.set(roomId, new Map());
  roomPresence.get(roomId).set(socketId, info);
}

function removePresence(roomId, socketId) {
  const map = roomPresence.get(roomId);
  if (!map) return;
  map.delete(socketId);
  if (map.size === 0) roomPresence.delete(roomId);
}

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : true;

const io = new Server(server, {
  // Холсты рисования могут быть крупными (base64 PNG) — поднимаем лимит буфера
  maxHttpBufferSize: 1e7,
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// === Аутентификация Socket.IO ===
io.use(async (socket, next) => {
  const token =
    socket.handshake.auth?.token || socket.handshake.query?.token || null;

  if (!token) {
    return next(new Error("Unauthorized: no token"));
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return next(new Error("Unauthorized: invalid token"));
  }

  try {
    const account = await User.findByPk(decoded.id, {
      attributes: ["id", "status", "username", "avatarUrl"],
    });
    if (!account || account.status !== "active") {
      return next(new Error("Account inactive"));
    }
    decoded.username = account.username;
    decoded.avatarUrl = account.avatarUrl;
  } catch (err) {
    return next(new Error("Auth check failed"));
  }

  socket.user = decoded;
  next();
});

// Даём доступ к io из роутов
app.set("io", io);

io.on("connection", (socket) => {
  logger.info(
    { userId: socket.user?.id, socketId: socket.id },
    "Socket connected"
  );

  if (socket.user?.id) {
    socket.join(`user_${socket.user.id}`);
    socket.data.userId = socket.user.id;
    // Присоединяем сокет к комнатам всех диалогов пользователя
    const uid = socket.user.id;
    ConversationMember.findAll({ where: { userId: uid }, attributes: ["conversationId"] })
      .then((rows) => rows.forEach((r) => socket.join(`conversation_${r.conversationId}`)))
      .catch(() => {});
  }

  socket.on("join-project", (projectId) => {
    socket.join(`project_${projectId}`);
    logger.debug({ projectId, socketId: socket.id }, "Joined project room");
  });

  const userId = socket.data.userId;
  if (userId) {
    // Индикатор "печатает…" — пересылаем адресату
    socket.on("chat:typing", ({ to, conversationId, typing } = {}) => {
      const target = Number(to);
      if (Number.isInteger(target)) {
        io.to(`user_${target}`).emit("chat:typing", {
          from: userId,
          conversationId,
          typing: !!typing,
        });
        return;
      }
      if (conversationId) {
        socket.to(`conversation_${conversationId}`).emit("chat:typing", {
          from: userId,
          conversationId,
          typing: !!typing,
        });
      }
    });

    // Онлайн-присутствие
    onlineCounts.set(userId, (onlineCounts.get(userId) || 0) + 1);
    User.update({ lastSeenAt: new Date() }, { where: { id: userId } }).catch(() => {});
    io.emit("presence", { userId, online: true });

    // === Комнаты совместного прослушивания ===
    const presenceInfo = () => ({
      userId,
      username: socket.user.username,
      avatarUrl: socket.user.avatarUrl,
    });

    socket.on("room:join", async ({ roomId } = {}) => {
      const id = Number(roomId);
      if (!Number.isInteger(id)) return;
      try {
        const room = await Room.findByPk(id);
        if (!room) return;
        let member = await RoomMember.count({ where: { roomId: id, userId } });
        if (!room.isPublic && room.hostId !== userId && !member) return;
        if (!member && room.hostId !== userId) {
          await RoomMember.create({ roomId: id, userId, role: "member" });
          member = 1;
        }
        socket.join(`room_${id}`);
        addPresence(id, socket.id, presenceInfo());
        io.to(`room_${id}`).emit("room:presence", { roomId: id, members: uniqueRoomMembers(id) });

        let state = roomState.get(id);
        if (!state) {
          state = roomState.ensure(id, {
            hostId: room.hostId,
            mode: room.mode,
            queue: parseRoomQueue(room.queue),
            data: parseRoomData(room.data),
          });
        }
        socket.emit("room:state", roomState.serialize(id));
      } catch (err) {
        logger.error({ err, roomId: id }, "room:join failed");
      }
    });

    socket.on("room:leave", ({ roomId } = {}) => {
      const id = Number(roomId);
      if (!Number.isInteger(id)) return;
      socket.leave(`room_${id}`);
      removePresence(id, socket.id);
      io.to(`room_${id}`).emit("room:presence", { roomId: id, members: uniqueRoomMembers(id) });
    });

    socket.on("room:control", ({ roomId, ...action } = {}) => {
      const id = Number(roomId);
      if (!Number.isInteger(id)) return;
      const state = roomState.get(id);
      if (!state || state.hostId !== userId || state.mode !== "music") return; // управляет только хост
      roomState.applyControl(id, action);
      io.to(`room_${id}`).emit("room:state", roomState.serialize(id));
    });

    // Совместный просмотр YouTube — управляет хост
    socket.on("room:watch", ({ roomId, ...action } = {}) => {
      const id = Number(roomId);
      if (!Number.isInteger(id)) return;
      const state = roomState.get(id);
      if (!state || state.hostId !== userId || state.mode !== "watch") return;
      roomState.applyWatch(id, action);
      persistRoomData(id);
      io.to(`room_${id}`).emit("room:state", roomState.serialize(id));
    });

    // Канбан — редактирует любой участник
    socket.on("room:board", ({ roomId, op, ...payload } = {}) => {
      const id = Number(roomId);
      if (!Number.isInteger(id) || typeof op !== "string") return;
      const state = roomState.get(id);
      if (!state || state.mode !== "board") return;
      roomState.applyBoard(id, op, payload, { userId, username: socket.user.username });
      persistRoomData(id);
      io.to(`room_${id}`).emit("room:state", roomState.serialize(id));
    });

    // Рисование: «карандаш» (только один рисует за раз) — захват/освобождение
    socket.on("room:draw:lock", ({ roomId, release } = {}) => {
      const id = Number(roomId);
      if (!Number.isInteger(id)) return;
      const state = roomState.get(id);
      if (!state || state.mode !== "draw") return;
      if (release) roomState.drawRelease(id, userId);
      else roomState.drawSetLock(id, userId, socket.user.username);
      io.to(`room_${id}`).emit("room:state", roomState.serialize(id));
    });

    // Рисование: держатель «карандаша» публикует новый холст
    socket.on("room:draw:commit", ({ roomId, image } = {}) => {
      const id = Number(roomId);
      if (!Number.isInteger(id)) return;
      const state = roomState.get(id);
      if (!state || state.mode !== "draw") return;
      roomState.drawCommit(id, userId, image);
      persistRoomData(id);
      io.to(`room_${id}`).emit("room:state", roomState.serialize(id));
    });

    socket.on("room:reaction", ({ roomId, emoji } = {}) => {
      const id = Number(roomId);
      const clean = typeof emoji === "string" ? emoji.slice(0, 8) : "";
      if (!Number.isInteger(id) || !clean) return;
      io.to(`room_${id}`).emit("room:reaction", {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        userId,
        username: socket.user.username,
        emoji: clean,
        at: Date.now(),
      });
    });

    socket.on("room:chat", async ({ roomId, text } = {}) => {
      const id = Number(roomId);
      const clean = typeof text === "string" ? text.trim().slice(0, 1000) : "";
      if (!Number.isInteger(id) || !clean) return;
      try {
        const msg = await RoomMessage.create({ roomId: id, userId, text: clean, type: "text" });
        io.to(`room_${id}`).emit("room:chat", {
          id: msg.id,
          roomId: id,
          text: clean,
          userId,
          author: {
            id: userId,
            username: socket.user.username,
            avatarUrl: socket.user.avatarUrl,
          },
          createdAt: msg.createdAt,
        });
      } catch (err) {
        logger.error({ err, roomId: id }, "room:chat failed");
      }
    });

    socket.on("room:cursor", ({ roomId, x, y } = {}) => {
      const id = Number(roomId);
      if (!Number.isInteger(id) || !Number.isFinite(x) || !Number.isFinite(y)) return;
      socket.to(`room_${id}`).emit("room:cursor", {
        userId,
        username: socket.user.username,
        x,
        y,
        at: Date.now(),
      });
    });
  }

  socket.on("disconnect", () => {
    logger.debug({ socketId: socket.id }, "Socket disconnected");
    const uid = socket.data.userId;

    // Чистим присутствие в комнатах
    for (const roomId of [...roomPresence.keys()]) {
      const map = roomPresence.get(roomId);
      if (map && map.has(socket.id)) {
        removePresence(roomId, socket.id);
        io.to(`room_${roomId}`).emit("room:presence", { roomId, members: uniqueRoomMembers(roomId) });
      }
    }

    if (!uid) return;

    // Освобождаем «карандаш» в комнатах рисования
    for (const [roomId, state] of roomState._rooms) {
      if (state.draw && state.draw.lockHolderId === uid) {
        roomState.drawRelease(roomId, uid);
        io.to(`room_${roomId}`).emit("room:state", roomState.serialize(roomId));
      }
    }

    const left = (onlineCounts.get(uid) || 1) - 1;
    if (left > 0) {
      onlineCounts.set(uid, left);
      return;
    }
    onlineCounts.delete(uid);
    const lastSeenAt = new Date();
    User.update({ lastSeenAt }, { where: { id: uid } }).catch(() => {});
    io.emit("presence", { userId: uid, online: false, lastSeenAt });
  });
});

const syncOptions = process.env.DB_SYNC_ALTER === "true" ? { alter: true } : {};
const PORT = process.env.PORT || 4000;

// Бэкфилл участников для существующих диалогов 1:1 без ConversationMember
async function backfillConversationMembers() {
  try {
    const convos = await Conversation.findAll({ where: { type: "direct" } });
    for (const c of convos) {
      if (!c.userAId || !c.userBId) continue;
      const count = await ConversationMember.count({ where: { conversationId: c.id } });
      if (count > 0) continue;
      const seen = c.lastMessageAt || new Date();
      await ConversationMember.bulkCreate([
        { conversationId: c.id, userId: c.userAId, role: "member", lastReadAt: seen },
        { conversationId: c.id, userId: c.userBId, role: "member", lastReadAt: seen },
      ]);
    }
  } catch (err) {
    logger.error({ err }, "Conversation members backfill failed");
  }
}

sequelize
  .sync(syncOptions)
  .then(async () => {
    logger.info("DB synced");
    await backfillConversationMembers();
    await ensureOfficialAccount();
  })
  .catch((err) => logger.error({ err }, "DB sync failed"));

server.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
});
