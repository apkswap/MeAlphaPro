import { useEffect, useState } from 'react';
import { Loader2, Download, Upload, CheckCircle2, Camera, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Textarea } from '@project/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { useStore, Settings } from '../lib/store';
import { Panel, PageHeader } from '../components/ui-bits';
import { getSnapshot } from '../lib/localDb';

const AVATARS = ['α', '🌟', '🚀', '🦊', '🐼', '🐺', '🦁', '🦉', '🎯', '💎', '🌙', '🔥'];
const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#64748b'];

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
      setLocalSettings({ ...s, currency: s.currency.trim().toUpperCase() });
      toast.success(t('saved'));
    } catch { toast.error(t('error')); }
    finally { setBusy(false); }
  };

  const uploadAvatar = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error(settings.language === 'fa' ? 'فقط فایل تصویری انتخاب کنید.' : 'Choose an image file.');
    if (file.size > 1024 * 1024) return toast.error(settings.language === 'fa' ? 'حجم تصویر باید کمتر از ۱ مگابایت باشد.' : 'Image must be under 1 MB.');
    const reader = new FileReader();
    reader.onload = () => set('avatarDataUrl', String(reader.result));
    reader.onerror = () => toast.error(t('error'));
    reader.readAsDataURL(file);
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

  const fa = settings.language === 'fa';
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title={t('settings')} />
      <Panel title={fa ? 'هویت کاربری' : 'User identity'}>
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <div className="flex flex-col items-center gap-2">
            <div className="h-24 w-24 rounded-3xl overflow-hidden grid place-items-center text-4xl font-black text-white shadow-xl ring-2 ring-white/15" style={{ background: s.avatarColor || '#8b5cf6' }}>
              {s.avatarDataUrl ? <img src={s.avatarDataUrl} alt="Avatar" className="h-full w-full object-cover" /> : (s.avatarEmoji || 'α')}
            </div>
            <label className="cursor-pointer inline-flex items-center gap-2 text-xs text-primary hover:underline"><Camera className="h-4 w-4" />{fa ? 'آپلود عکس' : 'Upload photo'}<input type="file" accept="image/*" className="hidden" onChange={(e) => uploadAvatar(e.target.files?.[0])} /></label>
            {s.avatarDataUrl && <button className="text-xs text-destructive" onClick={() => set('avatarDataUrl', '')}>{fa ? 'حذف عکس' : 'Remove photo'}</button>}
          </div>
          <div className="flex-1 w-full space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>{fa ? 'نام نمایشی' : 'Display name'}</Label><Input value={s.displayName || ''} onChange={(e) => set('displayName', e.target.value)} placeholder={fa ? 'نام شما' : 'Your name'} /></div>
              <div className="space-y-1.5"><Label>{fa ? 'نام کاربری' : 'Username'}</Label><Input dir="ltr" value={s.username || ''} onChange={(e) => set('username', e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ''))} placeholder="username" /></div>
            </div>
            <div className="space-y-1.5"><Label>{fa ? 'بیوگرافی' : 'Bio'}</Label><Textarea rows={3} maxLength={240} value={s.bio || ''} onChange={(e) => set('bio', e.target.value)} placeholder={fa ? 'چند خط درباره خودتان...' : 'A few words about you...'} /><p className="text-xs text-muted-foreground text-end">{(s.bio || '').length}/240</p></div>
            <div className="space-y-2"><Label>{fa ? 'آواتار آماده' : 'Avatar choices'}</Label><div className="flex flex-wrap gap-2">{AVATARS.map((a) => <button key={a} type="button" onClick={() => { set('avatarEmoji', a); set('avatarDataUrl', ''); }} className={`h-10 w-10 rounded-xl border text-xl ${s.avatarEmoji === a && !s.avatarDataUrl ? 'border-primary bg-primary/15' : 'border-border'}`}>{a}</button>)}</div></div>
            <div className="space-y-2"><Label>{fa ? 'رنگ آواتار' : 'Avatar color'}</Label><div className="flex gap-2">{COLORS.map((c) => <button key={c} type="button" aria-label={c} onClick={() => set('avatarColor', c)} className={`h-7 w-7 rounded-full border-2 ${s.avatarColor === c ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ background: c }} />)}</div></div>
          </div>
        </div>
      </Panel>
      <Panel title={fa ? 'تنظیمات عمومی' : 'General settings'}>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="space-y-1.5"><Label>{t('language')}</Label><Select value={s.language} onValueChange={(v) => set('language', v as Settings['language'])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fa">فارسی</SelectItem><SelectItem value="en">English</SelectItem></SelectContent></Select></div>
          <div className="space-y-1.5"><Label>{t('calendar')}</Label><Select value={s.calendar} onValueChange={(v) => set('calendar', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="jalali">{t('jalali')}</SelectItem><SelectItem value="gregorian">{t('gregorian')}</SelectItem></SelectContent></Select></div>
          <div className="space-y-1.5"><Label>{t('reportCurrency')}</Label><Input value={s.currency} onChange={(e) => set('currency', e.target.value)} placeholder="IRT, IRR, USD, EUR…" /></div>
          <div className="space-y-1.5"><Label>{t('monthlyBudget')}</Label><Input type="number" value={s.monthlyBudget ?? ''} onChange={(e) => set('monthlyBudget', e.target.value === '' ? null : Number(e.target.value))} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>{t('rates')}</Label><Textarea dir="ltr" rows={4} value={s.exchangeRates} onChange={(e) => set('exchangeRates', e.target.value)} placeholder={'USD=600000\\nEUR=650000'} className="font-mono" /><p className="text-xs text-muted-foreground">{t('ratesHelp')}</p></div>
        </div>
        <Button className="mt-6" onClick={submit} disabled={busy}>{busy && <Loader2 className="h-4 w-4 me-2 animate-spin" />}{t('save')}</Button>
      </Panel>
      <Panel title={fa ? 'حریم خصوصی و نگهداری داده' : 'Privacy & data storage'}>
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
          <div><div className="font-semibold">{fa ? 'ذخیره‌سازی محلی و آفلاین' : 'Local, offline storage'}</div><p className="text-sm text-muted-foreground mt-1">{fa ? 'اطلاعات در پایگاه داده محلی همین دستگاه ذخیره می‌شوند. برای ثبت، ویرایش و مشاهده اطلاعات اینترنت لازم نیست و هیچ همگام‌سازی ابری خودکاری انجام نمی‌شود.' : 'Your data stays in this device’s local database. No internet is needed to create, edit or view records, and no cloud sync runs automatically.'}</p></div>
        </div>
        <p className="text-sm text-muted-foreground mt-4">{fa ? 'برای انتقال دستی اطلاعات بین دستگاه‌ها از فایل پشتیبان رمزگذاری‌نشده JSON استفاده کنید و آن را در محل امن نگه دارید.' : 'For manual device-to-device transfer, use a JSON backup file and keep it in a secure location.'}</p>
        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4"><Button variant="outline" onClick={exportBackup}><Download className="h-4 w-4 me-2" />{fa ? 'خروجی پشتیبان' : 'Export backup'}</Button><label className="inline-flex cursor-pointer items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"><Upload className="h-4 w-4 me-2" />{fa ? 'بازیابی پشتیبان' : 'Import backup'}<input type="file" accept="application/json,.json" className="hidden" onChange={(e) => void importBackup(e.target.files?.[0])} /></label></div>
      </Panel>
    </div>
  );
}
