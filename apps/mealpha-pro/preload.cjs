const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mealphaDesktop', {
  openExternal: (url) => ipcRenderer.invoke('mealpha:open-external', url)
});
