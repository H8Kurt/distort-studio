const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

const auth = require('../middleware/auth');
const { roomSchema, roomUpdateSchema } = require('../lib/validators');
const { Room, RoomMember, RoomMessage, Track, User } = require('../models/associations');
const roomState = require('../lib/roomState');
const { notify } = require('../lib/notify');

const HOST_ATTRS = ['id', 'username', 'avatarUrl', 'frameId'];

function trackToPlayerTrack(track) {
  return {
    id: `lib-${track.id}`,
    trackId: track.id,
    title: track.title,
    artist: track.artist,
    url: track.url,
    thumbUrl: track.thumbUrl,
    duration: track.duration,
    source: 'library',
  };
}

function parseQueue(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseData(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function roomJson(room, extra = {}) {
  const json = typeof room.toJSON === 'function' ? room.toJSON() : { ...room };
  delete json.queue;
  delete json.data;
  if (json.host) {
    json.hostName = json.host.username;
    json.hostAvatar = json.host.avatarUrl;
  }
  if (Array.isArray(json.members)) json.memberCount = json.members.length;
  return { ...json, ...extra };
}

async function loadRoom(id, withMembers = false) {
  return Room.findByPk(id, {
    include: [
      { model: User, as: 'host', attributes: HOST_ATTRS },
      ...(withMembers
        ? [{ model: RoomMember, as: 'members', include: [{ model: User, as: 'user', attributes: HOST_ATTRS }] }]
        : []),
    ],
  });
}

async function isMember(roomId, userId) {
  const count = await RoomMember.count({ where: { roomId, userId } });
  return count > 0;
}

async function canView(room, userId) {
  if (room.isPublic) return true;
  if (room.hostId === userId) return true;
  return isMember(room.id, userId);
}

// ============================
// GET /api/rooms — публичные комнаты
// ============================
router.get('/', auth, async (req, res) => {
  try {
    const { q } = req.query;
    const where = { isPublic: true };
    if (q) where.name = { [Op.like]: `%${q}%` };

    const rooms = await Room.findAll({
      where,
      include: [{ model: User, as: 'host', attributes: HOST_ATTRS }],
      order: [['lastActiveAt', 'DESC']],
      limit: 60,
    });

    const counts = await RoomMember.findAll({
      where: { roomId: rooms.map((r) => r.id) },
      attributes: ['roomId'],
    });
    const countMap = new Map();
    for (const c of counts) countMap.set(c.roomId, (countMap.get(c.roomId) || 0) + 1);

    const userId = req.user.id;
    const myMemberships = await RoomMember.findAll({
      where: { userId, roomId: rooms.map((r) => r.id) },
      attributes: ['roomId'],
    });
    const mine = new Set(myMemberships.map((m) => m.roomId));

    const result = rooms.map((room) =>
      roomJson(room, {
        memberCount: countMap.get(room.id) || 0,
        isMember: mine.has(room.id),
        isHost: room.hostId === userId,
      })
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Не удалось загрузить комнаты' });
  }
});

// ============================
// GET /api/rooms/mine — мои комнаты
// ============================
router.get('/mine', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const memberships = await RoomMember.findAll({
      where: { userId },
      attributes: ['roomId'],
    });
    const ids = memberships.map((m) => m.roomId);
    if (!ids.length) return res.json([]);

    const rooms = await Room.findAll({
      where: { id: ids },
      include: [{ model: User, as: 'host', attributes: HOST_ATTRS }],
      order: [['lastActiveAt', 'DESC']],
    });

    const counts = await RoomMember.findAll({
      where: { roomId: ids },
      attributes: ['roomId'],
    });
    const countMap = new Map();
    for (const c of counts) countMap.set(c.roomId, (countMap.get(c.roomId) || 0) + 1);

    res.json(
      rooms.map((room) =>
        roomJson(room, {
          memberCount: countMap.get(room.id) || 0,
          isMember: true,
          isHost: room.hostId === userId,
        })
      )
    );
  } catch (err) {
    res.status(500).json({ error: 'Не удалось загрузить комнаты' });
  }
});

// ============================
// POST /api/rooms — создать комнату
// ============================
router.post('/', auth, async (req, res) => {
  try {
    const parsed = roomSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Неверные данные' });
    }
    const { name, description, coverUrl, isPublic, mode, trackIds } = parsed.data;
    const roomMode = mode || 'music';

    let queue = [];
    if (roomMode === 'music' && Array.isArray(trackIds) && trackIds.length) {
      const tracks = await Track.findAll({ where: { id: trackIds } });
      const map = new Map(tracks.map((t) => [t.id, t]));
      queue = trackIds
        .map((id) => map.get(id))
        .filter((t) => t && (t.UserId === req.user.id || t.visibility !== 'PRIVATE'))
        .map(trackToPlayerTrack);
    }

    const initialData =
      roomMode === 'board'
        ? JSON.stringify({ columns: roomState.DEFAULT_BOARD_COLUMNS, cards: [] })
        : null;

    const room = await Room.create({
      name,
      description,
      coverUrl,
      isPublic: isPublic !== false,
      mode: roomMode,
      hostId: req.user.id,
      queue: queue.length ? JSON.stringify(queue) : null,
      data: initialData,
      lastActiveAt: new Date(),
    });

    await RoomMember.create({ roomId: room.id, userId: req.user.id, role: 'host' });
    roomState.ensure(room.id, {
      hostId: req.user.id,
      mode: roomMode,
      queue,
      data: initialData ? parseData(initialData) : {},
    });

    const full = await loadRoom(room.id, true);
    res.status(201).json(roomJson(full, { isMember: true, isHost: true, state: roomState.serialize(room.id) }));
  } catch (err) {
    res.status(500).json({ error: 'Не удалось создать комнату' });
  }
});

