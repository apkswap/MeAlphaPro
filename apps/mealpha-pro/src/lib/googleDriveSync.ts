import { getSnapshot, mergeSnapshot, Snapshot } from './localDb';

declare global {
  interface Window { google?: any; }
}
const DRIVE_FILE = 'mealpha-pro-sync.json';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
let gisPromise: Promise<void> | undefined;

function loadGoogleIdentity() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!gisPromise) gisPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]');
    const script = existing ?? document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true; script.defer = true; script.dataset.googleIdentity = 'true';
    script.onload = () => resolve(); script.onerror = () => reject(new Error('Google sign-in library could not be loaded. Check your internet connection.'));
    if (!existing) document.head.appendChild(script);
  });
  return gisPromise;
}

async function getAccessToken(clientId: string) {
  if (!clientId?.trim()) throw new Error('ابتدا Google OAuth Client ID را در تنظیمات وارد کنید.');
  await loadGoogleIdentity();
  return new Promise<string>((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId.trim(), scope: DRIVE_SCOPE,
      callback: (response: any) => response?.access_token ? resolve(response.access_token) : reject(new Error(response?.error_description || response?.error || 'Google authorization failed.')),
      error_callback: (error: any) => reject(new Error(error?.message || 'Google authorization was cancelled.')),
    });
    client.requestAccessToken({ prompt: 'consent' });
  });
}

async function driveRequest(url: string, token: string, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Google Drive error (${response.status}): ${detail.slice(0, 300)}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function findSyncFile(token: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${DRIVE_FILE}' and 'appDataFolder' in parents and trashed=false`);
  const result = await driveRequest(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=appDataFolder&fields=files(id,name,modifiedTime)&pageSize=10`, token);
  return result.files?.[0]?.id ?? null;
}

async function uploadSnapshot(token: string, snapshot: Snapshot, fileId: string | null) {
  const boundary = 'mealpha_sync_boundary_92741';
  const metadata = fileId ? {} : { name: DRIVE_FILE, parents: ['appDataFolder'], mimeType: 'application/json' };
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(snapshot)}\r\n--${boundary}--`;
  const url = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  return driveRequest(url, token, { method: fileId ? 'PATCH' : 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body });
}

export async function syncWithGoogleDrive(clientId: string) {
  const token = await getAccessToken(clientId);
  const fileId = await findSyncFile(token);
  if (!fileId) {
    await uploadSnapshot(token, await getSnapshot(), null);
    return { direction: 'uploaded' as const, message: 'اولین نسخه پشتیبان در Google Drive ذخیره شد.' };
  }
  const remote = await driveRequest(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, token) as Snapshot;
  await mergeSnapshot(remote);
  const merged = await getSnapshot();
  await uploadSnapshot(token, merged, fileId);
  return { direction: 'merged' as const, message: 'اطلاعات محلی و Google Drive با هم ادغام و همگام‌سازی شدند.' };
}
