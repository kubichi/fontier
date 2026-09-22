const { app, BrowserWindow, ipcMain, dialog, session, nativeTheme, shell, clipboard, systemPreferences, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

app.name = 'Fontier';
nativeTheme.themeSource = 'dark';
if (process.platform === 'win32') {
  app.setAppUserModelId('com.fontier.app');
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
}
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

function createWindow() {
  const isWin = process.platform === 'win32';
  const iconCandidates = isWin
    ? [
        path.join(__dirname, '../public/icon.ico'),
        path.join(__dirname, '../dist/icon.ico'),
        path.join(__dirname, '../build/icon.ico'),
        path.join(__dirname, '../public/icon.png'),
        path.join(__dirname, '../dist/icon.png'),
      ]
    : [
        path.join(__dirname, '../public/icon.png'),
        path.join(__dirname, '../dist/icon.png'),
        path.join(__dirname, '../public/fontier_icon.png'),
      ];

  let resolvedIconPath = iconCandidates.find((p) => fs.existsSync(p)) || path.join(__dirname, '../public/icon.ico');
  const appIcon = fs.existsSync(resolvedIconPath) ? nativeImage.createFromPath(resolvedIconPath) : undefined;

  const mainWindow = new BrowserWindow({
    title: 'Fontier',
    width: 1280,
    height: 850,
    minWidth: 960,
    minHeight: 640,
    frame: process.platform === 'linux' ? true : false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : (process.platform === 'linux' ? 'default' : 'hidden'),
    ...(process.platform === 'darwin' ? { trafficLightPosition: { x: 12, y: 12 } } : {}),
    backgroundColor: '#161616',
    icon: appIcon || resolvedIconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Allow local font file access and blob font loading
      sandbox: false,
    },
  });

  if (isWin && appIcon) {
    mainWindow.setIcon(appIcon);
  }

  // Remove default menu bar
  mainWindow.setMenuBarVisibility(false);

  // Load app (production build or local dev server)
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL(process.env.ELECTRON_DEV_URL || 'http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

function registerIpcHandlers() {
  // Window control IPC handlers
  ipcMain.on('window-minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow();
    if (win) win.minimize();
  });
  ipcMain.on('window-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow();
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });
  ipcMain.on('window-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow();
    if (win) win.close();
  });

  // Native folder selection dialog with recursive subfolder traversal (RAM-optimized: paths & stats only)
  ipcMain.handle('select-directory', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow() || undefined;
    const result = await dialog.showOpenDialog(win, {
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
          // Ignore hidden files/directories, macOS AppleDouble metadata files (._*), and __MACOSX
          if (entry.name.startsWith('.') || entry.name.startsWith('._') || entry.name === '__MACOSX') {
            continue;
          }
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const nested = await scanDir(fullPath);
            fontFiles = fontFiles.concat(nested);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (['.ttf', '.otf', '.woff', '.woff2', '.ttc'].includes(ext)) {
              try {
                const stats = await fs.promises.stat(fullPath);
                // Compute relative path from root selected folder e.g. "helvetica/bold/Font.ttf"
                const relPath = path.relative(folderPath, fullPath).replace(/\\/g, '/');
                fontFiles.push({
                  name: entry.name,
                  path: fullPath,
                  relativePath: relPath,
                  size: stats.size,
                });
              } catch (e) {
                console.warn('Could not stat font file:', fullPath, e);
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

  // On-demand font file buffer reader (keeps RAM low by reading only when requested)
  ipcMain.handle('read-font-file', async (event, filePath) => {
    try {
      if (!filePath || typeof filePath !== 'string') return null;
      const fileBuf = await fs.promises.readFile(filePath);
      return fileBuf.buffer.slice(fileBuf.byteOffset, fileBuf.byteOffset + fileBuf.byteLength);
    } catch (err) {
      console.warn('Could not read font file:', filePath, err);
      return null;
    }
  });

  // Safe delete to OS Trash/Recycle Bin (works on Windows Recycle Bin, macOS Trash, Linux freedesktop trash)
  ipcMain.handle('delete-path-to-trash', async (event, targetPath) => {
    try {
      if (!targetPath || typeof targetPath !== 'string') return false;
      await shell.trashItem(targetPath);
      return true;
    } catch (err) {
      console.warn('Could not trash path:', targetPath, err);
      return false;
    }
  });

  // App Version IPC handler
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  ipcMain.handle('copy-to-clipboard', async (_, text) => {
    clipboard.writeText(text);
    return true;
  });

  ipcMain.handle('get-platform', () => process.platform);

  ipcMain.handle('get-accent-color', () => {
    try {
      return '#' + systemPreferences.getAccentColor().substring(0, 6);
    } catch(e) {
      return '#38bdf8';
    }
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();

  // Auto-grant permission for local system fonts access (window.queryLocalFonts)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'local-fonts') {
      callback(true);
      return;
    }
    callback(false);
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'local-fonts') {
      return true;
    }
    return false;
  });

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
