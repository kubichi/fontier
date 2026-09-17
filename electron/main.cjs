const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

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

  // Native folder selection dialog with recursive subfolder traversal
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Font Directory (Scans all subfolders)',
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const folderPath = result.filePaths[0];
    const folderName = path.basename(folderPath);

    async function scanDir(dir) {
      let fontFiles = [];
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const nested = await scanDir(fullPath);
            fontFiles = fontFiles.concat(nested);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (['.ttf', '.otf', '.woff', '.woff2', '.ttc'].includes(ext)) {
              try {
                const stats = await fs.promises.stat(fullPath);
                const fileBuf = await fs.promises.readFile(fullPath);
                fontFiles.push({
                  name: entry.name,
                  path: fullPath,
                  size: stats.size,
                  buffer: fileBuf.buffer.slice(fileBuf.byteOffset, fileBuf.byteOffset + fileBuf.byteLength),
                });
              } catch (e) {
                console.warn('Could not read file binary:', fullPath, e);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Could not scan directory:', dir, err);
      }
      return fontFiles;
    }

    const files = await scanDir(folderPath);
    return {
      folderPath,
      folderName,
      files,
    };
  });

  // App Version IPC handler
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // Auto-updater setup with electron-updater
  let autoUpdater = null;
  try {
    const updaterModule = require('electron-updater');
    autoUpdater = updaterModule.autoUpdater;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
      mainWindow.webContents.send('updater-status', { status: 'checking' });
    });

    autoUpdater.on('update-available', (info) => {
      mainWindow.webContents.send('updater-status', {
        status: 'available',
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      });
    });

    autoUpdater.on('update-not-available', (info) => {
      mainWindow.webContents.send('updater-status', {
        status: 'up-to-date',
        version: info.version,
      });
    });

    autoUpdater.on('download-progress', (progress) => {
      mainWindow.webContents.send('updater-status', {
        status: 'downloading',
        percent: Math.round(progress.percent),
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total,
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      mainWindow.webContents.send('updater-status', {
        status: 'downloaded',
        version: info.version,
        releaseNotes: info.releaseNotes,
      });
    });

    autoUpdater.on('error', (err) => {
      mainWindow.webContents.send('updater-status', {
        status: 'error',
        error: err ? err.message : 'Unknown update error',
      });
    });
  } catch (err) {
    console.log('electron-updater not loaded (normal in web dev):', err?.message);
  }

  // Manual Check For Updates
  ipcMain.handle('check-for-updates', async () => {
    if (!autoUpdater || !app.isPackaged) {
      return { status: 'dev-mode', message: 'Auto-updates are active in packaged GitHub releases.' };
    }
    try {
      const res = await autoUpdater.checkForUpdates();
      return { status: 'started', res };
    } catch (err) {
      return { status: 'error', error: err?.message };
    }
  });

  // Quit and Install Update
  ipcMain.handle('restart-and-install-update', () => {
    if (autoUpdater) {
      autoUpdater.quitAndInstall();
    }
  });

  // Remove default menu bar
  mainWindow.setMenuBarVisibility(false);

  // Auto-check on startup if packaged
  mainWindow.webContents.on('did-finish-load', () => {
    if (autoUpdater && app.isPackaged) {
      autoUpdater.checkForUpdatesAndNotify().catch((e) => {
        console.warn('Silent update check on launch error:', e);
      });
    }
  });

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
