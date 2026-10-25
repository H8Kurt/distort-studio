const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const RENDERER_URL =
  process.env.RENDERER_URL ||
  process.env.VITE_DEV_SERVER_URL ||
  'http://localhost:5173';

const API_URL = process.env.VITE_API_URL || 'http://localhost:4000';

let mainWindow;

// ============================
// ОФФЛАЙН-ОЧЕРЕДЬ СЕССИЙ
// ============================
let offlineQueue = [];

function queueFile() {
  return path.join(app.getPath('userData'), 'offline-sessions.json');
}

function loadQueue() {
  try {
    const raw = fs.readFileSync(queueFile(), 'utf8');
    const parsed = JSON.parse(raw);
    offlineQueue = Array.isArray(parsed) ? parsed : [];
  } catch {
    offlineQueue = [];
  }
}

function saveQueue() {
  try {
    fs.writeFileSync(queueFile(), JSON.stringify(offlineQueue, null, 2), 'utf8');
  } catch (err) {
    console.error('Не удалось сохранить оффлайн-очередь:', err.message);
  }
}

function broadcastQueue() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('offline-queue-changed', offlineQueue);
  }
}

// ============================
// ОКНО
// ============================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(RENDERER_URL);

  // Открываем DevTools в разработке
  // mainWindow.webContents.openDevTools();
}

// ============================
// КОНФИГ
// ============================
ipcMain.handle('get-config', () => ({
  apiUrl: API_URL,
  rendererUrl: RENDERER_URL,
  platform: process.platform,
  isElectron: true,
}));

// ============================
// ЗАПУСК ВНЕШНЕГО ПРИЛОЖЕНИЯ (безопасный)
// ============================
function validateAppPath(appPath) {
  if (typeof appPath !== 'string' || !appPath.trim()) {
    return 'Путь к приложению не указан';
  }
  if (appPath.includes('\0')) return 'Недопустимый путь';
  if (!fs.existsSync(appPath)) return 'Файл не найден';
  let stat;
  try {
    stat = fs.statSync(appPath);
  } catch {
    return 'Не удалось прочитать файл';
  }
  if (!stat.isFile()) return 'Путь не является файлом';

  if (process.platform !== 'win32') {
    try {
      fs.accessSync(appPath, fs.constants.X_OK);
    } catch {
      return 'Файл не является исполняемым';
    }
  }
  return null;
}

const launchedApps = new Map();

ipcMain.handle('launch-app', async (event, appPath, args = [], launchId = null) => {
  try {
    const invalid = validateAppPath(appPath);
    if (invalid) return { ok: false, error: invalid };

    const safeArgs = Array.isArray(args) ? args.filter((a) => typeof a === 'string') : [];

    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Отмена', 'Запустить'],
      defaultId: 1,
      cancelId: 0,
      title: 'Запуск приложения',
      message: 'Запустить внешнее приложение?',
      detail: `${path.basename(appPath)}\n${appPath}${safeArgs.length ? '\n' + safeArgs.join(' ') : ''}`,
    });
    if (response !== 1) return { ok: false, canceled: true };

    const child = spawn(appPath, safeArgs, {
      detached: true,
      stdio: 'ignore',
      shell: false,
    });
    child.unref();

    if (launchId && typeof launchId === 'string') {
      launchedApps.set(launchId, child);
      child.on('exit', (code, signal) => {
        launchedApps.delete(launchId);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('app-exited', { launchId, code, signal });
        }
      });
    }

    return { ok: true, launchId };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Выбор исполняемого файла через нативный диалог
