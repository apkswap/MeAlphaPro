import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Target, ListChecks, Repeat, Timer, Receipt, Landmark, Sparkles, Settings, Languages, Layers3, Sun, Moon, Bell, Cloud, X, UserRound, ChevronLeft, CalendarClock } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { cn } from '@project/components/lib/utils';
import { useStore } from '../lib/store';
import { Key } from '../lib/i18n';
import { isoOf, todayISO } from '../lib/analytics';
import GlobalSearch from './GlobalSearch';

const NAV: { to: string; k: Key; icon: typeof Target; group: 'main' | 'manage' | 'system' }[] = [
  { to: '/', k: 'dashboard', icon: LayoutDashboard, group: 'main' },
  { to: '/goals', k: 'goals', icon: Target, group: 'manage' },
  { to: '/tasks', k: 'tasks', icon: ListChecks, group: 'manage' },
  { to: '/habits', k: 'habits', icon: Repeat, group: 'manage' },
  { to: '/focus', k: 'focus', icon: Timer, group: 'manage' },
  { to: '/transactions', k: 'finance', icon: Receipt, group: 'manage' },
  { to: '/wealth', k: 'wealth', icon: Landmark, group: 'manage' },
  { to: '/insights', k: 'insights', icon: Sparkles, group: 'manage' },
  { to: '/workspace', k: 'workspace', icon: Layers3, group: 'system' },
  { to: '/settings', k: 'settings', icon: Settings, group: 'system' },
];
 

