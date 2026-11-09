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
  setLocalSettings: (s: Settings) => Promise<void>;
};
const C = createContext<Ctx>(null as unknown as Ctx);
export const useStore = () => useContext(C);
const DEFAULTS: Settings = { language: 'fa', calendar: 'jalali', currency: 'IRT', exchangeRates: '', monthlyBudget: null, googleClientId: '' };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const reload = useCallback(async () => {
    try {
      const d = await loadAll(); setData(d);
      if (d.settings) setSettings({ ...DEFAULTS, ...d.settings });
    } catch (error) { console.error(error); toast.error('Failed to load local data'); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    document.documentElement.lang = settings.language;
    document.documentElement.dir = settings.language === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.classList.add('dark');
  }, [settings.language]);
  const t = useCallback((k: Key) => tr(settings.language, k), [settings.language]);
  const save = async (entity: Entity, record: Rec, id?: string) => {
    try { await saveRecord(entity, record, id); await reload(); return true; }
    catch (error) { console.error(error); toast.error(t('error')); return false; }
  };
  const remove = async (entity: Entity, id: string) => {
    try { await deleteRecord(entity, id); toast.success(t('deleted')); await reload(); }
    catch (error) { console.error(error); toast.error(t('error')); }
  };
  const setLocalSettings = async (next: Settings) => {
    setSettings(next);
    try {
      await persistSettings(next);
    } catch (error) {
      console.error(error);
      toast.error(t('error'));
      throw error;
    }
  };
  return <C.Provider value={{ data, settings, t, reload, save, remove, setLocalSettings }}>{children}</C.Provider>;
}
