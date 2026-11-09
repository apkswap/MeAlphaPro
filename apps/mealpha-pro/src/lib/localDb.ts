/** Local-first persistence. The app never needs a network connection to read or write data. */
export const ENTITIES = ['goals', 'tasks', 'habits', 'habitLogs', 'transactions', 'assets', 'liabilities'] as const;
export type Entity = (typeof ENTITIES)[number];
export type Rec = Record<string, any>;
export type CustomField = { id: string; name: string; type: 'text' | 'number' | 'date' | 'checkbox' | 'select'; options?: string[] };
export type CustomSpaceRecord = { id: string; createdAt: number; values: Record<string, string | number | boolean> };
export type CustomSpace = { id: string; name: string; icon: string; color: string; fields: CustomField[]; records: CustomSpaceRecord[] };
export type AppSettings = { language: 'fa' | 'en'; calendar: string; currency: string; exchangeRates: string; monthlyBudget: number | null; customCategories?: { goals?: string[]; tasks?: string[]; transactions?: string[] }; identity?: { displayName: string; username: string; avatar: string; bio: string; accentColor: string }; customSpaces?: CustomSpace[] };
export type Snapshot = { version: 1; exportedAt: string; settingsUpdatedAt: number; data: Record<Entity, Rec[]>; settings: AppSettings; tombstones: Record<string, number> };

const DB_NAME = 'mealpha-pro-local';
const DB_VERSION = 1;
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
  const db = await openDb();
  const now = Date.now();
  const recordId = id ?? record.id ?? crypto.randomUUID();
  const saved = { ...record, id: recordId, updatedAt: now };
  const tx = db.transaction([entity, 'appMeta'], 'readwrite');
  const metaStore = tx.objectStore('appMeta');
  const tombstoneRequest = metaStore.get('tombstones');
  tombstoneRequest.onsuccess = () => {
    const tombstones = { ...((tombstoneRequest.result?.value ?? {}) as Record<string, number>) };
    delete tombstones[entity + ':' + recordId];
    tx.objectStore(entity).put(saved);
    metaStore.put({ key: 'tombstones', value: tombstones });
  };
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  return recordId;
}

