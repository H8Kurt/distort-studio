/**
 * Хранилище состояния комнат.
 *
 * Живёт в памяти процесса: «горячее» состояние эфемерно (кто что слушает,
 * смотрит или рисует прямо сейчас), а сами комнаты, чат и слепки режимов
 * (канбан, картинка рисования, id видео) персистятся в БД (Room.data).
 *
 * Позиция воспроизведения (музыка/видео) хранится как basePosition (секунды)
 * + baseAt (метка времени сервера), чтобы клиенты сами досчитывали текущее
 * время и меньше страдали от сетевых задержек.
 */

const rooms = new Map();

const DEFAULT_BOARD_COLUMNS = [
  { id: 'ideas', title: 'Идеи' },
  { id: 'doing', title: 'В работе' },
  { id: 'done', title: 'Готово' },
];

function now() {
  return Date.now();
}

function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function clampStr(v, max) {
  if (typeof v !== 'string') return '';
  const s = v.trim();
  return s.length > max ? s.slice(0, max) : s;
}

// ============================
// Музыка (обратная совместимость)
// ============================

function computePosition(state) {
  if (!state) return 0;
  if (state.playing) {
    return state.basePosition + (now() - state.baseAt) / 1000;
  }
  return state.basePosition;
}

// ============================
// Видео (YouTube)
// ============================

function computeWatchPosition(state) {
  if (!state || !state.watch) return 0;
  const w = state.watch;
  if (w.playing) return w.basePosition + (now() - w.baseAt) / 1000;
  return w.basePosition;
}

// ============================
// Инициализация
// ============================

