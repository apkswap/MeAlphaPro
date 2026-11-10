const { app, BrowserWindow, ipcMain, shell } = require('electron');
const express = require('express');
const path = require('path');

let localServer;
const oauthResults = new Map();

function callbackPage(message) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MeAlpha Pro</title></head><body style="font-family:Segoe UI,Arial,sans-serif;background:#071a2c;color:#fff;display:grid;place-items:center;min-height:90vh"><main style="max-width:520px;padding:32px;text-align:center"><h2>${message}</h2><p>You can return to MeAlpha Pro now. This browser tab can be closed.</p></main></body></html>`;
}

async function startLocalServer() {
  const serverApp = express();
  serverApp.get('/oauth/dropbox/callback', (req, res) => {
    const state = String(req.query.state || '');
    const code = typeof req.query.code === 'string' ? req.query.code : undefined;
    const error = typeof req.query.error === 'string' ? req.query.error : undefined;
    const error_description = typeof req.query.error_description === 'string' ? req.query.error_description : undefined;
    if (!state || (!code && !error)) {
      return res.status(400).send(callbackPage('Dropbox sign-in response is incomplete.'));
    }
    oauthResults.set(state, { status: 'complete', state, code, error, error_description, createdAt: Date.now() });
    return res.status(200).set('Cache-Control', 'no-store').send(callbackPage(error ? 'Dropbox authorization was not completed.' : 'Dropbox authorization successful.'));
  });
  serverApp.get('/oauth/dropbox/result', (req, res) => {
    res.set('Access-Control-Allow-Origin', '*').set('Cache-Control', 'no-store');
    const state = String(req.query.state || '');
    const result = oauthResults.get(state);
    if (!result) return res.json({ status: 'pending' });
    oauthResults.delete(state);
    const { createdAt, ...safeResult } = result;
    return res.json(safeResult);
  });
  if (app.isPackaged) {
    const dist = path.join(__dirname, 'dist');
    serverApp.use(express.static(dist));
    serverApp.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  await new Promise((resolve, reject) => {
    localServer = serverApp.listen(4173, '127.0.0.1', resolve);
    localServer.once('error', reject);
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 940, minWidth: 1024, minHeight: 700,
    icon: path.join(__dirname, 'build', 'mealpha.ico'),
    backgroundColor: '#071a2c', autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true
    }
  });
  if (app.isPackaged) await win.loadURL('http://localhost:4173');
  else await win.loadURL('http://127.0.0.1:8080');
}

ipcMain.handle('mealpha:open-external', async (_event, rawUrl) => {
  const url = new URL(String(rawUrl));
  if (url.protocol !== 'https:' || !['www.dropbox.com', 'dropbox.com'].includes(url.hostname)) {
    throw new Error('Only the official Dropbox authorization page can be opened.');
  }
  await shell.openExternal(url.toString());
});

app.whenReady().then(async () => {
  try {
    await startLocalServer();
    await createWindow();
  } catch (error) {
    console.error(error);
    app.quit();
  }
  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) createWindow();
  });
});
app.on('before-quit', () => {
  if (localServer) localServer.close();
  oauthResults.clear();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