export async function deleteRecord(entity: Entity, id: string) {
  const db = await openDb();
  const tx = db.transaction([entity, 'appMeta'], 'readwrite');
  const metaStore = tx.objectStore('appMeta');
  const tombstoneRequest = metaStore.get('tombstones');
  tombstoneRequest.onsuccess = () => {
    const tombstones = { ...((tombstoneRequest.result?.value ?? {}) as Record<string, number>) };
    tx.objectStore(entity).delete(id);
    tombstones[entity + ':' + id] = Date.now();
    metaStore.put({ key: 'tombstones', value: tombstones });
  };
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function saveSettings(settings: AppSettings) {
  const db = await openDb();
  const tx = db.transaction('appMeta', 'readwrite');
  const metaStore = tx.objectStore('appMeta');
  metaStore.put({ key: 'settings', value: settings });
  metaStore.put({ key: 'settingsUpdatedAt', value: Date.now() });
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function getSnapshot(): Promise<Snapshot> {
  const all = await loadAll();
  const data = {} as Record<Entity, Rec[]>;
  for (const entity of ENTITIES) data[entity] = all[entity];
  return { version: 1, exportedAt: new Date().toISOString(), settingsUpdatedAt: await readMeta('settingsUpdatedAt', 0), data, settings: all.settings ?? { language: 'fa', calendar: 'jalali', currency: 'IRT', exchangeRates: '', monthlyBudget: null }, tombstones: await readMeta('tombstones', {}) };
}

function validateSnapshot(remote: Snapshot) {
  if (!remote || remote.version !== 1 || !remote.data || typeof remote.data !== 'object') {
    throw new Error('Unsupported or invalid MeAlpha backup format.');
  }
  for (const entity of ENTITIES) {
    const records = remote.data[entity];
    if (records !== undefined && !Array.isArray(records)) {
      throw new Error(`Invalid snapshot: ${entity} must be an array.`);
    }
    for (const record of records ?? []) {
      if (!record || typeof record !== 'object' || typeof record.id !== 'string' || !record.id.trim()) {
        throw new Error(`Invalid snapshot: ${entity} contains a record without a valid id.`);
      }
      if (record.updatedAt !== undefined && (!Number.isFinite(Number(record.updatedAt)) || Number(record.updatedAt) < 0)) {
        throw new Error(`Invalid snapshot: ${entity} contains an invalid updatedAt timestamp.`);
      }
    }
  }
  if (remote.tombstones !== undefined) {
    if (!remote.tombstones || typeof remote.tombstones !== 'object' || Array.isArray(remote.tombstones)) {
      throw new Error('Invalid snapshot tombstones.');
    }
    for (const [key, value] of Object.entries(remote.tombstones)) {
      if (!key || !Number.isFinite(Number(value)) || Number(value) < 0) {
        throw new Error('Invalid snapshot tombstone timestamp.');
      }
    }
  }
  if (remote.settings !== undefined && (!remote.settings || typeof remote.settings !== 'object' || Array.isArray(remote.settings))) {
    throw new Error('Invalid snapshot settings.');
  }
}

export async function getPreSyncBackup(): Promise<Snapshot | null> {
  return readMeta<Snapshot | null>('preSyncBackup', null);
}

/**
 * Explicit, destructive restore. The current local state is captured in the same
 * transaction before replacement so a failed restore cannot leave partial data.
 */
export async function restoreSnapshot(snapshot: Snapshot) {
  validateSnapshot(snapshot);
  for (const entity of ENTITIES) {
    if (!Array.isArray(snapshot.data[entity])) {
      throw new Error(`Cannot restore snapshot: missing ${entity} collection.`);
    }
  }

  const db = await openDb();
  const tx = db.transaction([...ENTITIES, 'appMeta'], 'readwrite');
  const completed = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  const metaStore = tx.objectStore('appMeta');
  const recordRequests = ENTITIES.map((entity) => req(tx.objectStore(entity).getAll()));
  const settingsRequest = req(metaStore.get('settings'));
  const settingsTimeRequest = req(metaStore.get('settingsUpdatedAt'));
  const tombstonesRequest = req(metaStore.get('tombstones'));

  try {
    const [records, settingsRow, settingsTimeRow, tombstonesRow] = await Promise.all([
      Promise.all(recordRequests), settingsRequest, settingsTimeRequest, tombstonesRequest,
    ]);
    const currentData = {} as Record<Entity, Rec[]>;
    ENTITIES.forEach((entity, index) => { currentData[entity] = records[index]; });
    const currentSnapshot: Snapshot = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settingsUpdatedAt: Number(settingsTimeRow?.value ?? 0),
      data: currentData,
      settings: (settingsRow?.value ?? {
        language: 'fa', calendar: 'jalali', currency: 'IRT', exchangeRates: '', monthlyBudget: null,
      }) as AppSettings,
      tombstones: { ...((tombstonesRow?.value ?? {}) as Record<string, number>) },
    };

    for (const entity of ENTITIES) {
      const store = tx.objectStore(entity);
      store.clear();
      for (const record of snapshot.data[entity]) store.put(record);
    }
    metaStore.put({ key: 'settings', value: snapshot.settings });
    metaStore.put({ key: 'settingsUpdatedAt', value: Number(snapshot.settingsUpdatedAt ?? 0) });
    metaStore.put({ key: 'tombstones', value: snapshot.tombstones ?? {} });
    metaStore.put({ key: 'preRestoreBackup', value: currentSnapshot });
    await completed;
  } catch (error) {
    try { tx.abort(); } catch { /* transaction may already be inactive */ }
    throw error;
  }
}

/**
 * Atomically merges a validated remote snapshot with the current local database.
 * A recovery snapshot is written in the same transaction before any records change.
 */
export async function mergeSnapshot(remote: Snapshot) {
  validateSnapshot(remote);

  const db = await openDb();
  const stores = [...ENTITIES, 'appMeta'] as const;
  const tx = db.transaction(stores, 'readwrite');
  const completed = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

  const recordRequests = ENTITIES.map((entity) => req(tx.objectStore(entity).getAll()));
  const metaStore = tx.objectStore('appMeta');
  const settingsRequest = req(metaStore.get('settings'));
  const settingsTimeRequest = req(metaStore.get('settingsUpdatedAt'));
  const tombstonesRequest = req(metaStore.get('tombstones'));

  try {
    const [records, settingsRow, settingsTimeRow, tombstonesRow] = await Promise.all([
      Promise.all(recordRequests),
      settingsRequest,
      settingsTimeRequest,
      tombstonesRequest,
    ]);

    const localData = {} as Record<Entity, Rec[]>;
    ENTITIES.forEach((entity, index) => { localData[entity] = records[index]; });
    const localSettings = (settingsRow?.value ?? {
      language: 'fa', calendar: 'jalali', currency: 'IRT', exchangeRates: '', monthlyBudget: null,
    }) as AppSettings;
    const localSettingsTime = Number(settingsTimeRow?.value ?? 0);
    const localTombstones = (tombstonesRow?.value ?? {}) as Record<string, number>;
    const localSnapshot: Snapshot = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settingsUpdatedAt: localSettingsTime,
      data: localData,
      settings: localSettings,
      tombstones: { ...localTombstones },
    };

    const mergedTombstones: Record<string, number> = { ...localTombstones };
    for (const [key, value] of Object.entries(remote.tombstones ?? {})) {
      mergedTombstones[key] = Math.max(Number(mergedTombstones[key] ?? 0), Number(value));
    }

    for (const entity of ENTITIES) {
      const merged = new Map<string, Rec>();
      for (const item of localData[entity]) merged.set(item.id, item);
      for (const item of remote.data[entity] ?? []) {
        const current = merged.get(item.id);
        if (!current || Number(item.updatedAt ?? 0) > Number(current.updatedAt ?? 0)) {
          merged.set(item.id, item);
        }
      }

      const store = tx.objectStore(entity);
      store.clear();
      for (const item of merged.values()) {
        const deletedAt = Number(mergedTombstones[`${entity}:${item.id}`] ?? 0);
        if (deletedAt < Number(item.updatedAt ?? 0)) store.put(item);
      }
    }

    const remoteSettingsTime = Number(
      remote.settingsUpdatedAt ?? (remote.exportedAt ? new Date(remote.exportedAt).getTime() : 0),
    );
    if (Number.isFinite(remoteSettingsTime) && remoteSettingsTime > localSettingsTime && remote.settings) {
      metaStore.put({ key: 'settings', value: remote.settings });
      metaStore.put({ key: 'settingsUpdatedAt', value: remoteSettingsTime });
    }

    // The backup and the merged data commit together: quota or write failures abort both.
    metaStore.put({ key: 'preSyncBackup', value: localSnapshot });
    metaStore.put({ key: 'tombstones', value: mergedTombstones });
    await completed;
  } catch (error) {
    try { tx.abort(); } catch { /* transaction may already be inactive */ }
    throw error;
  }
}
