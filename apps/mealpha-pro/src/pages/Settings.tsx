import { useEffect, useRef, useState } from 'react';
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
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const AVATARS = ['α', '🌟', '🚀', '🦊', '🐼', '🐺', '🦁', '🦉', '🎯', '💎', '🌙', '🔥'];
const COLORS = ['#168be5', '#00b8d4', '#1261a0', '#10b981', '#f59e0b', '#ef4444', '#64748b'];
const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
const THEMES = [{ id: 'violet', fa: 'بنفش', en: 'Violet', color: '#8b5cf6' }, { id: 'blue', fa: 'آبی', en: 'Blue', color: '#279be8' }, { id: 'green', fa: 'سبز', en: 'Green', color: '#2aa876' }, { id: 'cyan', fa: 'فیروزه‌ای', en: 'Cyan', color: '#06b6d4' }, { id: 'orange', fa: 'نارنجی', en: 'Orange', color: '#f28a35' }, { id: 'pink', fa: 'صورتی', en: 'Pink', color: '#ec4899' }] as const;

export default function SettingsPage() {
  const { t, settings, setLocalSettings } = useStore();
  const [s, setS] = useState<Settings>(settings);
  useEffect(() => setS(settings), [settings]);
  const [busy, setBusy] = useState(false);
  const [dropboxBusy, setDropboxBusy] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
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
    try {
      const snapshot = await getSnapshot();
      const json = JSON.stringify(snapshot, null, 2);
      const fileName = `mealpha-pro-backup-${new Date().toISOString().slice(0,10)}.json`;

      if (Capacitor.isNativePlatform()) {
        const saved = await Filesystem.writeFile({
          path: fileName,
          data: json,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });
        await Share.share({
          title: fa ? 'پشتیبان MeAlpha Pro' : 'MeAlpha Pro backup',
          text: fa ? 'فایل پشتیبان اطلاعات MeAlpha Pro' : 'MeAlpha Pro data backup',
          files: [saved.uri],
          dialogTitle: fa ? 'ذخیره یا ارسال فایل پشتیبان' : 'Save or share backup'
        });
        toast.success(fa ? 'فایل پشتیبان آماده شد.' : 'Backup file is ready.');
        return;
      }

      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      toast.success(fa ? 'دانلود فایل پشتیبان آغاز شد.' : 'Backup download started.');
    } catch (error) {
      console.error('Backup export failed:', error);
      toast.error(error instanceof Error ? error.message : (fa ? 'ساخت فایل پشتیبان ناموفق بود.' : 'Could not create the backup file.'));
    }
  };
  const redirectUri = () => 'http://localhost:4173/oauth/dropbox/callback';

  const pollDropboxCallback = async (state: string) => {
    const deadline = Date.now() + 5 * 60 * 1000;
    while (Date.now() < deadline) {
      const response = await fetch(`http://localhost:4173/oauth/dropbox/result?state=${encodeURIComponent(state)}`);
      if (!response.ok) throw new Error(`Dropbox callback listener unavailable (${response.status}). Restart MeAlpha and try again.`);
      const result = await response.json();
      if (result.status === 'complete') return result as { status: 'complete'; code?: string; error?: string; error_description?: string; state: string };
      await new Promise(resolve => window.setTimeout(resolve, 1000));
    }
    throw new Error('Dropbox sign-in timed out. Please try again.');
  };

  const connectDropbox = async () => {
    const appKey = (s.dropboxAppKey || '').trim();
    if (!appKey) return toast.error(fa ? 'ابتدا App Key دراپ‌باکس را وارد کنید.' : 'Enter your Dropbox App Key first.');
    setDropboxBusy(true);
    const isAndroid = Capacitor.getPlatform() === 'android';
    const oauthRedirectUri = isAndroid
      ? 'https://apkswap.github.io/MeAlphaPro/oauth/dropbox/callback/'
      : redirectUri();
    try {
      const bytes = crypto.getRandomValues(new Uint8Array(48));
      const verifier = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      const stateBytes = crypto.getRandomValues(new Uint8Array(16));
      const state = Array.from(stateBytes, b => b.toString(16).padStart(2, '0')).join('');
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
      const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
      const params = new URLSearchParams({
        client_id: appKey, response_type: 'code', token_access_type: 'offline',
        code_challenge: challenge, code_challenge_method: 'S256',
        redirect_uri: oauthRedirectUri, state
      });

      if (isAndroid) {
        // Persist the PKCE transaction because Android may recreate the WebView
        // while the user is authenticating in the external browser.
        localStorage.setItem('mealpha.dropbox.pending', JSON.stringify({
          appKey, verifier, state, createdAt: Date.now()
        }));
        await Browser.open({ url: 'https://www.dropbox.com/oauth2/authorize?' + params.toString() });
        toast.info(fa ? 'ورود Dropbox را در مرورگر کامل کنید و به برنامه برگردید.' : 'Complete Dropbox sign-in in your browser, then return to MeAlpha Pro.');
        return;
      }

      if (!window.mealphaDesktop?.openExternal) {
        throw new Error('Dropbox desktop sign-in is unavailable. Please install the latest Windows build.');
      }
      sessionStorage.setItem('mealpha.dropbox.appKey', appKey);
      sessionStorage.setItem('mealpha.dropbox.verifier', verifier);
      sessionStorage.setItem('mealpha.dropbox.state', state);
      await window.mealphaDesktop.openExternal('https://www.dropbox.com/oauth2/authorize?' + params.toString());
      const callback = await pollDropboxCallback(state);
      if (callback.state !== state) throw new Error('Dropbox sign-in state validation failed.');
      if (callback.error) throw new Error(callback.error_description || callback.error);
      if (!callback.code) throw new Error('Dropbox did not return an authorization code.');

      const body = new URLSearchParams({
        code: callback.code, grant_type: 'authorization_code', client_id: appKey,
        redirect_uri: oauthRedirectUri, code_verifier: verifier
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
      toast.success(fa ? 'حساب Dropbox متصل شد.' : 'Dropbox connected.');
    } catch (error) {
      localStorage.removeItem('mealpha.dropbox.pending');
      sessionStorage.removeItem('mealpha.dropbox.appKey');
      sessionStorage.removeItem('mealpha.dropbox.verifier');
      sessionStorage.removeItem('mealpha.dropbox.state');
      toast.error(error instanceof Error ? error.message : t('error'));
    } finally {
      setDropboxBusy(false);
    }
  };

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
        const backupBlob = await download.blob();
        if (backupBlob.size > MAX_BACKUP_BYTES) throw new Error('Dropbox backup exceeds the 50 MB safety limit.');
        snapshot = JSON.parse(await backupBlob.text());
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
      if (file.size > MAX_BACKUP_BYTES) throw new Error(fa ? 'حجم فایل پشتیبان نباید بیشتر از ۵۰ مگابایت باشد.' : 'Backup file must be 50 MB or smaller.');
      const parsed = JSON.parse(await file.text());
      if (parsed?.version !== 1 || !parsed?.data || typeof parsed.data !== 'object') {
        throw new Error(fa ? 'فایل انتخاب‌شده، پشتیبان معتبر MeAlpha Pro نیست.' : 'The selected file is not a valid MeAlpha Pro backup.');
      }
      const { mergeSnapshot } = await import('../lib/localDb');
      await mergeSnapshot(parsed);
      toast.success(fa ? 'اطلاعات پشتیبان با داده‌های فعلی ادغام شد.' : 'Backup data was merged with existing data.');
      window.location.reload();
    } catch (error) {
      console.error('Backup import failed:', error);
      toast.error(error instanceof Error ? error.message : (fa ? 'بازیابی پشتیبان ناموفق بود.' : 'Could not restore the backup.'));
    } finally {
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const fa = settings.language === 'fa';
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title={t('settings')} />
      <Panel title={fa ? 'هویت کاربری' : 'User identity'}>
        <div className="relative mb-5 h-36 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/20 via-card to-accent/15">
          {s.coverDataUrl && <img src={s.coverDataUrl} alt="Profile cover" className="absolute inset-0 h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/25 to-transparent" />
          <div className="absolute bottom-4 start-5 flex items-end gap-3"><div className="h-16 w-16 overflow-hidden rounded-2xl border-2 border-background shadow-xl" style={{ background: s.avatarColor || '#168be5' }}>{s.avatarDataUrl ? <img src={s.avatarDataUrl} alt="Avatar" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-3xl text-white">{s.avatarEmoji || 'α'}</div>}</div><div className="pb-1"><div className="font-bold text-lg">{s.displayName || (fa ? 'پروفایل من' : 'My profile')}</div><div className="text-xs text-muted-foreground" dir="ltr">{s.username ? '@'+s.username : 'MeAlpha member'}</div></div></div>
        </div>
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <div className="flex flex-col items-center gap-2">
            <div className="h-24 w-24 rounded-[1.7rem] overflow-hidden grid place-items-center text-4xl font-black text-white shadow-xl ring-2 ring-primary/25" style={{ background: s.avatarColor || '#168be5' }}>
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
          <div className="h-36 overflow-hidden rounded-xl border bg-gradient-to-br from-primary/30 via-card to-accent/20">
            {s.coverDataUrl && <img src={s.coverDataUrl} alt="Profile cover" className="h-full w-full object-cover" />}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">{fa ? 'انتخاب تصویر کاور' : 'Choose cover image'}<input type="file" accept="image/*" className="hidden" onChange={(e) => uploadCover(e.target.files?.[0])} /></label>
            {s.coverDataUrl && <Button type="button" variant="outline" onClick={() => set('coverDataUrl', '')}>{fa ? 'حذف کاور' : 'Remove cover'}</Button>}
          </div>
          <p className="text-xs text-muted-foreground">{fa ? 'تصویر کاور نباید بیشتر از ۵ مگابایت باشد.' : 'Cover image must be 5 MB or smaller.'}</p>
        </div>
      </Panel>
      <Panel title={fa ? 'ظاهر و شخصی‌سازی' : 'Appearance & personalization'}>
        <div className="space-y-4">
          <div><div className="flex items-center justify-between gap-2"><Label>{fa ? 'رنگ اصلی برنامه' : 'Accent color'}</Label><span className="text-[10px] text-muted-foreground">{fa ? 'در هر دو حالت روز و شب حفظ می‌شود' : 'Persists in both light and dark mode'}</span></div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{THEMES.map((theme) => <button key={theme.id} type="button" aria-pressed={s.colorTheme === theme.id} onClick={() => set('colorTheme', theme.id as Settings['colorTheme'])} className={`flex items-center gap-3 rounded-xl border p-3 text-start transition-all ${s.colorTheme === theme.id ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}><span className="h-7 w-7 shrink-0 rounded-full shadow-sm" style={{ background: theme.color }} /><span className="text-sm font-medium">{fa ? theme.fa : theme.en}</span>{s.colorTheme === theme.id && <CheckCircle2 className="ms-auto h-4 w-4 text-primary" />}</button>)}</div></div>
          <div className="space-y-1.5"><Label>{fa ? 'حالت نمایش' : 'Appearance mode'}</Label><Select value={s.theme || 'dark'} onValueChange={(v) => set('theme', v as Settings['theme'])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="dark">{fa ? 'تیره' : 'Dark'}</SelectItem><SelectItem value="light">{fa ? 'روشن' : 'Light'}</SelectItem></SelectContent></Select></div>
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
        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={() => void exportBackup()}><Download className="h-4 w-4 me-2" />{fa ? 'خروجی پشتیبان' : 'Export backup'}</Button><Button type="button" variant="outline" onClick={() => importInputRef.current?.click()}><Upload className="h-4 w-4 me-2" />{fa ? 'انتخاب فایل پشتیبان' : 'Choose backup file'}</Button><input ref={importInputRef} type="file" accept=".json,application/json" className="sr-only" tabIndex={-1} aria-label={fa ? 'انتخاب فایل پشتیبان' : 'Choose backup file'} onChange={(e) => void importBackup(e.target.files?.[0])} /></div>
      </Panel>
    </div>
  );
}
