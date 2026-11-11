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
  serverApp.disable('x-powered-by');
  serverApp.use((_req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' https://www.dropbox.com; manifest-src 'self'; worker-src 'self' blob:"
    });
    next();
  });
  serverApp.get('/oauth/dropbox/callback', (req, res) => {
    const state = String(req.query.state || '');
    const code = typeof req.query.code === 'string' ? req.query.code : undefined;
    const error = typeof req.query.error === 'string' ? req.query.error : undefined;
    const error_description = typeof req.query.error_description === 'string' ? req.query.error_description : undefined;
    if (!/^[a-f0-9]{32}$/.test(state) || (!code && !error) || (code && code.length > 4096) || (error_description && error_description.length > 1024)) {
      return res.status(400).send(callbackPage('Dropbox sign-in response is incomplete.'));
    }
    oauthResults.set(state, { status: 'complete', state, code, error, error_description, createdAt: Date.now() });
    return res.status(200).set('Cache-Control', 'no-store').send(callbackPage(error ? 'Dropbox authorization was not completed.' : 'Dropbox authorization successful.'));
  });
  serverApp.get('/oauth/dropbox/result', (req, res) => {
    res.set('Cache-Control', 'no-store');
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
    width: 1360, height: 900, minWidth: 760, minHeight: 600,
    icon: path.join(__dirname, 'build', 'mealpha.ico'),
    backgroundColor: '#071a2c', autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true
    }
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, target) => {
    let parsed;
    try { parsed = new URL(target); } catch { event.preventDefault(); return; }
    const allowed = app.isPackaged
      ? parsed.origin === 'http://127.0.0.1:4173'
      : parsed.origin === 'http://127.0.0.1:8080';
    if (!allowed) event.preventDefault();
  });
  if (process.argv.includes('--smoke-test')) {
    const startedAt = Date.now();
    const checkRenderer = () => {
      if (win.isDestroyed()) return;
      win.webContents.executeJavaScript("Boolean(document.querySelector('#root')?.firstElementChild)")
        .then((ready) => {
          if (ready) {
            console.log('MEALPHA_SMOKE_OK');
            app.quit();
          } else if (Date.now() - startedAt > 20000) {
            console.error('MEALPHA_SMOKE_FAILED: renderer did not mount within 20 seconds.');
            app.exit(1);
          } else {
            setTimeout(checkRenderer, 250);
          }
        })
        .catch((error) => {
          console.error('MEALPHA_SMOKE_FAILED:', error);
          app.exit(1);
        });
    };
    win.webContents.once('did-finish-load', checkRenderer);
  }
  if (app.isPackaged) await win.loadURL('http://127.0.0.1:4173');
  else await win.loadURL('http://127.0.0.1:8080');
}

ipcMain.handle('mealpha:open-external', async (event, rawUrl) => {
  let senderUrl;
  try { senderUrl = new URL(event.senderFrame?.url || ''); } catch { throw new Error('Untrusted application frame.'); }
  const allowedSender = app.isPackaged
    ? senderUrl.origin === 'http://127.0.0.1:4173'
    : senderUrl.origin === 'http://127.0.0.1:8080';
  if (!allowedSender) throw new Error('External links can only be opened by the MeAlpha application.');
  let url;
  try { url = new URL(String(rawUrl)); } catch { throw new Error('Invalid Dropbox authorization URL.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'www.dropbox.com' || url.pathname !== '/oauth2/authorize' || url.username || url.password) {
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
    if (process.argv.includes('--smoke-test')) app.exit(1);
    else app.quit();
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
