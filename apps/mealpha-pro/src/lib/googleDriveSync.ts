import { SocialLogin } from '@capgo/capacitor-social-login';
import { getSnapshot, mergeSnapshot, Snapshot } from './localDb';

const DRIVE_FILE = 'mealpha-pro-sync.json';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
let initializedClientId = '';
let initializingClientId = '';
let initialization: Promise<void> | null = null;

/**
 * Prepare the provider before the user taps Sync. This is important on web:
 * the actual login call must happen directly inside the click gesture so the
 * browser can open Google's account/consent UI. On Android the same API uses
 * the native Credential Manager instead of an embedded WebView.
 */
export function prepareGoogleIdentity(clientId: string): Promise<void> {
  const normalized = clientId.trim();
  if (!normalized) return Promise.reject(new Error('ابتدا Google OAuth Web Client ID را در تنظیمات وارد کنید.'));
  if (initializedClientId === normalized) return Promise.resolve();
  if (initialization) {
    if (initializingClientId === normalized) return initialization;
    return initialization.catch(() => undefined).then(() => prepareGoogleIdentity(normalized));
  }

  initializingClientId = normalized;
  initialization = SocialLogin.initialize({
    google: {
      webClientId: normalized,
      mode: 'online',
    },
  }).then(() => {
    initializedClientId = normalized;
  }).catch((error) => {
    initializedClientId = '';
    throw error instanceof Error ? error : new Error('Google sign-in could not be initialized.');
  }).finally(() => {
    initialization = null;
    initializingClientId = '';
  });

  return initialization;
}

/**
 * Call this directly from the Sync button's click handler.
 * Do not put an await before SocialLogin.login(): web browsers require the
 * account picker / consent popup to be opened from the user's click gesture.
 */
function requestGoogleAccessToken(): Promise<string> {
  const loginPromise = SocialLogin.login({
    provider: 'google',
    options: {
      scopes: ['openid', 'email', 'profile', DRIVE_SCOPE],
      forceRefreshToken: true,
      prompt: 'select_account',
    },
  });

  return loginPromise.then(({ result }) => {
    if (result.responseType !== 'online' || !result.accessToken?.token) {
      throw new Error('Google ورود را انجام داد، اما مجوز دسترسی به Google Drive دریافت نشد. تنظیمات OAuth و مجوز Drive را بررسی کنید.');
    }
    return result.accessToken.token;
  });
}

async function driveRequest(url: string, token: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    if (response.status === 401) {
      throw new Error('مجوز گوگل منقضی یا لغو شده است. دوباره همگام‌سازی را اجرا کنید.');
    }
    if (response.status === 403) {
      throw new Error('دسترسی Google Drive رد شد. فعال بودن Drive API و مجوز appDataFolder را بررسی کنید.');
    }
    throw new Error(`Google Drive error (${response.status}): ${detail.slice(0, 300)}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function findSyncFile(token: string): Promise<string | null> {
  const query = encodeURIComponent(
    `name='${DRIVE_FILE}' and 'appDataFolder' in parents and trashed=false`,
  );
  const result = await driveRequest(
    `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=appDataFolder&fields=files(id,name,modifiedTime)&pageSize=10`,
    token,
  );
  return result.files?.[0]?.id ?? null;
}

async function uploadSnapshot(token: string, snapshot: Snapshot, fileId: string | null) {
  const boundary = 'mealpha_sync_boundary_92741';
  const metadata = fileId
    ? {}
    : { name: DRIVE_FILE, parents: ['appDataFolder'], mimeType: 'application/json' };
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(snapshot)}\r\n` +
    `--${boundary}--\r\n`;

  const url = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  return driveRequest(url, token, {
    method: fileId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
}

export async function syncWithGoogleDrive() {
  // Start the native/web login immediately; do not await anything first.
  const accessTokenPromise = requestGoogleAccessToken();
  const token = await accessTokenPromise;
  const fileId = await findSyncFile(token);

  if (!fileId) {
    await uploadSnapshot(token, await getSnapshot(), null);
    return {
      direction: 'uploaded' as const,
      message: 'اولین نسخه اطلاعات با موفقیت در فضای خصوصی Google Drive ذخیره شد.',
    };
  }

  const remote = await driveRequest(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    token,
  ) as Snapshot;

  // The local-first merge preserves local-only edits and resolves record
  // conflicts using updatedAt/tombstones. A pre-sync recovery snapshot is
  // stored atomically by mergeSnapshot before local data is changed.
  await mergeSnapshot(remote);
  const merged = await getSnapshot();
  await uploadSnapshot(token, merged, fileId);

  return {
    direction: 'merged' as const,
    message: 'اطلاعات این دستگاه و Google Drive با حفظ تغییرات هر دو طرف همگام‌سازی شدند.',
  };
}
