const { contextBridge, ipcRenderer } = require('electron');

// Базовый URL API берём из переменных окружения процесса Electron
let apiUrl = 'http://localhost:4000';
try {
  if (process.env && process.env.VITE_API_URL) {
    apiUrl = process.env.VITE_API_URL;
  }
} catch (err) {
  // sandboxed preload без доступа к env — используем дефолт
}

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  apiUrl,

  // Полная конфигурация из главного процесса
  getConfig: () => ipcRenderer.invoke('get-config'),

  // Запуск внешнего приложения
  launchApp: (appPath, args, launchId) => ipcRenderer.invoke('launch-app', appPath, args, launchId),
  pickAppPath: () => ipcRenderer.invoke('pick-app'),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),

  // Событие закрытия запущенного приложения
  onAppExited: (callback) => {
    ipcRenderer.on('app-exited', (event, data) => callback(data));
  },
  offAppExited: () => {
    ipcRenderer.removeAllListeners('app-exited');
  },

  // Контекст API для автоимпорта (токен из рендера)
  setApiContext: (ctx) => ipcRenderer.invoke('set-api-context', ctx),

  // Слежение за папками (автоимпорт)
  watchFolder: (config) => ipcRenderer.invoke('watch-folder', config),
  unwatchFolder: (appId) => ipcRenderer.invoke('unwatch-folder', appId),
  listWatchers: () => ipcRenderer.invoke('list-watchers'),
  onImportDone: (callback) => {
    ipcRenderer.on('import-done', (event, data) => callback(data));
  },
  offImportDone: () => {
    ipcRenderer.removeAllListeners('import-done');
  },

  // Time tracking
  startSession: (projectId) => ipcRenderer.invoke('start-session', projectId),
  stopSession: () => ipcRenderer.invoke('stop-session'),
  getSessionStatus: () => ipcRenderer.invoke('get-session-status'),

  // Подписка на тики таймера
  onSessionTick: (callback) => {
    ipcRenderer.on('session-tick', (event, data) => callback(data));
  },
  offSessionTick: () => {
    ipcRenderer.removeAllListeners('session-tick');
  },

  // Оффлайн-очередь сессий
  offlineGetQueue: () => ipcRenderer.invoke('offline-get-queue'),
  offlineEnqueue: (item) => ipcRenderer.invoke('offline-enqueue', item),
  offlineReplace: (items) => ipcRenderer.invoke('offline-replace', items),
  offlineRemove: (clientId) => ipcRenderer.invoke('offline-remove', clientId),
  offlineClear: () => ipcRenderer.invoke('offline-clear'),
  onOfflineQueueChanged: (callback) => {
    ipcRenderer.on('offline-queue-changed', (event, queue) => callback(queue));
  },
  offOfflineQueueChanged: () => {
    ipcRenderer.removeAllListeners('offline-queue-changed');
  },
});
