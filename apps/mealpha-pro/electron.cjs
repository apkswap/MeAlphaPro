const { app, BrowserWindow } = require('electron');
const express = require('express');
const path = require('path');
let localServer;
async function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 940, minWidth: 1024, minHeight: 700,\n    icon: path.join(__dirname, 'build', 'mealpha.ico'),
    backgroundColor: '#111023', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  if (app.isPackaged) {
    const serverApp = express();
    const dist = path.join(__dirname, 'dist');
    serverApp.use(express.static(dist));
    serverApp.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
    await new Promise((resolve, reject) => {
      localServer = serverApp.listen(4173, '127.0.0.1', resolve);
      localServer.once('error', reject);
    });
    await win.loadURL('http://localhost:4173');
  } else {
    await win.loadURL('http://127.0.0.1:8080');
  }
}
app.whenReady().then(() => {
  createWindow().catch((error) => { console.error(error); app.quit(); });
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('before-quit', () => { if (localServer) localServer.close(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