export default function Layout() {
  const { t, settings, setLocalSettings, data } = useStore();
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [activePopover, setActivePopover] = useState<'notifications' | 'profile' | null>(null);
  const location = useLocation();
  useEffect(() => {
    let disposed = false;
    let timeoutId: number | undefined;
    let intervalId: number | undefined;
    let controller: AbortController | undefined;
    const checkInternet = async () => {
      if (!navigator.onLine) { setOnline(false); return; }
      controller?.abort();
      controller = new AbortController();
      timeoutId = window.setTimeout(() => controller?.abort(), 5000);
      try {
        await fetch('https://www.gstatic.com/generate_204', {
          method: 'GET', mode: 'no-cors', cache: 'no-store', signal: controller.signal,
        });
        if (!disposed) setOnline(true);
      } catch {
        if (!disposed) setOnline(false);
      } finally {
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      }
    };
    const onOnline = () => { void checkInternet(); };
    const onOffline = () => { controller?.abort(); setOnline(false); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    void checkInternet();
    intervalId = window.setInterval(() => { void checkInternet(); }, 30000);
    return () => {
      disposed = true;
      controller?.abort();
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);
  useEffect(() => { setActivePopover(null); }, [location.pathname]);
  const toggleTheme = () => setLocalSettings({ ...settings, theme: settings.theme === 'light' ? 'dark' : 'light' });
  const toggleLang = () => setLocalSettings({ ...settings, language: settings.language === 'fa' ? 'en' : 'fa' });
  const fa = settings.language === 'fa';
  const dropboxConnected = Boolean(settings.dropboxRefreshToken || settings.dropboxAccessToken);
  const today = todayISO();
  const notifications = useMemo(() => {
    if (!data) return [];
    const taskItems = data.tasks
      .filter((task: any) => task.status !== 'Done' && task.dueDate && task.dueDate <= today)
      .map((task: any) => ({
        id: `task:${task.id}`, title: task.title || (fa ? 'کار بدون عنوان' : 'Untitled task'),
        detail: task.dueDate < today ? (fa ? 'کار عقب‌افتاده' : 'Overdue task') : (fa ? 'موعد امروز' : 'Due today'),
        to: '/tasks', overdue: task.dueDate < today,
      }));
    const reminderItems = data.paymentReminders
      .filter((reminder: any) => reminder.status !== 'Paid' && reminder.dueDate)
      .filter((reminder: any) => {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() + Math.max(0, Number(reminder.remindDaysBefore) || 0));
        return reminder.dueDate <= isoOf(threshold);
      })
      .map((reminder: any) => ({
        id: `payment:${reminder.id}`, title: reminder.description || (fa ? 'پرداخت بدون عنوان' : 'Untitled payment'),
        detail: reminder.dueDate < today ? (fa ? 'پرداخت معوق' : 'Overdue payment') : (fa ? 'یادآوری پرداخت' : 'Payment reminder'),
        to: '/transactions', overdue: reminder.dueDate < today,
      }));
    return [...reminderItems, ...taskItems].slice(0, 8);
  }, [data, today, fa]);
  const groups = [
    { id: 'main', label: fa ? 'نمای کلی' : 'OVERVIEW' },
    { id: 'manage', label: fa ? 'مدیریت زندگی' : 'LIFE MANAGEMENT' },
    { id: 'system', label: fa ? 'فضای کار' : 'WORKSPACE' },
  ] as const;
  const navLink = ({ isActive }: { isActive: boolean }) => cn(
    'group flex min-h-11 items-center justify-center gap-3 rounded-2xl px-0 py-2.5 text-[13px] font-medium transition-all duration-200 group-hover/panel:justify-start group-hover/panel:px-3',
    isActive ? 'bg-gradient-to-r from-sky-300/25 to-indigo-400/20 text-white shadow-[0_8px_28px_-12px_rgba(56,189,248,.65)] ring-1 ring-sky-200/25' : 'text-slate-300/75 hover:bg-white/10 hover:text-white'
  );
  const navItems = () => groups.map(group => (
    <div key={group.id} className="mb-5">
      <div className="h-2 overflow-hidden whitespace-nowrap px-3 pb-2 text-[9px] font-bold tracking-[.16em] text-sky-200/65 opacity-0 transition-opacity group-hover/panel:h-auto group-hover/panel:opacity-100">{group.label}</div>
      <div className="space-y-1">
        {NAV.filter(n => n.group === group.id).map(n => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={navLink}>
            <n.icon className="h-[17px] w-[17px] shrink-0" />
            <span className="truncate opacity-0 transition-opacity duration-200 group-hover/panel:opacity-100">{t(n.k)}</span>
          </NavLink>
        ))}
      </div>
    </div>
  ));
  const profileLabel = settings.displayName || settings.username || (fa ? 'پروفایل من' : 'My profile');
  return (
    <div className="mealpha-glass-shell min-h-screen bg-background text-foreground md:flex">
      <aside className="relative hidden md:sticky md:top-0 md:block md:h-screen md:w-[88px] md:shrink-0"><div className="group/panel absolute inset-y-4 start-3 z-50 flex w-[64px] flex-col overflow-hidden rounded-[28px] border border-white/15 bg-slate-950/60 px-2 py-3 text-white shadow-[0_18px_70px_-22px_rgba(0,0,0,.85)] backdrop-blur-2xl transition-[width,background,box-shadow] duration-300 ease-out hover:w-[252px] hover:bg-slate-950/85 hover:shadow-[0_24px_80px_-20px_rgba(15,23,42,.95)]">
        <NavLink to="/" className="mb-7 flex min-h-12 items-center gap-3 px-1">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-300 via-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/35 ring-1 ring-white/25"><img src="/mealpha.svg" alt="MeAlpha" className="h-8 w-8 object-contain" /></div>
          <div className="min-w-0 whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover/panel:opacity-100"><div className="text-[15px] font-black tracking-tight text-white">MeAlpha <span className="text-sky-300">Pro</span></div><div className="mt-0.5 text-[9px] font-semibold tracking-[.18em] text-slate-400">PERSONAL COMMAND CENTER</div></div>
        </NavLink>
        <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-0.5 pt-1 group-hover/panel:pe-10">{navItems()}</nav>
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.06] p-2">
          <div className="mb-2 flex items-center gap-2 whitespace-nowrap text-[11px] font-semibold text-slate-200"><span className={cn('h-2 w-2 rounded-full', online ? 'bg-emerald-500' : 'bg-amber-500')} />{online ? (fa ? 'اینترنت متصل' : 'Internet connected') : (fa ? 'بدون اینترنت' : 'Offline')}</div>
          <div className="mb-3 flex min-w-0 items-center gap-2 whitespace-nowrap text-[11px] opacity-0 transition-opacity group-hover/panel:opacity-100" role="status" aria-live="polite">
            <Cloud className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className={cn('h-2 w-2 shrink-0 rounded-full', dropboxConnected ? 'bg-emerald-500' : 'bg-muted-foreground/50')} />
            <span className={cn('truncate font-semibold', dropboxConnected ? 'text-[hsl(var(--success))]' : 'text-muted-foreground')}>{dropboxConnected ? (fa ? 'حساب Dropbox متصل' : 'Dropbox account linked') : (fa ? 'Dropbox متصل نیست' : 'Dropbox not connected')}</span>
            {dropboxConnected && settings.dropboxAccountName && <span className="ms-auto max-w-20 truncate text-[9px] text-muted-foreground">{settings.dropboxAccountName}</span>}
          </div>
          <div className="flex items-center justify-center gap-2 group-hover/panel:justify-between">
            <Button variant="ghost" size="sm" className="h-9 min-w-9 rounded-xl px-2 text-xs text-slate-200 hover:bg-white/10 hover:text-white" onClick={toggleTheme}>{settings.theme === 'light' ? <Moon className="me-1 h-4 w-4" /> : <Sun className="me-1 h-4 w-4" />}{settings.theme === 'light' ? (fa ? 'شب' : 'Night') : (fa ? 'روز' : 'Day')}</Button>
            <Button variant="ghost" size="sm" className="h-9 min-w-9 rounded-xl px-2 text-xs text-slate-200 hover:bg-white/10 hover:text-white" onClick={toggleLang}><Languages className="me-1 h-4 w-4" />{fa ? 'EN' : 'فا'}</Button>
          </div>
        <div className="absolute end-2 top-3 bottom-3 z-20 hidden w-9 flex-col items-center gap-2 rounded-full border border-slate-200/80 bg-white/95 py-3 text-slate-700 shadow-[0_8px_28px_-12px_rgba(255,255,255,.5)] group-hover/panel:flex">
          <button type="button" onClick={toggleTheme} aria-label={fa ? 'تغییر پوسته' : 'Toggle theme'} className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-slate-200">{settings.theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</button>
          <button type="button" onClick={toggleLang} aria-label={fa ? 'تغییر زبان' : 'Change language'} className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-slate-200"><Languages className="h-4 w-4" /></button>
          <span className="my-1 h-px w-5 bg-slate-300" />
          <NavLink to="/settings" aria-label={fa ? 'تنظیمات' : 'Settings'} className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-slate-200"><Settings className="h-4 w-4" /></NavLink>
          <span className="mt-auto text-[8px] font-bold tracking-widest text-slate-400" style={{ writingMode: 'vertical-rl' }}>MEALPHA</span>
        </div>
      </div></div>
      </aside>
      <aside aria-label={fa ? 'ناوبری شیشه‌ای' : 'Glass navigation'} className="fixed start-2 top-1/2 z-50 flex -translate-y-1/2 items-center md:hidden">
        <div className="relative flex h-[min(76dvh,620px)] w-12 flex-col overflow-visible rounded-[24px] border border-white/15 bg-slate-950/80 px-1.5 py-2.5 text-white shadow-[0_18px_60px_-18px_rgba(0,0,0,.82)] backdrop-blur-2xl">
          <NavLink to="/" aria-label="MeAlpha Pro home" className="mb-2 grid h-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/80 to-amber-400/70 ring-1 ring-white/20">
            <img src="/mealpha.svg" alt="" className="h-6 w-6 object-contain" />
          </NavLink>
          <nav aria-label={fa ? 'صفحه‌های برنامه' : 'App sections'} className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden py-1">
            {NAV.map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'} title={t(n.k)} aria-label={t(n.k)} className={({ isActive }) => cn('grid h-9 w-9 place-items-center rounded-xl transition-all', isActive ? 'bg-gradient-to-br from-violet-400/35 to-amber-300/20 text-amber-200 shadow-[0_0_20px_-6px_rgba(196,160,255,.75)] ring-1 ring-violet-200/30' : 'text-slate-300 hover:bg-white/10 hover:text-white')}>
              <n.icon className="h-[18px] w-[18px]" />
            </NavLink>)}
          </nav>
          <span className={cn('mx-auto mt-1 h-1.5 w-1.5 shrink-0 rounded-full', online ? 'bg-emerald-400' : 'bg-amber-400')} title={online ? (fa ? 'آنلاین' : 'Online') : (fa ? 'آفلاین' : 'Offline')} />
          <div className="absolute end-[-30px] top-1/2 flex -translate-y-1/2 flex-col items-center gap-2 rounded-full border border-slate-200/90 bg-white/95 p-1.5 text-slate-700 shadow-[0_10px_30px_-12px_rgba(255,255,255,.55)] backdrop-blur-xl">
            <button type="button" onClick={toggleTheme} aria-label={fa ? 'تغییر تم' : 'Toggle theme'} title={fa ? 'تغییر تم' : 'Toggle theme'} className="grid h-7 w-7 place-items-center rounded-full transition-colors hover:bg-slate-200">{settings.theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</button>
            <button type="button" onClick={toggleLang} aria-label={fa ? 'English' : 'فارسی'} title={fa ? 'English' : 'فارسی'} className="grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold transition-colors hover:bg-slate-200">{fa ? 'EN' : 'فا'}</button>
            <span className="h-px w-4 bg-slate-300" />
            <NavLink to="/settings" aria-label={fa ? 'تنظیمات' : 'Settings'} title={fa ? 'تنظیمات' : 'Settings'} className="grid h-7 w-7 place-items-center rounded-full transition-colors hover:bg-slate-200"><Settings className="h-4 w-4" /></NavLink>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex h-[68px] items-center justify-between border-b border-white/10 bg-slate-950/35 px-3 text-foreground shadow-[0_8px_30px_-24px_rgba(0,0,0,.8)] backdrop-blur-2xl sm:px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="md:hidden flex items-center gap-2 text-sm font-black"><img src="/mealpha.svg" alt="" className="h-7 w-7 rounded-lg" />MeAlpha <span className="text-primary">Pro</span></div>
            <div className="hidden text-xs text-muted-foreground sm:block">{fa ? 'فضای شخصی شما' : 'Your personal workspace'} <span className="mx-2 opacity-40">/</span><span className="font-semibold text-foreground">{t(NAV.find(n => n.to === location.pathname)?.k ?? 'dashboard')}</span></div>
          </div>
          <div className="relative flex items-center gap-2">
            <GlobalSearch />
            <button type="button" className={cn('relative grid h-10 w-10 place-items-center rounded-xl border bg-card/70 transition-colors hover:bg-secondary', activePopover === 'notifications' && 'border-primary text-primary')} aria-label={fa ? 'اعلان‌ها' : 'Notifications'} aria-expanded={activePopover === 'notifications'} onClick={() => setActivePopover(v => v === 'notifications' ? null : 'notifications')}>
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && <span className="absolute -end-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">{notifications.length}</span>}
            </button>
            <button type="button" className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-primary/10 text-sm font-bold text-primary ring-1 ring-primary/15 hover:ring-primary/50" aria-label={fa ? 'پروفایل کاربری' : 'User profile'} aria-expanded={activePopover === 'profile'} onClick={() => setActivePopover(v => v === 'profile' ? null : 'profile')} style={{ backgroundColor: settings.avatarColor || undefined }}>
              {settings.avatarDataUrl ? <img src={settings.avatarDataUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-white">{settings.avatarEmoji || profileLabel.slice(0,1).toUpperCase() || 'α'}</span>}
            </button>
            {activePopover === 'notifications' && <div role="dialog" aria-label={fa ? 'مرکز اعلان‌ها' : 'Notification center'} className="absolute end-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border bg-card p-3 shadow-2xl">
              <div className="mb-2 flex items-center justify-between"><div className="font-bold text-sm">{fa ? 'مرکز اعلان‌ها' : 'Notifications'}</div><button type="button" aria-label={fa ? 'بستن اعلان‌ها' : 'Close notifications'} onClick={() => setActivePopover(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button></div>
              {notifications.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-center"><Bell className="mx-auto mb-2 h-6 w-6 text-muted-foreground" /><p className="text-sm font-medium">{fa ? 'فعلاً اعلان جدیدی نداری' : 'You are all caught up'}</p><p className="mt-1 text-xs text-muted-foreground">{fa ? 'موعد کارها و پرداخت‌های نزدیک اینجا نمایش داده می‌شود.' : 'Upcoming tasks and payment reminders will appear here.'}</p></div> : <div className="max-h-72 space-y-1 overflow-y-auto">{notifications.map(item => <NavLink key={item.id} to={item.to} onClick={() => setActivePopover(null)} className="flex items-start gap-3 rounded-xl p-3 text-start hover:bg-secondary"><CalendarClock className={cn('mt-0.5 h-4 w-4 shrink-0', item.overdue ? 'text-destructive' : 'text-primary')} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{item.detail}</span></span><ChevronLeft className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" /></NavLink>)}</div>}
              <NavLink to="/transactions" onClick={() => setActivePopover(null)} className="mt-2 flex items-center justify-center rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/15">{fa ? 'مشاهده یادآوری‌های پرداخت' : 'View payment reminders'}</NavLink>
            </div>}
            {activePopover === 'profile' && <div role="dialog" aria-label={fa ? 'منوی پروفایل' : 'Profile menu'} className="absolute end-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border bg-card p-3 shadow-2xl">
              <div className="flex items-center gap-3 border-b pb-3"><div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl text-lg font-bold text-white" style={{ backgroundColor: settings.avatarColor || '#168be5' }}>{settings.avatarDataUrl ? <img src={settings.avatarDataUrl} alt="" className="h-full w-full object-cover" /> : settings.avatarEmoji || 'α'}</div><div className="min-w-0"><div className="truncate text-sm font-bold">{profileLabel}</div><div className="truncate text-xs text-muted-foreground">{settings.username ? '@' + settings.username : (fa ? 'عضو MeAlpha' : 'MeAlpha member')}</div></div></div>
              <NavLink to="/settings" onClick={() => setActivePopover(null)} className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-secondary"><UserRound className="h-4 w-4" />{fa ? 'مشاهده و ویرایش پروفایل' : 'View and edit profile'}<ChevronLeft className="ms-auto h-4 w-4" /></NavLink>
            </div>}
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] ps-[5.5rem] pe-3 pb-8 pt-6 sm:ps-[5.5rem] sm:pe-6 md:px-8 md:pb-10 md:pt-8"><Outlet /></main>
      </div>
    </div>
  );
}
