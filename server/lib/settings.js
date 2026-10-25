const Setting = require('../models/Setting');

// Настройки сайта с кэшем в памяти. Значение хранится в БД как JSON-строка.
const DEFAULTS = {
  maintenance: { enabled: false },
  signupsOpen: true,
  announcement: { enabled: false, text: '', level: 'info', link: '', updatedAt: null },
  featured: { projectIds: [] },
};

let cache = null;
let cacheAt = 0;
const CACHE_TTL_MS = 5 * 1000;

function parseValue(raw, fallback) {
  if (raw == null) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}

async function loadAll() {
  const rows = await Setting.findAll();
  const map = {};
  for (const row of rows) {
    map[row.key] = parseValue(row.value, DEFAULTS[row.key]);
  }
  return map;
}

async function getAllSettings({ fresh = false } = {}) {
  const now = Date.now();
  if (!fresh && cache && now - cacheAt < CACHE_TTL_MS) return cache;
  let stored = {};
  try {
    stored = await loadAll();
  } catch {
    stored = {};
  }
  cache = { ...DEFAULTS, ...stored };
  cacheAt = now;
  return cache;
}

async function getSetting(key, fallback) {
  const all = await getAllSettings();
  return all[key] !== undefined ? all[key] : fallback !== undefined ? fallback : DEFAULTS[key];
}

async function setSetting(key, value) {
  await Setting.upsert({ key, value: JSON.stringify(value) });
  cache = null;
  cacheAt = 0;
  return value;
}

async function setSettings(patch) {
  const keys = Object.keys(patch);
  for (const key of keys) {
    await Setting.upsert({ key, value: JSON.stringify(patch[key]) });
  }
  cache = null;
  cacheAt = 0;
  return getAllSettings({ fresh: true });
}

async function getPublicSettings() {
  const all = await getAllSettings();
  return {
    maintenance: all.maintenance,
    signupsOpen: all.signupsOpen,
    announcement: all.announcement,
    featured: all.featured,
  };
}

function invalidateCache() {
  cache = null;
  cacheAt = 0;
}

module.exports = {
  DEFAULTS,
  getAllSettings,
  getSetting,
  setSetting,
  setSettings,
  getPublicSettings,
  invalidateCache,
};