ipcMain.handle('pick-app', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите исполняемый файл приложения',
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

// Выбор папки (для автоимпорта)
ipcMain.handle('pick-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите папку для автоимпорта',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

// ============================
// ОФФЛАЙН-ОЧЕРЕДЬ — IPC
// ============================
ipcMain.handle('offline-get-queue', () => offlineQueue);

ipcMain.handle('offline-enqueue', (event, item) => {
  if (!item || !item.clientId) return offlineQueue;
  const idx = offlineQueue.findIndex((x) => x.clientId === item.clientId);
  if (idx >= 0) {
    offlineQueue[idx] = { ...offlineQueue[idx], ...item };
  } else {
    offlineQueue.push(item);
  }
  saveQueue();
  broadcastQueue();
  return offlineQueue;
});

ipcMain.handle('offline-replace', (event, items) => {
  offlineQueue = Array.isArray(items) ? items : [];
  saveQueue();
  broadcastQueue();
  return offlineQueue;
});

ipcMain.handle('offline-remove', (event, clientId) => {
  offlineQueue = offlineQueue.filter((x) => x.clientId !== clientId);
  saveQueue();
  broadcastQueue();
  return offlineQueue;
});

ipcMain.handle('offline-clear', () => {
  offlineQueue = [];
  saveQueue();
  broadcastQueue();
  return offlineQueue;
});

// ============================
// API-КОНТЕКСТ (токен приходит из рендера)
// ============================
let apiContext = { apiUrl: API_URL, token: null };

ipcMain.handle('set-api-context', (event, ctx) => {
  if (ctx && typeof ctx === 'object') {
    apiContext = {
      apiUrl: typeof ctx.apiUrl === 'string' ? ctx.apiUrl : API_URL,
      token: typeof ctx.token === 'string' ? ctx.token : null,
    };
  }
  return { ok: true };
});

// ============================
// АВТОИМПОРТ: слежение за папками
// ============================
const DEFAULT_IMPORT_EXTS = [
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tif', '.tiff', '.svg',
  '.psd', '.kra', '.krz', '.ora', '.xcf', '.pdf',
];
const MAX_IMPORT_BYTES = 50 * 1024 * 1024;

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.svg': 'image/svg+xml',
  '.psd': 'image/vnd.adobe.photoshop',
  '.ora': 'image/openraster',
  '.xcf': 'image/x-xcf',
  '.kra': 'application/x-krita',
  '.krz': 'application/x-krita',
  '.pdf': 'application/pdf',
};

function mimeForFile(filename) {
  return MIME_BY_EXT[path.extname(filename).toLowerCase()] || 'application/octet-stream';
}

const watchers = new Map(); // appId -> { watcher, folder, projectId, exts }
const importedKeys = new Set();
const pendingTimers = new Map();

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function isIgnorableFile(name) {
  if (!name) return true;
  const base = path.basename(name);
  if (base.startsWith('.')) return true;
  if (base.endsWith('~')) return true;
  if (base.endsWith('.tmp') || base.endsWith('.part') || base.endsWith('.swp')) return true;
  return false;
}

async function uploadImportedFile({ appId, folder, projectId, exts, filename }) {
  const fullPath = path.join(folder, filename);

  let stat;
  try {
    stat = await fs.promises.stat(fullPath);
  } catch {
    return;
  }
  if (!stat.isFile()) return;
  if (stat.size === 0 || stat.size > MAX_IMPORT_BYTES) return;

  const ext = path.extname(filename).toLowerCase();
  if (!exts.has(ext)) return;

  const key = `${fullPath}:${stat.size}:${Math.round(stat.mtimeMs)}`;
  if (importedKeys.has(key)) return;
  importedKeys.add(key);
  if (importedKeys.size > 2000) importedKeys.clear();

  if (!apiContext.token) {
    sendToRenderer('import-done', { appId, ok: false, file: fullPath, error: 'Нужна авторизация в приложении' });
    return;
  }

  try {
    const buf = await fs.promises.readFile(fullPath);
    const baseName = path.basename(filename);
    const form = new FormData();
    form.append('file', new Blob([buf], { type: mimeForFile(baseName) }), baseName);
    const res = await fetch(`${apiContext.apiUrl}/api/projects/${projectId}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiContext.token}` },
      body: form,
    });
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        message = data.error || message;
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }
    const media = await res.json();
    sendToRenderer('import-done', { appId, ok: true, file: fullPath, projectId, media });
  } catch (err) {
    sendToRenderer('import-done', { appId, ok: false, file: fullPath, projectId, error: err.message });
  }
}

function scheduleImport(cfg, filename) {
  const timerKey = `${cfg.appId}:${filename}`;
  const prev = pendingTimers.get(timerKey);
  if (prev) clearTimeout(prev);
  const timer = setTimeout(() => {
    pendingTimers.delete(timerKey);
    uploadImportedFile({ ...cfg, filename }).catch(() => undefined);
  }, 1200);
  pendingTimers.set(timerKey, timer);
}

ipcMain.handle('watch-folder', (event, config = {}) => {
  const { appId, folder, projectId } = config;
  if (!appId || !folder || !projectId) {
    return { ok: false, error: 'Нужны appId, folder и projectId' };
  }
  if (!fs.existsSync(folder)) {
    return { ok: false, error: 'Папка не найдена' };
  }

  const existing = watchers.get(appId);
  if (existing) {
    try {
      existing.watcher.close();
    } catch {
      /* ignore */
    }
    watchers.delete(appId);
  }

  const exts = new Set(
    (Array.isArray(config.extensions) && config.extensions.length
      ? config.extensions
      : DEFAULT_IMPORT_EXTS
    ).map((e) => String(e).toLowerCase())
  );

  const cfg = { appId, folder, projectId, exts };

  let watcher;
  try {
    watcher = fs.watch(folder, { recursive: true }, (eventType, filename) => {
      if (!filename || isIgnorableFile(filename)) return;
      scheduleImport(cfg, filename.toString());
    });
  } catch {
    try {
      watcher = fs.watch(folder, (eventType, filename) => {
        if (!filename || isIgnorableFile(filename)) return;
        scheduleImport(cfg, filename.toString());
      });
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  watcher.on('error', () => undefined);
  watchers.set(appId, { watcher, folder, projectId, exts });
  return { ok: true };
});

ipcMain.handle('unwatch-folder', (event, appId) => {
  const entry = watchers.get(appId);
  if (entry) {
    try {
      entry.watcher.close();
    } catch {
      /* ignore */
    }
    watchers.delete(appId);
  }
  return { ok: true };
});

ipcMain.handle('list-watchers', () =>
  [...watchers.entries()].map(([appId, w]) => ({ appId, folder: w.folder, projectId: w.projectId }))
);

// ============================
// TIME TRACKING (локальный таймер)
// ============================
let sessionTimer = null;
let sessionStartTime = null;
let currentProjectId = null;

ipcMain.handle('start-session', async (event, projectId) => {
  try {
    if (sessionTimer) {
      clearInterval(sessionTimer);
      sessionTimer = null;
    }
    currentProjectId = projectId;
    sessionStartTime = new Date().toISOString();

    sessionTimer = setInterval(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('session-tick', {
          projectId: currentProjectId,
          startTime: sessionStartTime,
          currentTime: new Date().toISOString(),
        });
      }
    }, 1000);

    return { ok: true, startTime: sessionStartTime };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('stop-session', async () => {
  try {
    if (sessionTimer) {
      clearInterval(sessionTimer);
      sessionTimer = null;
    }

    const endTime = new Date().toISOString();
    const startTime = sessionStartTime;
    const projectId = currentProjectId;

    sessionStartTime = null;
    currentProjectId = null;

    return { ok: true, startTime, endTime, projectId };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('get-session-status', async () => {
  return {
    isActive: sessionTimer !== null,
    projectId: currentProjectId,
    startTime: sessionStartTime,
  };
});

app.whenReady().then(() => {
  loadQueue();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
