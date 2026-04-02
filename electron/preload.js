const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  
  // Запуск внешнего приложения
  launchApp: (appPath, args) => ipcRenderer.invoke('launch-app', appPath, args),
  
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
});
