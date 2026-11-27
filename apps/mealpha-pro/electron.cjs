const { app, BrowserWindow, ipcMain, shell, Notification } = require('electron');
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
      ? parsed.origin === 'http://localhost:4173'
      : parsed.origin === 'http://127.0.0.1:8080';
    if (!allowed) event.preventDefault();
  });
  if (process.argv.includes('--smoke-test')) {
    const startedAt = Date.now();
    win.webContents.on('console-message', (_event, details, legacyMessage) => {
      const level = typeof details === 'object' && details !== null ? details.level : details;
      const message = typeof details === 'object' && details !== null ? details.message : legacyMessage;
      if (Number(level) >= 2) console.error('MEALPHA_RENDERER_CONSOLE_ERROR:', message);
    });
    win.webContents.on('render-process-gone', (_event, details) => {
      console.error('MEALPHA_RENDERER_CRASH:', JSON.stringify(details));
      app.exit(1);
    });
    win.webContents.on('did-fail-load', (_event, code, description, validatedURL) => {
      if (code !== -3) {
        console.error('MEALPHA_RENDERER_LOAD_FAILED:', code, description, validatedURL);
        app.exit(1);
      }
    });
    const checkRenderer = () => {
      if (win.isDestroyed()) return;
      win.webContents.executeJavaScript(`(async () => {
        const root = document.querySelector('#root');
        const text = (root?.innerText || '').replace(/\\s+/g, ' ').trim();
        const visible = !!root && root.getBoundingClientRect().width > 0 && root.getBoundingClientRect().height > 0;
        const fallback = text.includes('could not load this screen');
        const splashOnly = !!root?.querySelector('.animate-pulse') && text.length < 20;
        const shell = !!root?.querySelector('header') && !!root?.querySelector('nav');
        const desktop = window.mealphaDesktop;
        const before = desktop?.getFullscreen ? await desktop.getFullscreen() : null;
        let fullscreen = { supported: Boolean(desktop?.getFullscreen && desktop?.setFullscreen), before, settingsControl: false, toggled: null, restored: null };
        if (fullscreen.supported) {
          const settingsLink = document.querySelector('a[href="/settings"]');
          if (settingsLink) settingsLink.click();
          await new Promise(resolve => setTimeout(resolve, 900));
          let control = document.querySelector('[data-testid="fullscreen-toggle"]');
          fullscreen.settingsControl = Boolean(control);
          if (control) {
            for (let i = 0; i < 20 && control.getAttribute('aria-pressed') !== String(before); i++) {
              await new Promise(resolve => setTimeout(resolve, 100));
              control = document.querySelector('[data-testid="fullscreen-toggle"]');
            }
            control?.click();
            await new Promise(resolve => setTimeout(resolve, 900));
            fullscreen.toggled = await desktop.getFullscreen();
            // Restore through the same trusted preload bridge rather than a second
            // synthetic React click, which can race the renderer's state update.
            fullscreen.restored = await desktop.setFullscreen(Boolean(before));
            await new Promise(resolve => setTimeout(resolve, 300));
            fullscreen.restored = await desktop.getFullscreen();
          }
        }
        return { ready: visible && shell && !fallback && !splashOnly && text.length >= 35, textLength: text.length, text: text.slice(0, 180), visible, shell, fallback, splashOnly, title: document.title, url: location.href, fullscreen };
      })()`)
        .then((state) => {
          const fullscreenOk = state.fullscreen.supported && state.fullscreen.settingsControl &&
            state.fullscreen.toggled === !state.fullscreen.before &&
            state.fullscreen.restored === state.fullscreen.before;
          if (state.ready && fullscreenOk) {
            console.log('MEALPHA_SMOKE_OK:', JSON.stringify(state));
            app.quit();
          } else if (Date.now() - startedAt > 30000) {
            console.error('MEALPHA_SMOKE_FAILED: renderer or fullscreen settings verification failed:', JSON.stringify(state));
            app.exit(1);
          } else {
            setTimeout(checkRenderer, 300);
          }
        })
        .catch((error) => {
          console.error('MEALPHA_SMOKE_FAILED:', error);
          app.exit(1);
        });
    };
    win.webContents.once('did-finish-load', checkRenderer);
  }
  if (app.isPackaged) await win.loadURL('http://localhost:4173');
  else await win.loadURL('http://127.0.0.1:8080');
}


function getTrustedWindow(event) {
  let senderUrl;
  try { senderUrl = new URL(event.senderFrame?.url || ''); } catch { throw new Error('Untrusted application frame.'); }
  const allowedSender = app.isPackaged
    ? senderUrl.origin === 'http://localhost:4173'
    : senderUrl.origin === 'http://127.0.0.1:8080';
  if (!allowedSender) throw new Error('Fullscreen controls can only be used by the MeAlpha application.');
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) throw new Error('The MeAlpha application window is unavailable.');
  return win;
}

ipcMain.handle('mealpha:fullscreen:get', (event) => getTrustedWindow(event).isFullScreen());

ipcMain.handle('mealpha:fullscreen:set', (event, enabled) => {
  const win = getTrustedWindow(event);
  const target = Boolean(enabled);
  if (win.isFullScreen() === target) return Promise.resolve(target);
  return new Promise((resolve, reject) => {
    const eventName = target ? 'enter-full-screen' : 'leave-full-screen';
    let timeout;
    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      win.removeListener(eventName, finish);
      win.removeListener('closed', finish);
    };
    const finish = () => {
      cleanup();
      resolve(!win.isDestroyed() && win.isFullScreen());
    };
    win.once(eventName, finish);
    win.once('closed', finish);
    timeout = setTimeout(finish, 1500);
    try {
      win.setFullScreen(target);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
});

ipcMain.handle('mealpha:open-external', async (event, rawUrl) => {
  let senderUrl;
  try { senderUrl = new URL(event.senderFrame?.url || ''); } catch { throw new Error('Untrusted application frame.'); }
  const allowedSender = app.isPackaged
    ? senderUrl.origin === 'http://localhost:4173'
    : senderUrl.origin === 'http://127.0.0.1:8080';
  if (!allowedSender) throw new Error('External links can only be opened by the MeAlpha application.');
  let url;
  try { url = new URL(String(rawUrl)); } catch { throw new Error('Invalid Dropbox authorization URL.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'www.dropbox.com' || url.pathname !== '/oauth2/authorize' || url.username || url.password) {
    throw new Error('Only the official Dropbox authorization page can be opened.');
  }
  await shell.openExternal(url.toString());
});

ipcMain.handle('mealpha:notify', async (event, payload) => {
  let senderUrl;
  try { senderUrl = new URL(event.senderFrame?.url || ''); } catch { throw new Error('Untrusted application frame.'); }
  const allowedSender = app.isPackaged ? senderUrl.origin === 'http://localhost:4173' : senderUrl.origin === 'http://127.0.0.1:8080';
  if (!allowedSender) throw new Error('Notifications can only be created by the MeAlpha application.');
  const title = String(payload?.title || 'MeAlpha Pro').slice(0, 80);
  const body = String(payload?.body || '').slice(0, 240);
  if (!Notification.isSupported()) return false;
  new Notification({ title, body }).show();
  return true;
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
