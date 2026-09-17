const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  readFontFile: (filePath) => ipcRenderer.invoke('read-font-file', filePath),
  deletePathToTrash: (targetPath) => ipcRenderer.invoke('delete-path-to-trash', targetPath),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  isElectron: true,
});

