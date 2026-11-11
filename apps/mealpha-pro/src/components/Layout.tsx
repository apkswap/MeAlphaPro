import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Target, ListChecks, Repeat, Timer, Receipt, Landmark, Sparkles, Settings, Languages, Layers3, Sun, Moon, Search, Bell, Cloud, Menu, X, UserRound, ChevronLeft, CalendarClock } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { cn } from '@project/components/lib/utils';
import { useStore } from '../lib/store';
import { Key } from '../lib/i18n';
import { isoOf, todayISO } from '../lib/analytics';

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

const MOBILE_NAV = NAV.filter(n => ['/', '/tasks', '/habits', '/transactions', '/settings'].includes(n.to));

export default function Layout() {
  const { t, settings, setLocalSettings, data } = useStore();
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [mobileMenu, setMobileMenu] = useState(false);
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
  useEffect(() => { setMobileMenu(false); setActivePopover(null); }, [location.pathname]);
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
    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200',
    isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
  );
  const navItems = () => groups.map(group => (
    <div key={group.id} className="mb-5">
      <div className="px-3 pb-2 text-[9px] font-bold tracking-[.16em] text-muted-foreground/70">{group.label}</div>
      <div className="space-y-1">
        {NAV.filter(n => n.group === group.id).map(n => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={navLink}>
            <n.icon className="h-[17px] w-[17px] shrink-0" />
            <span className="truncate">{t(n.k)}</span>
          </NavLink>
        ))}
      </div>
    </div>
  ));
  const profileLabel = settings.displayName || settings.username || (fa ? 'پروفایل من' : 'My profile');
  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-[248px] md:shrink-0 md:flex-col md:border-e md:border-sidebar-border md:bg-sidebar-background/90 md:px-4 md:py-5 md:backdrop-blur-xl">
        <NavLink to="/" className="mb-8 flex items-center gap-3 px-2">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25"><img src="/mealpha.svg" alt="MeAlpha" className="h-8 w-8 object-contain" /></div>
          <div><div className="text-[15px] font-black tracking-tight">MeAlpha <span className="text-primary">Pro</span></div><div className="mt-0.5 text-[9px] font-semibold tracking-[.18em] text-muted-foreground">PERSONAL COMMAND CENTER</div></div>
        </NavLink>
        <nav className="min-h-0 flex-1 overflow-y-auto">{navItems()}</nav>
        <div className="mt-4 rounded-2xl border bg-card/70 p-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold"><span className={cn('h-2 w-2 rounded-full', online ? 'bg-emerald-500' : 'bg-amber-500')} />{online ? (fa ? 'اینترنت متصل' : 'Internet connected') : (fa ? 'بدون اینترنت' : 'Offline')}</div>
          <div className="mb-3 flex min-w-0 items-center gap-2 text-[11px]" role="status" aria-live="polite">
            <Cloud className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className={cn('h-2 w-2 shrink-0 rounded-full', dropboxConnected ? 'bg-emerald-500' : 'bg-muted-foreground/50')} />
            <span className={cn('truncate font-semibold', dropboxConnected ? 'text-[hsl(var(--success))]' : 'text-muted-foreground')}>{dropboxConnected ? (fa ? 'حساب Dropbox متصل' : 'Dropbox account linked') : (fa ? 'Dropbox متصل نیست' : 'Dropbox not connected')}</span>
            {dropboxConnected && settings.dropboxAccountName && <span className="ms-auto max-w-20 truncate text-[9px] text-muted-foreground">{settings.dropboxAccountName}</span>}
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={toggleTheme}>{settings.theme === 'light' ? <Moon className="me-1 h-4 w-4" /> : <Sun className="me-1 h-4 w-4" />}{settings.theme === 'light' ? (fa ? 'شب' : 'Night') : (fa ? 'روز' : 'Day')}</Button>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={toggleLang}><Languages className="me-1 h-4 w-4" />{fa ? 'EN' : 'فا'}</Button>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex h-[68px] items-center justify-between border-b bg-background/90 px-3 backdrop-blur-xl sm:px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button className="grid h-9 w-9 place-items-center rounded-xl border md:hidden" onClick={() => setMobileMenu(v => !v)} aria-label={fa ? 'بازکردن منو' : 'Open menu'}>{mobileMenu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}</button>
            <div className="md:hidden flex items-center gap-2 text-sm font-black"><img src="/mealpha.svg" alt="" className="h-7 w-7 rounded-lg" />MeAlpha <span className="text-primary">Pro</span></div>
            <div className="hidden text-xs text-muted-foreground sm:block">{fa ? 'فضای شخصی شما' : 'Your personal workspace'} <span className="mx-2 opacity-40">/</span><span className="font-semibold text-foreground">{t(NAV.find(n => n.to === location.pathname)?.k ?? 'dashboard')}</span></div>
          </div>
          <div className="relative flex items-center gap-2">
            <div className="hidden h-9 w-56 items-center gap-2 rounded-xl border bg-card/70 px-3 lg:flex"><Search className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">{fa ? 'جستجو در برنامه...' : 'Search your workspace...'}</span><kbd className="ms-auto rounded border px-1.5 py-0.5 text-[9px] text-muted-foreground">⌘ K</kbd></div>
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
        {mobileMenu && <div className="absolute inset-x-0 top-[68px] z-30 border-b bg-background p-4 shadow-xl md:hidden"><div className="grid grid-cols-2 gap-2">{NAV.map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({isActive}) => cn('flex items-center gap-2 rounded-xl p-3 text-sm', isActive ? 'bg-primary/10 text-primary' : 'bg-card text-muted-foreground')}><n.icon className="h-4 w-4" />{t(n.k)}</NavLink>)}</div><div className="mt-3 flex gap-2"><Button variant="outline" size="sm" onClick={toggleTheme}>{settings.theme === 'light' ? <Moon className="me-2 h-4 w-4" /> : <Sun className="me-2 h-4 w-4" />}{fa ? 'تغییر تم' : 'Toggle theme'}</Button><Button variant="outline" size="sm" onClick={toggleLang}><Languages className="me-2 h-4 w-4" />{fa ? 'English' : 'فارسی'}</Button></div></div>}
        <main className="mx-auto w-full max-w-[1600px] px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 md:px-8 md:pb-10 md:pt-8"><Outlet /></main>
        <nav aria-label={fa ? 'ناوبری اصلی' : 'Primary navigation'} className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 gap-1 border-t bg-background/95 px-2 pt-2 pb-[max(env(safe-area-inset-bottom),8px)] shadow-[0_-8px_30px_-20px_hsl(var(--foreground)/0.35)] backdrop-blur-xl md:hidden">
          {MOBILE_NAV.map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => cn('flex min-w-0 min-h-[3.35rem] flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1 text-[10px] font-medium transition-colors', isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}>
            <n.icon className="h-[19px] w-[19px] shrink-0" />
            <span className="max-w-full truncate leading-tight">{t(n.k)}</span>
          </NavLink>)}
        </nav>
      </div>
    </div>
  );
}
