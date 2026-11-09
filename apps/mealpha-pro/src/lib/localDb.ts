/** Local-first persistence. The app never needs a network connection to read or write data. */
export const ENTITIES = ['goals', 'tasks', 'habits', 'habitLogs', 'transactions', 'accounts', 'customItems', 'assets', 'liabilities'] as const;
export type Entity = (typeof ENTITIES)[number];
export type Rec = Record<string, any>;
export type AppSettings = { language: 'fa' | 'en'; calendar: string; currency: string; exchangeRates: string; monthlyBudget: number | null; displayName?: string; username?: string; bio?: string; avatarDataUrl?: string; coverDataUrl?: string; avatarEmoji?: string; avatarColor?: string; theme?: 'light' | 'dark' };
export type Snapshot = { version: 1; exportedAt: string; settingsUpdatedAt: number; data: Record<Entity, Rec[]>; settings: AppSettings; tombstones: Record<string, number> };

const DB_NAME = 'mealpha-pro-local';
const DB_VERSION = 2;
const STORES = [...ENTITIES, 'appMeta'] as const;
let dbPromise: Promise<IDBDatabase> | undefined;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of STORES) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: name === 'appMeta' ? 'key' : 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function readMeta<T>(key: string, fallback: T): Promise<T> {
  const db = await openDb(); const tx = db.transaction('appMeta', 'readonly');
  const row = await req(tx.objectStore('appMeta').get(key));
  return row ? row.value as T : fallback;
}
async function writeMeta(key: string, value: unknown) {
  const db = await openDb(); const tx = db.transaction('appMeta', 'readwrite');
  tx.objectStore('appMeta').put({ key, value });
  await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
}

export async function loadAll() {
  const db = await openDb();
  const tx = db.transaction([...ENTITIES, 'appMeta'], 'readonly');
  const recordRequests = ENTITIES.map((name) => req(tx.objectStore(name).getAll()));
  const settingsRequest = req(tx.objectStore('appMeta').get('settings'));
  const [records, settingsRow] = await Promise.all([Promise.all(recordRequests), settingsRequest]);
  const data: Record<string, Rec[]> = {};
  ENTITIES.forEach((name, index) => { data[name] = records[index]; });
  return { ...data, settings: (settingsRow?.value ?? null) as AppSettings | null } as Record<Entity, Rec[]> & { settings: AppSettings | null };
}

export async function saveRecord(entity: Entity, record: Rec, id?: string) {
  const db = await openDb(); const now = Date.now(); const recordId = id ?? record.id ?? crypto.randomUUID();
  const saved = { ...record, id: recordId, updatedAt: now };
  const tombstones = await readMeta<Record<string, number>>('tombstones', {});
  const tx = db.transaction([entity, 'appMeta'], 'readwrite');
  tx.objectStore(entity).put(saved);
  delete tombstones[`${entity}:${recordId}`];
  tx.objectStore('appMeta').put({ key: 'tombstones', value: tombstones });
  await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
  return recordId;
}

export async function deleteRecord(entity: Entity, id: string) {
  const db = await openDb();
  const tombstones = await readMeta<Record<string, number>>('tombstones', {});
  const tx = db.transaction([entity, 'appMeta'], 'readwrite');
  tx.objectStore(entity).delete(id);
  tombstones[`${entity}:${id}`] = Date.now();
  tx.objectStore('appMeta').put({ key: 'tombstones', value: tombstones });
  await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
}

export async function saveSettings(settings: AppSettings) { await writeMeta('settings', settings); await writeMeta('settingsUpdatedAt', Date.now()); }
export async function getSnapshot(): Promise<Snapshot> {
  const all = await loadAll();
  const data = {} as Record<Entity, Rec[]>;
  for (const entity of ENTITIES) data[entity] = all[entity];
  return { version: 1, exportedAt: new Date().toISOString(), settingsUpdatedAt: await readMeta('settingsUpdatedAt', 0), data, settings: all.settings ?? { language: 'fa', calendar: 'jalali', currency: 'IRT', exchangeRates: '', monthlyBudget: null }, tombstones: await readMeta('tombstones', {}) };
}

export async function mergeSnapshot(remote: Snapshot) {
  if (!remote || remote.version !== 1 || !remote.data) throw new Error('Unsupported or invalid MeAlpha backup format.');
  const local = await getSnapshot();
  const db = await openDb();
  for (const entity of ENTITIES) {
    const merged = new Map<string, Rec>();
    for (const item of local.data[entity] ?? []) merged.set(item.id, item);
    for (const item of remote.data[entity] ?? []) {
      if (!item?.id) continue;
      const current = merged.get(item.id);
      if (!current || Number(item.updatedAt ?? 0) > Number(current.updatedAt ?? 0)) merged.set(item.id, item);
    }
    const allTombstones = { ...local.tombstones, ...remote.tombstones };
    const tx = db.transaction(entity, 'readwrite');
    const store = tx.objectStore(entity);
    const existingRequest = store.getAll();
    existingRequest.onsuccess = () => {
      for (const item of existingRequest.result) store.delete(item.id);
      for (const item of merged.values()) {
        const deletedAt = allTombstones[`${entity}:${item.id}`] ?? 0;
        if (deletedAt < Number(item.updatedAt ?? 0)) store.put(item);
      }
    };
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
  }
  const remoteSettingsTime = Number(remote.settingsUpdatedAt ?? new Date(remote.exportedAt).getTime());
  const localSettingsTime = Number(local.settingsUpdatedAt ?? 0);
  if (remoteSettingsTime > localSettingsTime) { await writeMeta('settings', remote.settings); await writeMeta('settingsUpdatedAt', remoteSettingsTime); }
  await writeMeta('tombstones', { ...local.tombstones, ...remote.tombstones });
}
