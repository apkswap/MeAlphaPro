import { useEffect, useState } from 'react';
import { Loader2, Cloud, Download, Upload, CheckCircle2, History } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Textarea } from '@project/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { useStore, Settings } from '../lib/store';
import { Panel, PageHeader } from '../components/ui-bits';
import { prepareGoogleIdentity, syncWithGoogleDrive } from '../lib/googleDriveSync';
import { getSnapshot, getPreSyncBackup, restoreSnapshot } from '../lib/localDb';

export default function SettingsPage() {
  const { t, settings, setLocalSettings } = useStore();
  const [s, setS] = useState<Settings>(settings);
  useEffect(() => setS(settings), [settings]);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!s.currency.trim()) return toast.error(t('currency'));
    setBusy(true);
    try {
      await setLocalSettings({ ...s, currency: s.currency.trim().toUpperCase() });
      toast.success(t('saved'));
    } catch { toast.error(t('error')); }
    setBusy(false);
  };

  const [hasRecoveryBackup, setHasRecoveryBackup] = useState(false);
  useEffect(() => { let active = true; void getPreSyncBackup().then((backup) => { if (active) setHasRecoveryBackup(!!backup); }).catch(() => { if (active) setHasRecoveryBackup(false); }); return () => { active = false; }; }, []);
  const restoreRecoveryBackup = async () => {
    const backup = await getPreSyncBackup();
    if (!backup) { setHasRecoveryBackup(false); return toast.error(settings.language === 'fa' ? 'نسخه بازیابی موجود نیست.' : 'No recovery snapshot is available.'); }
    const message = settings.language === 'fa'
      ? 'این کار اطلاعات فعلی دستگاه را با نسخه قبل از آخرین همگام‌سازی جایگزین می‌کند. قبل از جایگزینی، از وضعیت فعلی نیز نسخه پشتیبان گرفته می‌شود. ادامه می‌دهید؟'
      : 'This replaces current device data with the snapshot from before the last sync. Current data is backed up first. Continue?';
    if (!window.confirm(message)) return;
    setBusy(true);
    try { await restoreSnapshot(backup); toast.success(settings.language === 'fa' ? 'اطلاعات بازیابی شد.' : 'Data restored.'); window.location.reload(); }
    catch (error) { toast.error(error instanceof Error ? error.message : t('error')); }
    finally { setBusy(false); }
  };
  const [syncBusy, setSyncBusy] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [syncResult, setSyncResult] = useState('');
  useEffect(() => {
    let active = true;
    setGoogleReady(false);
    if (!s.googleClientId?.trim()) return () => { active = false; };
    void prepareGoogleIdentity(s.googleClientId)
      .then(() => { if (active) setGoogleReady(true); })
      .catch((error) => {
        if (active) {
          setGoogleReady(false);
          toast.error(error instanceof Error ? error.message : 'Google sign-in could not be initialized.');
        }
      });
    return () => { active = false; };
  }, [settings.googleClientId]);
  const syncGoogle = async () => {
    if (!s.googleClientId?.trim()) return toast.error(settings.language === 'fa' ? 'ابتدا Google OAuth Web Client ID را وارد کنید.' : 'Enter your Google OAuth Web Client ID first.');
    if (s.googleClientId.trim() !== (settings.googleClientId ?? '').trim()) return toast.error(settings.language === 'fa' ? 'ابتدا تنظیمات را ذخیره کنید تا اتصال گوگل آماده شود.' : 'Save settings first so Google sign-in can be prepared.');
    if (!googleReady) return toast.error(settings.language === 'fa' ? 'در حال آماده‌سازی ورود امن گوگل هستیم؛ چند لحظه دیگر تلاش کنید.' : 'Secure Google sign-in is still initializing. Please try again in a moment.');
    setSyncBusy(true); setSyncResult('');
    try {
      await setLocalSettings({ ...s, currency: s.currency.trim().toUpperCase() });
      const result = await syncWithGoogleDrive();
      setSyncResult(result.message);
      toast.success(result.message);
    } catch (error) { toast.error(error instanceof Error ? error.message : t('error')); }
    finally { setSyncBusy(false); }
  };
  const exportBackup = async () => {
    const snapshot = await getSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `mealpha-pro-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
  };
  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed.version !== 1 || !parsed.data) throw new Error('Invalid backup file');
      const { mergeSnapshot } = await import('../lib/localDb'); await mergeSnapshot(parsed);
      toast.success(settings.language === 'fa' ? 'نسخه پشتیبان بازیابی شد.' : 'Backup restored.');
      window.location.reload();
    } catch (error) { toast.error(error instanceof Error ? error.message : t('error')); }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title={t('settings')} />
      <Panel>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label>{t('language')}</Label>
            <Select value={s.language} onValueChange={(v) => set('language', v as Settings['language'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="fa">فارسی</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('calendar')}</Label>
            <Select value={s.calendar} onValueChange={(v) => set('calendar', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="jalali">{t('jalali')}</SelectItem><SelectItem value="gregorian">{t('gregorian')}</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('reportCurrency')}</Label>
            <Input value={s.currency} onChange={(e) => set('currency', e.target.value)} placeholder="IRT, IRR, USD, EUR…" />
          </div>
          <div className="space-y-1.5">
            <Label>{t('monthlyBudget')}</Label>
            <Input type="number" value={s.monthlyBudget ?? ''} onChange={(e) => set('monthlyBudget', e.target.value === '' ? null : Number(e.target.value))} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t('rates')}</Label>
            <Textarea dir="ltr" rows={4} value={s.exchangeRates} onChange={(e) => set('exchangeRates', e.target.value)} placeholder={'USD=600000\nEUR=650000'} className="font-mono" />
            <p className="text-xs text-muted-foreground">{t('ratesHelp')}</p>
          </div>
        </div>
        <Button className="mt-6" onClick={submit} disabled={busy}>{busy && <Loader2 className="h-4 w-4 me-2 animate-spin" />}{t('save')}</Button>
      </Panel>
      <Panel title={settings.language === 'fa' ? 'ذخیره‌سازی و همگام‌سازی' : 'Storage & Sync'} className="mt-5">
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
          <div><div className="font-semibold">{settings.language === 'fa' ? 'حالت آفلاین فعال است' : 'Offline mode is active'}</div><p className="text-sm text-muted-foreground mt-1">{settings.language === 'fa' ? 'اطلاعات روی همین دستگاه ذخیره می‌شوند و برای ثبت، ویرایش و مشاهده به اینترنت نیاز ندارید.' : 'Your data is stored on this device. Creating, editing and viewing records works without internet.'}</p></div>
        </div>
        <div className="mt-5 space-y-2"><Label>Google OAuth Web Client ID</Label><Input dir="ltr" value={s.googleClientId ?? ''} onChange={(e) => set('googleClientId', e.target.value)} placeholder="xxxxx.apps.googleusercontent.com" /><p className="text-xs text-muted-foreground">{settings.language === 'fa' ? 'برای همگام‌سازی، Web Client ID گوگل را وارد کنید. مبدأ وب و شناسه بسته اندروید همراه SHA-1 باید در همان پروژه Google Cloud ثبت شوند و Google Drive API فعال باشد. همگام‌سازی فقط با درخواست شما انجام می‌شود.' : 'Use the Google OAuth Web Client ID. Register this app's web origin and Android package/SHA-1 in the same Google Cloud project, enable Google Drive API, and grant appData access. Sync only runs when you request it.'}</p></div>
        <Button className="mt-4" onClick={syncGoogle} disabled={syncBusy || !googleReady || s.googleClientId.trim() !== (settings.googleClientId ?? '').trim()}><Cloud className="h-4 w-4 me-2" />{syncBusy ? (settings.language === 'fa' ? 'در حال همگام‌سازی…' : 'Syncing…') : !googleReady ? (settings.language === 'fa' ? 'در حال آماده‌سازی گوگل…' : 'Preparing Google…') : (settings.language === 'fa' ? 'همگام‌سازی با حساب گوگل' : 'Sync with Google')}</Button>
        {syncResult && <p className="mt-3 text-sm text-emerald-500">{syncResult}</p>}
        <div className="mt-5 flex flex-wrap gap-2 border-t pt-4"><Button variant="outline" onClick={exportBackup}><Download className="h-4 w-4 me-2" />{settings.language === 'fa' ? 'خروجی پشتیبان' : 'Export backup'}</Button><label className="inline-flex cursor-pointer items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"><Upload className="h-4 w-4 me-2" />{settings.language === 'fa' ? 'بازیابی پشتیبان' : 'Import backup'}<input type="file" accept="application/json,.json" className="hidden" onChange={(e) => void importBackup(e.target.files?.[0])} /></label></div>
        {hasRecoveryBackup && <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="font-semibold text-sm">{settings.language === 'fa' ? 'نسخه بازیابی قبل از همگام‌سازی موجود است' : 'A pre-sync recovery snapshot is available'}</div>
          <p className="mt-1 text-xs text-muted-foreground">{settings.language === 'fa' ? 'در صورت بروز مشکل پس از Sync می‌توانید وضعیت محلی قبل از آن را برگردانید.' : 'If the last sync caused a problem, you can restore the local state from immediately before it.'}</p>
          <Button className="mt-3" variant="outline" onClick={() => void restoreRecoveryBackup()} disabled={busy}><History className="h-4 w-4 me-2" />{settings.language === 'fa' ? 'بازیابی وضعیت قبل از Sync' : 'Restore pre-sync data'}</Button>
        </div>}
      </Panel>
    </div>
  );
}