// ============================
// GET /api/rooms/:id
// ============================
router.get('/:id', auth, async (req, res) => {
  try {
    const room = await loadRoom(req.params.id, true);
    if (!room) return res.status(404).json({ error: 'Комната не найдена' });
    if (!(await canView(room, req.user.id))) {
      return res.status(403).json({ error: 'Комната закрыта' });
    }

    let state = roomState.get(room.id);
    if (!state) {
      state = roomState.ensure(room.id, {
        hostId: room.hostId,
        mode: room.mode,
        queue: parseQueue(room.queue),
        data: parseData(room.data),
      });
    }

    res.json(
      roomJson(room, {
        isMember: room.hostId === req.user.id || (await isMember(room.id, req.user.id)),
        isHost: room.hostId === req.user.id,
        state: roomState.serialize(room.id),
      })
    );
  } catch (err) {
    res.status(500).json({ error: 'Не удалось загрузить комнату' });
  }
});

// ============================
// PATCH /api/rooms/:id — редактирование (хост)
// ============================
router.patch('/:id', auth, async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ error: 'Комната не найдена' });
    if (room.hostId !== req.user.id) {
      return res.status(403).json({ error: 'Только хост может редактировать' });
    }
    const parsed = roomUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Неверные данные' });
    }
    const { name, description, coverUrl, isPublic } = parsed.data;
    await room.update({ name, description, coverUrl, isPublic });
    const full = await loadRoom(room.id, true);

    const io = req.app.get('io');
    if (io) io.to(`room_${room.id}`).emit('room:meta', roomJson(full));
    res.json(roomJson(full, { isHost: true, isMember: true }));
  } catch (err) {
    res.status(500).json({ error: 'Не удалось обновить комнату' });
  }
});

// ============================
// DELETE /api/rooms/:id — удаление (хост)
// ============================
router.delete('/:id', auth, async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ error: 'Комната не найдена' });
    if (room.hostId !== req.user.id) {
      return res.status(403).json({ error: 'Только хост может удалить' });
    }
    const io = req.app.get('io');
    if (io) io.to(`room_${room.id}`).emit('room:closed', { roomId: room.id });
    roomState.remove(room.id);
    await RoomMessage.destroy({ where: { roomId: room.id } });
    await RoomMember.destroy({ where: { roomId: room.id } });
    await room.destroy();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Не удалось удалить комнату' });
  }
});

// ============================
// POST /api/rooms/:id/join
// ============================
router.post('/:id/join', auth, async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ error: 'Комната не найдена' });

    const member = await isMember(room.id, req.user.id);
    if (!room.isPublic && room.hostId !== req.user.id && !member) {
      return res.status(403).json({ error: 'Комната закрыта — нужен инвайт' });
    }

    if (!member) {
      await RoomMember.create({ roomId: room.id, userId: req.user.id, role: 'member' });
    }
    await room.update({ lastActiveAt: new Date() });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${req.user.id}`).socketsJoin(`room_${room.id}`);
      io.to(`room_${room.id}`).emit('room:members-changed', { roomId: room.id });
    }

    const full = await loadRoom(room.id, true);
    res.json(roomJson(full, { isMember: true, isHost: room.hostId === req.user.id }));
  } catch (err) {
    res.status(500).json({ error: 'Не удалось войти в комнату' });
  }
});

// ============================
// POST /api/rooms/:id/leave
// ============================
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ error: 'Комната не найдена' });
    if (room.hostId === req.user.id) {
      return res.status(400).json({ error: 'Хост не может выйти — удалите комнату' });
    }
    await RoomMember.destroy({ where: { roomId: room.id, userId: req.user.id } });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${req.user.id}`).socketsLeave(`room_${room.id}`);
      io.to(`room_${room.id}`).emit('room:members-changed', { roomId: room.id });
    }
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Не удалось выйти из комнаты' });
  }
});

// ============================
// POST /api/rooms/:id/invite — пригласить (хост)
// ============================
router.post('/:id/invite', auth, async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ error: 'Комната не найдена' });
    if (room.hostId !== req.user.id) {
      return res.status(403).json({ error: 'Только хост может приглашать' });
    }
    const userId = Number(req.body?.userId);
    if (!Number.isInteger(userId)) return res.status(400).json({ error: 'Неверный пользователь' });

    const target = await User.findByPk(userId, { attributes: HOST_ATTRS });
    if (!target) return res.status(404).json({ error: 'Пользователь не найден' });

    if (!(await isMember(room.id, userId))) {
      await RoomMember.create({ roomId: room.id, userId, role: 'member' });
    }
    await notify(req.app, {
      userId,
      actorId: req.user.id,
      type: 'room_invite',
      message: `приглашает вас в комнату «${room.name}»`,
    });
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('room:invited', { roomId: room.id, name: room.name });
    }
    res.json({ ok: true, member: { id: target.id, username: target.username, avatarUrl: target.avatarUrl } });
  } catch (err) {
    res.status(500).json({ error: 'Не удалось пригласить' });
  }
});

// ============================
// GET /api/rooms/:id/messages
// ============================
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ error: 'Комната не найдена' });
    if (!(await canView(room, req.user.id))) {
      return res.status(403).json({ error: 'Комната закрыта' });
    }

    const messages = await RoomMessage.findAll({
      where: { roomId: room.id, type: 'text' },
      include: [{ model: User, as: 'author', attributes: HOST_ATTRS }],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ error: 'Не удалось загрузить сообщения' });
  }
});

module.exports = router;
