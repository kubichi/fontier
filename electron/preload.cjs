const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  restartAndInstallUpdate: () => ipcRenderer.invoke('restart-and-install-update'),
  onUpdaterStatus: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('updater-status', handler);
    return () => ipcRenderer.removeListener('updater-status', handler);
  },
  isElectron: true,
});

