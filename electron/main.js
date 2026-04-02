const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;

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

  // В DEV режиме
  mainWindow.loadURL('http://localhost:5173');
  
  // Открываем DevTools в разработке
  // mainWindow.webContents.openDevTools();
}

// Обработчик запуска внешнего приложения
ipcMain.handle('launch-app', async (event, appPath, args = []) => {
  try {
    const child = spawn(appPath, args, { detached: true, stdio: 'ignore' });
    child.unref();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Обработчик для time tracking - старт сессии
let sessionTimer = null;
let sessionStartTime = null;
let currentProjectId = null;

ipcMain.handle('start-session', async (event, projectId) => {
  try {
    currentProjectId = projectId;
    sessionStartTime = new Date().toISOString();
    
    // Запускаем таймер (опционально можно отправлять события на фронтенд)
    sessionTimer = setInterval(() => {
      if (mainWindow) {
        mainWindow.webContents.send('session-tick', {
          projectId: currentProjectId,
          startTime: sessionStartTime,
          currentTime: new Date().toISOString(),
        });
      }
    }, 1000); // каждую секунду
    
    return { ok: true, startTime: sessionStartTime };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Обработчик для остановки сессии
ipcMain.handle('stop-session', async (event) => {
  try {
    if (sessionTimer) {
      clearInterval(sessionTimer);
      sessionTimer = null;
    }
    
    const endTime = new Date().toISOString();
    const startTime = sessionStartTime;
    const projectId = currentProjectId;
    
    // Сбрасываем
    sessionStartTime = null;
    currentProjectId = null;
    
    return { 
      ok: true, 
      startTime, 
      endTime,
      projectId 
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Получить статус сессии
ipcMain.handle('get-session-status', async (event) => {
  return {
    isActive: sessionTimer !== null,
    projectId: currentProjectId,
    startTime: sessionStartTime,
  };
});

app.whenReady().then(createWindow);

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
