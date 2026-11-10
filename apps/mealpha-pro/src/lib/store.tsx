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
  setLocalSettings: (s: Settings) => void;
};
const C = createContext<Ctx>(null as unknown as Ctx);
export const useStore = () => useContext(C);
const DEFAULTS: Settings = { language: 'fa', calendar: 'jalali', currency: 'IRT', exchangeRates: '', monthlyBudget: null , displayName: '', username: '', bio: '', avatarEmoji: 'α', avatarColor: '#168be5', theme: 'dark', colorTheme: 'blue' };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const reload = useCallback(async () => {
    try {
      const d = await loadAll(); setData(d);
      if (d.settings) setSettings({ ...DEFAULTS, ...d.settings });
    } catch (error) {
      console.error('Failed to initialize the local database:', error);
      // Keep the interface usable instead of leaving the app on the loading splash forever.
      // Database writes still report their own errors, so this does not pretend data was saved.
      setData({
        goals: [], tasks: [], habits: [], habitLogs: [], transactions: [],
        accounts: [], paymentReminders: [], customItems: [], assets: [],
        liabilities: [], settings: null,
      } as Data);
      toast.error('Local storage is unavailable. The app opened in temporary view mode; changes may not be saved.');
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
  const setLocalSettings = (next: Settings) => {
    setSettings(next);
    void persistSettings(next).catch((error) => { console.error(error); toast.error(t('error')); });
  };
  return <C.Provider value={{ data, settings, t, reload, save, remove, setLocalSettings }}>{children}</C.Provider>;
}
