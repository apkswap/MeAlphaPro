import { useEffect, useState } from 'react';
import { Loader2, Download, Upload, CheckCircle2, Camera, Cloud } from 'lucide-react';
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
const COLORS = ['#168be5', '#00b8d4', '#1261a0', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

export default function SettingsPage() {
  const { t, settings, setLocalSettings } = useStore();
  const [s, setS] = useState<Settings>(settings);
  useEffect(() => setS(settings), [settings]);
  const [busy, setBusy] = useState(false);
  const [dropboxBusy, setDropboxBusy] = useState(false);
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

  const uploadImage = (file: File | undefined, field: 'avatarDataUrl' | 'coverDataUrl') => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error(settings.language === 'fa' ? 'فقط فایل تصویری انتخاب کنید.' : 'Choose an image file.');
    if (file.size > 5 * 1024 * 1024) return toast.error(settings.language === 'fa' ? 'حجم تصویر نباید بیشتر از ۵ مگابایت باشد.' : 'Image must be 5 MB or smaller.');
    const reader = new FileReader();
    reader.onload = () => set(field, String(reader.result));
    reader.onerror = () => toast.error(t('error'));
    reader.readAsDataURL(file);
  };

  const uploadAvatar = (file?: File) => uploadImage(file, 'avatarDataUrl');
  const uploadCover = (file?: File) => uploadImage(file, 'coverDataUrl');

  const exportBackup = async () => {
    const snapshot = await getSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `mealpha-pro-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
  };
  const redirectUri = () => {
    if (window.location.protocol === 'file:') throw new Error('Dropbox sign-in requires the hosted app URL or a local HTTP origin.');
    return window.location.origin + window.location.pathname;
  };
  const connectDropbox = async () => {
    const appKey = (s.dropboxAppKey || '').trim();
    if (!appKey) return toast.error(fa ? 'ابتدا App Key دراپ‌باکس را وارد کنید.' : 'Enter your Dropbox App Key first.');
    try {
      const bytes = crypto.getRandomValues(new Uint8Array(48));
      const verifier = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      const stateBytes = crypto.getRandomValues(new Uint8Array(16));
      const state = Array.from(stateBytes, b => b.toString(16).padStart(2, '0')).join('');
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
      const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/g, '');
      sessionStorage.setItem('mealpha.dropbox.appKey', appKey);
      sessionStorage.setItem('mealpha.dropbox.verifier', verifier);
      sessionStorage.setItem('mealpha.dropbox.state', state);
      const params = new URLSearchParams({
        client_id: appKey, response_type: 'code', token_access_type: 'offline',
        code_challenge: challenge, code_challenge_method: 'S256',
        redirect_uri: redirectUri(), state
      });
      window.location.assign('https://www.dropbox.com/oauth2/authorize?' + params.toString());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('error'));
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const callbackAppKey = s.dropboxAppKey || sessionStorage.getItem('mealpha.dropbox.appKey') || '';
    if (!code || !callbackAppKey) return;
    const state = params.get('state') || '';
    const expectedState = sessionStorage.getItem('mealpha.dropbox.state') || '';
    const verifier = sessionStorage.getItem('mealpha.dropbox.verifier') || '';
    if (!state || state !== expectedState || !verifier) {
      toast.error(fa ? 'اعتبارسنجی ورود دراپ‌باکس ناموفق بود.' : 'Dropbox sign-in state validation failed.');
      return;
    }
    let cancelled = false;
    (async () => {
      setDropboxBusy(true);
      try {
        const body = new URLSearchParams({
          code, grant_type: 'authorization_code', client_id: callbackAppKey,
          redirect_uri: redirectUri(), code_verifier: verifier
        });
        const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body
        });
        const token = await response.json();
        if (!response.ok) throw new Error(token.error_description || token.error || 'Dropbox token exchange failed');
        const accountResponse = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
          method: 'POST', headers: { Authorization: 'Bearer ' + token.access_token, 'Content-Type': 'application/json' }, body: 'null'
        });
        const account = accountResponse.ok ? await accountResponse.json() : null;
        if (cancelled) return;
        const nextSettings = {
          ...settings, ...s, dropboxAccessToken: token.access_token,
          dropboxRefreshToken: token.refresh_token || s.dropboxRefreshToken || '',
          dropboxExpiresAt: Date.now() + Number(token.expires_in || 14400) * 1000,
          dropboxAccountName: account?.name?.display_name || ''
        };
        setS(nextSettings); setLocalSettings(nextSettings);
        sessionStorage.removeItem('mealpha.dropbox.appKey');
        sessionStorage.removeItem('mealpha.dropbox.verifier');
        sessionStorage.removeItem('mealpha.dropbox.state');
        window.history.replaceState({}, document.title, window.location.pathname);
        toast.success(fa ? 'حساب Dropbox متصل شد.' : 'Dropbox connected.');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('error'));
      } finally { if (!cancelled) setDropboxBusy(false); }
    })();
    return () => { cancelled = true; };
  }, [s.dropboxAppKey]);

  const syncDropbox = async () => {
    setDropboxBusy(true);
    try {
      const appKey = (s.dropboxAppKey || settings.dropboxAppKey || '').trim();
      let accessToken = s.dropboxAccessToken || settings.dropboxAccessToken || '';
      const refreshToken = s.dropboxRefreshToken || settings.dropboxRefreshToken || '';
      if (!appKey || !refreshToken) throw new Error(fa ? 'ابتدا App Key را وارد و Dropbox را متصل کنید.' : 'Enter the App Key and connect Dropbox first.');
      if (!accessToken || Number(s.dropboxExpiresAt || settings.dropboxExpiresAt || 0) < Date.now() + 60000) {
        const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: appKey })
        });
        const token = await response.json();
        if (!response.ok) throw new Error(token.error_description || token.error || 'Dropbox token refresh failed');
        accessToken = token.access_token;
        const refreshed = { ...settings, ...s, dropboxAccessToken: accessToken, dropboxExpiresAt: Date.now() + Number(token.expires_in || 14400) * 1000 };
        setS(refreshed); setLocalSettings(refreshed);
      }
      const path = '/Apps/MeAlphaPro/mealpha-pro-sync.json';
      const download = await fetch('https://content.dropboxapi.com/2/files/download', {
        method: 'POST', headers: { Authorization: 'Bearer ' + accessToken, 'Dropbox-API-Arg': JSON.stringify({ path }) }
      });
      let snapshot;
      if (download.ok) {
        snapshot = JSON.parse(await download.text());
        if (snapshot?.version !== 1 || !snapshot?.data) throw new Error('The Dropbox backup format is invalid.');
        const { mergeSnapshot } = await import('../lib/localDb');
        await mergeSnapshot(snapshot);
      } else if (download.status !== 409) {
        const detail = await download.text();
        throw new Error('Dropbox download failed: ' + detail.slice(0, 240));
      }
      const latest = await getSnapshot();
      const upload = await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + accessToken,
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': JSON.stringify({ path, mode: 'overwrite', autorename: false, mute: true, strict_conflict: false })
        },
        body: JSON.stringify(latest)
      });
      if (!upload.ok) {
        const detail = await upload.text();
        throw new Error('Dropbox upload failed: ' + detail.slice(0, 240));
      }
      toast.success(fa ? 'همگام‌سازی Dropbox انجام شد.' : 'Dropbox sync completed.');
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : t('error'));
    } finally { setDropboxBusy(false); }
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
            <div className="h-24 w-24 rounded-3xl overflow-hidden grid place-items-center text-4xl font-black text-white shadow-xl ring-2 ring-white/15" style={{ background: s.avatarColor || '#168be5' }}>
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
      <Panel title={fa ? 'کاور پروفایل' : 'Profile cover'}>
        <div className="space-y-3">
          <div className="h-36 overflow-hidden rounded-xl border bg-gradient-to-br from-sky-600/40 via-blue-500/20 to-cyan-400/30">
            {s.coverDataUrl && <img src={s.coverDataUrl} alt="Profile cover" className="h-full w-full object-cover" />}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">{fa ? 'انتخاب تصویر کاور' : 'Choose cover image'}<input type="file" accept="image/*" className="hidden" onChange={(e) => uploadCover(e.target.files?.[0])} /></label>
            {s.coverDataUrl && <Button type="button" variant="outline" onClick={() => set('coverDataUrl', '')}>{fa ? 'حذف کاور' : 'Remove cover'}</Button>}
          </div>
          <p className="text-xs text-muted-foreground">{fa ? 'تصویر کاور نباید بیشتر از ۵ مگابایت باشد.' : 'Cover image must be 5 MB or smaller.'}</p>
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
        <div className="mt-4 space-y-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
          <div className="flex items-center gap-2 font-semibold"><Cloud className="h-4 w-4 text-sky-500" />Dropbox</div>
          <p className="text-sm text-muted-foreground">{fa ? 'اطلاعات همچنان ابتدا روی دستگاه ذخیره می‌شود. با فشردن دکمه همگام‌سازی، نسخه ترکیبی داده‌ها در فضای برنامه MeAlpha Pro در Dropbox بارگذاری و دریافت می‌شود.' : 'Your data remains local-first. Manual sync merges the local and Dropbox snapshots, then uploads the merged data to your Dropbox app folder.'}</p>
          <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
            <div className="space-y-1.5"><Label>Dropbox App Key</Label><Input dir="ltr" value={s.dropboxAppKey || ''} onChange={e => set('dropboxAppKey', e.target.value.trim())} placeholder="Enter your Dropbox app key" /></div>
            <Button type="button" variant="outline" onClick={connectDropbox} disabled={dropboxBusy}>{dropboxBusy && <Loader2 className="h-4 w-4 me-2 animate-spin" />}{s.dropboxRefreshToken ? (fa ? 'اتصال مجدد' : 'Reconnect') : (fa ? 'اتصال Dropbox' : 'Connect Dropbox')}</Button>
          </div>
          {s.dropboxRefreshToken && <div className="flex items-center justify-between gap-3 text-xs text-emerald-500"><span>{fa ? 'متصل' : 'Connected'}{s.dropboxAccountName ? ' · ' + s.dropboxAccountName : ''}</span><Button type="button" size="sm" onClick={syncDropbox} disabled={dropboxBusy}>{dropboxBusy && <Loader2 className="h-4 w-4 me-2 animate-spin" />}{fa ? 'همگام‌سازی اکنون' : 'Sync now'}</Button></div>}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4"><Button variant="outline" onClick={exportBackup}><Download className="h-4 w-4 me-2" />{fa ? 'خروجی پشتیبان' : 'Export backup'}</Button><label className="inline-flex cursor-pointer items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"><Upload className="h-4 w-4 me-2" />{fa ? 'بازیابی پشتیبان' : 'Import backup'}<input type="file" accept="application/json,.json" className="hidden" onChange={(e) => void importBackup(e.target.files?.[0])} /></label></div>
      </Panel>
    </div>
  );
}
