const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

app.name = 'Fontier';
if (process.platform === 'win32') {
  app.setAppUserModelId('com.fontier.app');
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    title: 'Fontier',
    width: 1280,
    height: 850,
    minWidth: 960,
    minHeight: 640,
    frame: false, // Disables native Windows title bar so only Fontier's custom title bar is shown!
    titleBarStyle: 'hidden',
    backgroundColor: '#161616',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  // Handle window controls invoked from Fontier's in-app TitleBar
  ipcMain.on('window-minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    mainWindow.close();
  });

  // Remove default menu bar
  mainWindow.setMenuBarVisibility(false);

  // Load app (production build or local dev server)
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev && process.env.ELECTRON_DEV_URL) {
    mainWindow.loadURL(process.env.ELECTRON_DEV_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