function parseData(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function ensure(roomId, init = {}) {
  const id = Number(roomId);
  if (rooms.has(id)) return rooms.get(id);

  const mode = ['music', 'watch', 'board', 'draw'].includes(init.mode) ? init.mode : 'music';
  const data = parseData(init.data);

  const state = {
    roomId: id,
    mode,
    hostId: init.hostId ?? null,
    updatedAt: now(),
    // music
    queue: Array.isArray(init.queue) ? init.queue : [],
    index: init.index ?? 0,
    playing: false,
    basePosition: 0,
    baseAt: now(),
    // watch
    watch: {
      videoId: typeof data.videoId === 'string' ? data.videoId : null,
      playing: false,
      basePosition: Number(data.position) || 0,
      baseAt: now(),
    },
    // board
    board: {
      columns: Array.isArray(data.columns) && data.columns.length
        ? data.columns.map((c) => ({ id: String(c.id), title: clampStr(c.title, 80) || 'Колонка' }))
        : DEFAULT_BOARD_COLUMNS.map((c) => ({ ...c })),
      cards: Array.isArray(data.cards)
        ? data.cards.map((c) => ({
            id: String(c.id),
            columnId: String(c.columnId),
            text: clampStr(c.text, 500),
            authorId: Number(c.authorId) || 0,
            authorName: clampStr(c.authorName, 60),
            color: clampStr(c.color, 20),
            createdAt: Number(c.createdAt) || now(),
          }))
        : [],
    },
    // draw
    draw: {
      image: typeof data.image === 'string' ? data.image : null,
      lockHolderId: null,
      lockHolderName: null,
      updatedAt: now(),
    },
  };

  rooms.set(id, state);
  return state;
}

function get(roomId) {
  return rooms.get(Number(roomId)) || null;
}

function remove(roomId) {
  rooms.delete(Number(roomId));
}

function touch(state) {
  state.updatedAt = now();
  return state;
}

function setMode(roomId, mode) {
  const state = get(roomId);
  if (!state) return null;
  if (['music', 'watch', 'board', 'draw'].includes(mode)) state.mode = mode;
  return touch(state);
}

// ============================
// Музыка: операции
// ============================

function setQueue(roomId, queue, index = 0) {
  const state = get(roomId);
  if (!state) return null;
  state.queue = Array.isArray(queue) ? queue : [];
  state.index = Math.min(Math.max(0, index), Math.max(0, state.queue.length - 1));
  state.basePosition = 0;
  state.baseAt = now();
  return touch(state);
}

function play(roomId, position) {
  const state = get(roomId);
  if (!state) return null;
  state.basePosition = Number.isFinite(position) ? Math.max(0, position) : computePosition(state);
  state.baseAt = now();
  state.playing = true;
  return touch(state);
}

function pause(roomId) {
  const state = get(roomId);
  if (!state) return null;
  state.basePosition = computePosition(state);
  state.playing = false;
  return touch(state);
}

function seek(roomId, position) {
  const state = get(roomId);
  if (!state) return null;
  state.basePosition = Math.max(0, Number(position) || 0);
  state.baseAt = now();
  return touch(state);
}

function setIndex(roomId, index) {
  const state = get(roomId);
  if (!state) return null;
  if (!state.queue.length) return state;
  const i = Number.isInteger(index) ? index : 0;
  state.index = ((i % state.queue.length) + state.queue.length) % state.queue.length;
  state.basePosition = 0;
  state.baseAt = now();
  return touch(state);
}

function applyControl(roomId, action = {}) {
  const state = get(roomId);
  if (!state) return null;
  switch (action.type) {
    case 'play':
      return play(roomId, action.position);
    case 'pause':
      return pause(roomId);
    case 'seek':
      return seek(roomId, action.position);
    case 'next':
      return setIndex(roomId, state.index + 1);
    case 'prev':
      return setIndex(roomId, state.index - 1);
    case 'index':
      return setIndex(roomId, action.index);
    case 'queue':
      return setQueue(roomId, action.queue, action.index ?? 0);
    default:
      return state;
  }
}

// ============================
// Видео: операции
// ============================

function watchLoad(roomId, videoId) {
  const state = get(roomId);
  if (!state) return null;
  const id = clampStr(videoId, 32).replace(/[^a-zA-Z0-9_-]/g, '');
  state.watch.videoId = id || null;
  state.watch.basePosition = 0;
  state.watch.baseAt = now();
  state.watch.playing = false;
  return touch(state);
}

function watchPlay(roomId, position) {
  const state = get(roomId);
  if (!state || !state.watch.videoId) return state;
  state.watch.basePosition = Number.isFinite(position)
    ? Math.max(0, position)
    : computeWatchPosition(state);
  state.watch.baseAt = now();
  state.watch.playing = true;
  return touch(state);
}

function watchPause(roomId) {
  const state = get(roomId);
  if (!state) return null;
  state.watch.basePosition = computeWatchPosition(state);
  state.watch.playing = false;
  return touch(state);
}

function watchSeek(roomId, position) {
  const state = get(roomId);
  if (!state) return null;
  state.watch.basePosition = Math.max(0, Number(position) || 0);
  state.watch.baseAt = now();
  return touch(state);
}

function applyWatch(roomId, action = {}) {
  const state = get(roomId);
  if (!state) return null;
  switch (action.type) {
    case 'load':
      return watchLoad(roomId, action.videoId);
    case 'play':
      return watchPlay(roomId, action.position);
    case 'pause':
      return watchPause(roomId);
    case 'seek':
      return watchSeek(roomId, action.position);
    default:
      return state;
  }
}

// ============================
// Канбан: операции
// ============================

function boardAddColumn(roomId, title) {
  const state = get(roomId);
  if (!state) return null;
  if (state.board.columns.length >= 12) return state;
  state.board.columns.push({ id: genId('col'), title: clampStr(title, 80) || 'Колонка' });
  return touch(state);
}

function boardRenameColumn(roomId, columnId, title) {
  const state = get(roomId);
  if (!state) return null;
  const col = state.board.columns.find((c) => c.id === String(columnId));
  if (col) col.title = clampStr(title, 80) || col.title;
  return touch(state);
}

function boardDelColumn(roomId, columnId) {
  const state = get(roomId);
  if (!state) return null;
  const id = String(columnId);
  state.board.columns = state.board.columns.filter((c) => c.id !== id);
  state.board.cards = state.board.cards.filter((c) => c.columnId !== id);
  return touch(state);
}

function boardAddCard(roomId, { columnId, text, authorId, authorName, color } = {}) {
  const state = get(roomId);
  if (!state) return null;
  const col = state.board.columns.find((c) => c.id === String(columnId));
  if (!col) return state;
  if (state.board.cards.length >= 500) return state;
  const clean = clampStr(text, 500);
  if (!clean) return state;
  state.board.cards.push({
    id: genId('card'),
    columnId: col.id,
    text: clean,
    authorId: Number(authorId) || 0,
    authorName: clampStr(authorName, 60),
    color: clampStr(color, 20),
    createdAt: now(),
  });
  return touch(state);
}

function boardEditCard(roomId, cardId, text) {
  const state = get(roomId);
  if (!state) return null;
  const card = state.board.cards.find((c) => c.id === String(cardId));
  if (card) card.text = clampStr(text, 500) || card.text;
  return touch(state);
}

function boardMoveCard(roomId, cardId, columnId, index) {
  const state = get(roomId);
  if (!state) return null;
  const card = state.board.cards.find((c) => c.id === String(cardId));
  const col = state.board.columns.find((c) => c.id === String(columnId));
  if (!card || !col) return state;
  card.columnId = col.id;
  if (Number.isInteger(index)) {
    const others = state.board.cards.filter((c) => c.id !== card.id);
    const insertAt = Math.min(Math.max(0, index), others.length);
    others.splice(insertAt, 0, card);
    state.board.cards = others;
  }
  return touch(state);
}

function boardDelCard(roomId, cardId) {
  const state = get(roomId);
  if (!state) return null;
  state.board.cards = state.board.cards.filter((c) => c.id !== String(cardId));
  return touch(state);
}

function applyBoard(roomId, op, payload = {}, actor = {}) {
  switch (op) {
    case 'addColumn':
      return boardAddColumn(roomId, payload.title);
    case 'renameColumn':
      return boardRenameColumn(roomId, payload.columnId, payload.title);
    case 'delColumn':
      return boardDelColumn(roomId, payload.columnId);
    case 'addCard':
      return boardAddCard(roomId, {
        columnId: payload.columnId,
        text: payload.text,
        color: payload.color,
        authorId: actor.userId,
        authorName: actor.username,
      });
    case 'editCard':
      return boardEditCard(roomId, payload.cardId, payload.text);
    case 'moveCard':
      return boardMoveCard(roomId, payload.cardId, payload.columnId, payload.index);
    case 'delCard':
      return boardDelCard(roomId, payload.cardId);
    default:
      return get(roomId);
  }
}

// ============================
// Рисование: операции
// ============================

function drawSetLock(roomId, userId, username) {
  const state = get(roomId);
  if (!state) return null;
  // Захватить может любой, если карандаш свободен или уже у него
  if (state.draw.lockHolderId != null && state.draw.lockHolderId !== userId) {
    return state;
  }
  state.draw.lockHolderId = userId;
  state.draw.lockHolderName = clampStr(username, 60);
  return touch(state);
}

function drawRelease(roomId, userId) {
  const state = get(roomId);
  if (!state) return null;
  if (state.draw.lockHolderId === userId || userId == null) {
    state.draw.lockHolderId = null;
    state.draw.lockHolderName = null;
  }
  return touch(state);
}

function drawCommit(roomId, userId, image) {
  const state = get(roomId);
  if (!state) return null;
  if (state.draw.lockHolderId != null && state.draw.lockHolderId !== userId) return state;
  if (typeof image !== 'string' || !image.startsWith('data:image/')) return state;
  // Ограничим размер (≈6 МБ в base64), чтобы не раздувать БД и сокет
  if (image.length > 8_000_000) return state;
  state.draw.image = image;
  state.draw.updatedAt = now();
  return touch(state);
}

// ============================
// Сериализация и персист
// ============================

function serialize(roomId) {
  const state = get(roomId);
  if (!state) return null;
  return {
    roomId: Number(roomId),
    mode: state.mode,
    hostId: state.hostId,
    // музыка
    queue: state.queue,
    index: state.index,
    playing: state.playing,
    position: computePosition(state),
    // видео
    watch: {
      videoId: state.watch.videoId,
      playing: state.watch.playing,
      position: computeWatchPosition(state),
      baseAt: state.watch.baseAt,
    },
    // канбан
    board: {
      columns: state.board.columns,
      cards: state.board.cards,
    },
    // рисование
    draw: {
      image: state.draw.image,
      lockHolderId: state.draw.lockHolderId,
      lockHolderName: state.draw.lockHolderName,
      updatedAt: state.draw.updatedAt,
    },
    serverTime: now(),
    updatedAt: state.updatedAt,
  };
}

/** Данные для персиста в Room.data (без эфемерных полей). */
function persistData(roomId) {
  const state = get(roomId);
  if (!state) return null;
  if (state.mode === 'board') {
    return { columns: state.board.columns, cards: state.board.cards };
  }
  if (state.mode === 'draw') {
    return { image: state.draw.image };
  }
  if (state.mode === 'watch') {
    return { videoId: state.watch.videoId, position: state.watch.basePosition };
  }
  return null;
}

module.exports = {
  ensure,
  get,
  remove,
  setMode,
  setQueue,
  play,
  pause,
  seek,
  setIndex,
  applyControl,
  applyWatch,
  applyBoard,
  drawSetLock,
  drawRelease,
  drawCommit,
  computePosition,
  computeWatchPosition,
  serialize,
  persistData,
  DEFAULT_BOARD_COLUMNS,
  _rooms: rooms,
};
