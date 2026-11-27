const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mealphaDesktop', {
  openExternal: (url) => ipcRenderer.invoke('mealpha:open-external', url),
  notify: (payload) => ipcRenderer.invoke('mealpha:notify', payload),
  getFullscreen: () => ipcRenderer.invoke('mealpha:fullscreen:get'),
  setFullscreen: (enabled) => ipcRenderer.invoke('mealpha:fullscreen:set', Boolean(enabled))
});
