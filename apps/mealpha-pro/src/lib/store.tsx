import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { toast } from 'sonner';
import { Lang, Key, tr } from './i18n';
import { AppSettings, deleteRecord, Entity, loadAll, Rec, saveRecord, saveSettings as persistSettings } from './localDb';

export type { Rec, Entity };
export type Settings = AppSettings;
type Data = Awaited<ReturnType<typeof loadAll>>;
type Ctx = {
  data: Data | null; settings: Settings; t: (k: Key) => string;
  reload: () => Promise<void>;
  save: (entity: Entity, record: Rec, id?: string) => Promise<boolean>;
  remove: (entity: Entity, id: string) => Promise<void>;
  setLocalSettings: (s: Settings) => Promise<boolean>;
};
const C = createContext<Ctx>(null as unknown as Ctx);
export const useStore = () => useContext(C);
const DEFAULTS: Settings = { language: 'fa', calendar: 'jalali', currency: 'IRT', exchangeRates: '', monthlyBudget: null , displayName: '', username: '', bio: '', avatarEmoji: 'α', avatarColor: '#168be5', theme: 'dark', colorTheme: 'blue' };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const reload = useCallback(async () => {
    let timedOut = false;
    // A stalled IndexedDB open must never leave the desktop app on an endless blank/loading screen.
    const timeout = window.setTimeout(() => {
      timedOut = true;
      setData({
        goals: [], tasks: [], habits: [], habitLogs: [], transactions: [],
        accounts: [], paymentReminders: [], customItems: [], assets: [],
        liabilities: [], settings: null,
      } as Data);
      toast.error('Local storage is taking too long. MeAlpha opened in temporary view; your existing data has not been deleted.');
    }, 12000);
    try {
      const d = await loadAll();
      setData(d);
      if (d.settings) setSettings({ ...DEFAULTS, ...d.settings });
    } catch (error) {
      console.error('Failed to initialize the local database:', error);
      setData({
        goals: [], tasks: [], habits: [], habitLogs: [], transactions: [],
        accounts: [], paymentReminders: [], customItems: [], assets: [],
        liabilities: [], settings: null,
      } as Data);
      if (!timedOut) toast.error('Local storage is unavailable. MeAlpha opened in temporary view mode; changes may not be saved.');
    } finally {
      window.clearTimeout(timeout);
    }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    document.documentElement.lang = settings.language;
    document.documentElement.dir = settings.language === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.classList.toggle('dark', settings.theme !== 'light');
    document.documentElement.dataset.colorTheme = settings.colorTheme || 'blue';
  }, [settings.language, settings.theme, settings.colorTheme]);
  const t = useCallback((k: Key) => tr(settings.language, k), [settings.language]);
  const save = async (entity: Entity, record: Rec, id?: string) => {
    try { await saveRecord(entity, record, id); await reload(); return true; }
    catch (error) { console.error(error); toast.error(t('error')); return false; }
  };
  const remove = async (entity: Entity, id: string) => {
    try { await deleteRecord(entity, id); toast.success(t('deleted')); await reload(); }
    catch (error) { console.error(error); toast.error(t('error')); }
  };
  const setLocalSettings = useCallback(async (next: Settings): Promise<boolean> => {
    try {
      await persistSettings(next);
      setSettings(next);
      return true;
    } catch (error) {
      console.error(error);
      toast.error(t('error'));
      return false;
    }
  }, [t]);
  return <C.Provider value={{ data, settings, t, reload, save, remove, setLocalSettings }}>{children}</C.Provider>;
}
