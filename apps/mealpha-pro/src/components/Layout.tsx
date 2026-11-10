import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Target, ListChecks, Repeat, Timer, Receipt, Landmark, Sparkles, Settings, Cloud, CloudOff, Languages, Layers3, Sun, Moon, Wifi, WifiOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { cn } from '@project/components/lib/utils';
import { useStore } from '../lib/store';
import { Key } from '../lib/i18n';

const NAV: { to: string; k: Key; icon: typeof Target }[] = [
  { to: '/', k: 'dashboard', icon: LayoutDashboard },
  { to: '/goals', k: 'goals', icon: Target },
  { to: '/tasks', k: 'tasks', icon: ListChecks },
  { to: '/habits', k: 'habits', icon: Repeat },
  { to: '/focus', k: 'focus', icon: Timer },
  { to: '/transactions', k: 'finance', icon: Receipt },
  { to: '/wealth', k: 'wealth', icon: Landmark },
  { to: '/insights', k: 'insights', icon: Sparkles },
  { to: '/settings', k: 'settings', icon: Settings },
  { to: '/workspace', k: 'workspace', icon: Layers3 },
];

type DropboxStatus = 'disconnected' | 'checking' | 'connected' | 'offline' | 'error' | 'reauth' | 'needsSetup';

export default function Layout() {
  const { t, settings, setLocalSettings } = useStore();
  const [networkOnline, setNetworkOnline] = useState(() => navigator.onLine);
  const [dropboxStatus, setDropboxStatus] = useState<DropboxStatus>(settings.dropboxRefreshToken ? 'checking' : 'disconnected');
  const toggleTheme = () => setLocalSettings({ ...settings, theme: settings.theme === 'light' ? 'dark' : 'light' });
  const toggleLang = () => {
    const s = { ...settings, language: settings.language === 'fa' ? 'en' as const : 'fa' as const };
    setLocalSettings(s);
  };
  const link = ({ isActive }: { isActive: boolean }) =>
    cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
      isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary');

  const appKey = settings.dropboxAppKey || '';
  const accessToken = settings.dropboxAccessToken || '';
  const refreshToken = settings.dropboxRefreshToken || '';
  const expiresAt = Number(settings.dropboxExpiresAt || 0);
  const accountName = settings.dropboxAccountName || '';

  useEffect(() => {
    let active = true;
    let checking = false;
    let currentAccessToken = accessToken;
    let currentExpiresAt = expiresAt;

    const checkDropbox = async () => {
      if (!refreshToken) {
        if (active) setDropboxStatus('disconnected');
        return;
      }
      if (!navigator.onLine) {
        if (active) setDropboxStatus('offline');
        return;
      }
      if (checking) return;
      checking = true;
      if (active) setDropboxStatus('checking');
      try {
        if (!currentAccessToken || currentExpiresAt <= Date.now() + 60000) {
          if (!appKey) {
            if (active) setDropboxStatus('needsSetup');
            return;
          }
          const tokenResponse = await fetch('https://api.dropboxapi.com/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: appKey })
          });
          const token = await tokenResponse.json();
          if (!tokenResponse.ok) {
            if (token.error === 'invalid_grant') {
              if (active) setDropboxStatus('reauth');
              return;
            }
            throw new Error(token.error_description || token.error || 'Dropbox token refresh failed');
          }
          currentAccessToken = token.access_token;
          currentExpiresAt = Date.now() + Number(token.expires_in || 14400) * 1000;
        }

        const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + currentAccessToken, 'Content-Type': 'application/json' },
          body: 'null'
        });
        if (response.status === 401) {
          if (active) setDropboxStatus('reauth');
          return;
        }
        if (!response.ok) throw new Error('Dropbox account verification failed');
        await response.json();
        if (active) setDropboxStatus('connected');
      } catch (error) {
        console.warn('Dropbox connection status check failed:', error);
        if (active) setDropboxStatus(navigator.onLine ? 'error' : 'offline');
      } finally {
        checking = false;
      }
    };

    const onOnline = () => { setNetworkOnline(true); void checkDropbox(); };
    const onOffline = () => {
      setNetworkOnline(false);
      setDropboxStatus(refreshToken ? 'offline' : 'disconnected');
    };
    const onFocus = () => void checkDropbox();

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('focus', onFocus);
    void checkDropbox();
    const interval = window.setInterval(() => void checkDropbox(), 180000);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('focus', onFocus);
    };
  }, [appKey, accessToken, refreshToken, expiresAt]);

  const statusCopy: Record<DropboxStatus, { label: string; detail: string; className: string }> = {
    disconnected: {
      label: settings.language === 'fa' ? 'Dropbox متصل نیست' : 'Dropbox not connected',
      detail: settings.language === 'fa' ? 'اطلاعات روی همین دستگاه امن می‌ماند' : 'Your data stays safely on this device',
      className: 'text-muted-foreground'
    },
    checking: {
      label: settings.language === 'fa' ? 'در حال بررسی اتصال' : 'Checking connection',
      detail: settings.language === 'fa' ? 'در حال اعتبارسنجی حساب Dropbox' : 'Verifying your Dropbox account',
      className: 'text-primary'
    },
    connected: {
      label: settings.language === 'fa' ? 'Dropbox متصل است' : 'Dropbox connected',
      detail: accountName || (settings.language === 'fa' ? 'حساب آماده همگام‌سازی است' : 'Account is ready to sync'),
      className: 'text-emerald-500'
    },
    offline: {
      label: settings.language === 'fa' ? 'Dropbox در حالت آفلاین' : 'Dropbox is offline',
      detail: settings.language === 'fa' ? 'پس از بازگشت شبکه دوباره بررسی می‌شود' : 'Will reconnect when the network returns',
      className: 'text-amber-500'
    },
    error: {
      label: settings.language === 'fa' ? 'خطا در بررسی Dropbox' : 'Dropbox check failed',
      detail: settings.language === 'fa' ? 'برای بررسی دوباره برنامه را باز نگه دارید' : 'Keep the app open to retry',
      className: 'text-destructive'
    },
    reauth: {
      label: settings.language === 'fa' ? 'نیاز به اتصال مجدد Dropbox' : 'Reconnect Dropbox',
      detail: settings.language === 'fa' ? 'مجوز حساب معتبر نیست' : 'Dropbox authorization is no longer valid',
      className: 'text-amber-500'
    },
    needsSetup: {
      label: settings.language === 'fa' ? 'تنظیمات Dropbox ناقص است' : 'Dropbox setup incomplete',
      detail: settings.language === 'fa' ? 'App Key را در تنظیمات بررسی کنید' : 'Check the App Key in Settings',
      className: 'text-amber-500'
    }
  };
  const currentStatus = statusCopy[dropboxStatus];
  const StatusIcon = dropboxStatus === 'connected' ? CheckCircle2 : dropboxStatus === 'checking' ? Loader2 : dropboxStatus === 'offline' || dropboxStatus === 'disconnected' ? CloudOff : AlertCircle;

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-60 md:h-screen md:sticky md:top-0 border-b md:border-b-0 md:border-e bg-[hsl(var(--sidebar-background))]/80 backdrop-blur flex md:flex-col">
        <div className="p-4 md:p-5 flex items-center gap-3 shrink-0">
          <div className="h-16 w-16 shrink-0 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 to-accent/10 p-0.5 shadow-lg shadow-primary/10">
            <img src="/mealpha-infinity.png" alt="MeAlpha" className="h-full w-full object-contain" />
          </div>
          <div className="hidden md:block min-w-0">
            <div className="font-extrabold leading-tight">MeAlpha</div>
            <div className="text-[10px] text-muted-foreground">{t('appTagline')}</div>
          </div>
        </div>
        <nav className="flex md:flex-col gap-1 px-2 md:px-3 overflow-x-auto md:overflow-visible flex-1 items-center md:items-stretch">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={link}>
              <n.icon className="h-4 w-4 shrink-0" /><span className="hidden lg:inline md:inline">{t(n.k)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-2 md:p-3 flex md:flex-col gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="justify-start gap-2" onClick={toggleTheme}>{settings.theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}<span className="hidden md:inline">{settings.theme === 'light' ? (settings.language === 'fa' ? 'حالت تاریک' : 'Dark mode') : (settings.language === 'fa' ? 'حالت روشن' : 'Light mode')}</span></Button>
          <Button variant="ghost" size="sm" className="justify-start gap-2" onClick={toggleLang}><Languages className="h-4 w-4" /><span className="hidden md:inline">{settings.language === 'fa' ? 'English' : 'فارسی'}</span></Button>

          <div className="hidden md:block mx-1 mt-2 rounded-xl border border-border/70 bg-card/65 p-3 shadow-sm backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{settings.language === 'fa' ? 'وضعیت اتصال' : 'Connection status'}</span>
              <span className={cn('flex items-center gap-1 text-[10px]', networkOnline ? 'text-emerald-500' : 'text-amber-500')}>
                {networkOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {networkOnline ? (settings.language === 'fa' ? 'شبکه در دسترس' : 'Network available') : (settings.language === 'fa' ? 'بدون شبکه' : 'Network offline')}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary/80', currentStatus.className)}>
                <StatusIcon className={cn('h-[18px] w-[18px]', dropboxStatus === 'checking' && 'animate-spin')} />
              </div>
              <div className="min-w-0 flex-1">
                <div className={cn('truncate text-xs font-semibold', currentStatus.className)}>{currentStatus.label}</div>
                <div className="truncate text-[10px] text-muted-foreground">{currentStatus.detail}</div>
              </div>
              <NavLink to="/settings" aria-label={settings.language === 'fa' ? 'تنظیمات Dropbox' : 'Dropbox settings'} title={settings.language === 'fa' ? 'تنظیمات Dropbox' : 'Dropbox settings'} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                <Settings className="h-4 w-4" />
              </NavLink>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
              <span>{settings.language === 'fa' ? 'ذخیره‌سازی محلی فعال' : 'Local storage active'}</span>
              <span className="flex items-center gap-1"><Cloud className="h-3 w-3" />Dropbox Sync</span>
            </div>
          </div>

          <NavLink to="/settings" className="md:hidden flex items-center justify-center rounded-lg p-2 text-muted-foreground" aria-label="Dropbox status" title={currentStatus.label}>
            <StatusIcon className={cn('h-4 w-4', currentStatus.className, dropboxStatus === 'checking' && 'animate-spin')} />
          </NavLink>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto"><Outlet /></main>
    </div>
  );
}
