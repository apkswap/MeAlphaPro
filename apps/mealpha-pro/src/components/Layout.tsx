import { useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Target, ListChecks, Repeat, Timer, Receipt, Landmark, Wallet, ChevronDown, Sparkles, Settings, Languages, Layers3, Sun, Moon, Bell, Cloud, Menu, X, ChevronLeft, ChevronRight, UserRound, CalendarClock } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { cn } from '@project/components/lib/utils';
import { useStore } from '../lib/store';
import { Key } from '../lib/i18n';
import { isoOf, todayISO } from '../lib/analytics';
import GlobalSearch from './GlobalSearch';
import { toast } from 'sonner';
import { nextTaskReminderDate, syncNativeTaskReminders } from '../lib/taskNotifications';

const NAV: { to: string; k: Key; icon: typeof Target; group: 'main' | 'manage' | 'system'; parent?: 'finance'; labelFa?: string; labelEn?: string }[] = [
  { to: '/', k: 'dashboard', icon: LayoutDashboard, group: 'main' },
  { to: '/goals', k: 'goals', icon: Target, group: 'manage' },
  { to: '/tasks', k: 'tasks', icon: ListChecks, group: 'manage' },
  { to: '/habits', k: 'habits', icon: Repeat, group: 'manage' },
  { to: '/focus', k: 'focus', icon: Timer, group: 'manage' },
  { to: '/transactions', k: 'finance', icon: Receipt, group: 'manage', parent: 'finance', labelFa: 'تراکنش‌ها', labelEn: 'Transactions' },
  { to: '/wealth?tab=assets', k: 'wealth', icon: Landmark, group: 'manage', parent: 'finance', labelFa: 'دارایی‌ها', labelEn: 'Assets' },
  { to: '/wealth?tab=liabilities', k: 'wealth', icon: Landmark, group: 'manage', parent: 'finance', labelFa: 'بدهی‌ها', labelEn: 'Liabilities' },
  { to: '/insights', k: 'insights', icon: Sparkles, group: 'manage' },
  { to: '/workspace', k: 'workspace', icon: Layers3, group: 'system' },
  { to: '/settings', k: 'settings', icon: Settings, group: 'system' },
];

const MOBILE_NAV = NAV.filter(n => ['/', '/tasks', '/habits', '/transactions', '/settings'].includes(n.to));

export default function Layout() {
  const { t, settings, setLocalSettings, data, save } = useStore();
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [desktopViewport, setDesktopViewport] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [activePopover, setActivePopover] = useState<'notifications' | 'profile' | null>(null);
  const firedTaskReminders = useRef(new Set<string>());
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
  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const updateViewport = () => setDesktopViewport(media.matches);
    updateViewport();
    media.addEventListener('change', updateViewport);
    return () => media.removeEventListener('change', updateViewport);
  }, []);
  const toggleTheme = () => setLocalSettings({ ...settings, theme: settings.theme === 'light' ? 'dark' : 'light' });
  const toggleLang = () => setLocalSettings({ ...settings, language: settings.language === 'fa' ? 'en' : 'fa' });
  const fa = settings.language === 'fa';
  const financeActive = location.pathname === '/transactions' || location.pathname === '/wealth';
  useEffect(() => { if (financeActive) setFinanceOpen(true); }, [financeActive]);
  const dropboxConnected = Boolean(settings.dropboxRefreshToken || settings.dropboxAccessToken);
  const today = todayISO();
  const notifications = useMemo(() => {
    if (!data) return [];
    const taskItems = data.tasks
      .filter((task: any) => task.dailyEntryType !== 'journal' && task.status !== 'Done' && task.dueDate && task.dueDate <= today)
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
    const scheduledTaskItems = data.tasks.flatMap((task: any) =>
      task.dailyEntryType === 'journal' ? [] : (Array.isArray(task.reminders) ? task.reminders : [])
        .filter((reminder: any) => reminder.enabled && reminder.at && nextTaskReminderDate(reminder) && nextTaskReminderDate(reminder)!.getTime() <= Date.now() + 24 * 60 * 60 * 1000)
        .map((reminder: any) => {
          const nextAt = nextTaskReminderDate(reminder)!;
          return {
            id: 'task-reminder:' + task.id + ':' + reminder.id,
            title: task.title || (fa ? 'تسک بدون عنوان' : 'Untitled task'),
            detail: fa ? 'یادآور ' + nextAt.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : 'Reminder ' + nextAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            to: '/tasks',
            overdue: nextAt.getTime() < Date.now(),
          };
        })
    );
    return [...reminderItems, ...scheduledTaskItems, ...taskItems].slice(0, 8);
  }, [data, today, fa]);
  useEffect(() => {
    if (!data) return;
    void syncNativeTaskReminders(data.tasks, settings.language);
  }, [data?.tasks, settings.language]);

  useEffect(() => {
    if (!data || Capacitor.isNativePlatform()) return;
    const tick = () => {
      const now = Date.now();
      data.tasks.forEach((task: any) => {
        if (task.status === 'Done' || !Array.isArray(task.reminders)) return;
        let changed = false;
        const reminders = task.reminders.map((reminder: any) => {
          if (!reminder.enabled || !reminder.at || new Date(reminder.at).getTime() > now) return reminder;
          const key = task.id + ':' + reminder.id + ':' + reminder.at;
          if (firedTaskReminders.current.has(key)) return reminder;
          firedTaskReminders.current.add(key);
          const title = settings.language === 'fa' ? 'یادآور تسک' : 'Task reminder';
          const body = String(task.title || (settings.language === 'fa' ? 'تسک بدون عنوان' : 'Untitled task')).slice(0, 180);
          const desktop = (window as any).mealphaDesktop;
          if (desktop?.notify) void desktop.notify({ title, body }).catch((error: unknown) => console.warn('Desktop notification failed:', error));
          else if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body });
          else toast.info(title + ': ' + body);
          changed = true;
          const next = new Date(reminder.at);
          if (reminder.repeat === 'daily') next.setDate(next.getDate() + 1);
          else if (reminder.repeat === 'weekly') next.setDate(next.getDate() + 7);
          else if (reminder.repeat === 'monthly') next.setMonth(next.getMonth() + 1);
          if (reminder.repeat && reminder.repeat !== 'none') {
            while (next.getTime() <= now) {
              if (reminder.repeat === 'daily') next.setDate(next.getDate() + 1);
              else if (reminder.repeat === 'weekly') next.setDate(next.getDate() + 7);
              else next.setMonth(next.getMonth() + 1);
            }
            return { ...reminder, at: next.toISOString(), lastFiredAt: new Date(now).toISOString() };
          }
          return { ...reminder, enabled: false, lastFiredAt: new Date(now).toISOString() };
        });
        if (changed) void save('tasks', { ...task, reminders }, task.id);
      });
    };
    tick();
    const interval = window.setInterval(tick, 15000);
    return () => window.clearInterval(interval);
  }, [data?.tasks, settings.language]);

  const groups = [
    { id: 'main', label: fa ? 'نمای کلی' : 'OVERVIEW' },
    { id: 'manage', label: fa ? 'مدیریت زندگی' : 'LIFE MANAGEMENT' },
    { id: 'system', label: fa ? 'فضای کار' : 'WORKSPACE' },
  ] as const;
  const navLink = ({ isActive }: { isActive: boolean }) => cn(
    'mealpha-sidebar-link flex min-h-11 items-center gap-3 rounded-2xl text-[13px] font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300',
    sidebarExpanded ? 'justify-start px-3' : 'justify-center px-0',
    isActive
      ? 'bg-white text-slate-950 shadow-[0_8px_26px_-12px_rgba(56,189,248,.65)] ring-1 ring-white/80'
      : 'text-slate-200/75 hover:bg-white/10 hover:text-white'
  );
  const navItems = () => groups.map(group => (
    <div key={group.id} className="mb-4">
      <div className={cn(
        'overflow-hidden whitespace-nowrap px-3 pb-2 text-[9px] font-bold tracking-[.16em] text-sky-200/65 transition-all duration-200',
        sidebarExpanded ? 'h-5 opacity-100' : 'h-0 opacity-0'
      )}>{group.label}</div>
      <div className="space-y-1">
        {NAV.filter(n => n.group === group.id && !n.parent).map(n => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={navLink}>
            <n.icon className="h-[18px] w-[18px] shrink-0" />
            <span className={cn('min-w-0 truncate whitespace-nowrap transition-all duration-200', sidebarExpanded ? 'max-w-[190px] opacity-100' : 'max-w-0 opacity-0')}>{t(n.k)}</span>
          </NavLink>
        ))}
        {group.id === 'manage' && <div className="space-y-1">
          <button type="button" aria-expanded={financeOpen} onClick={() => setFinanceOpen(value => !value)}
            className={cn(
              'mealpha-sidebar-link flex min-h-11 w-full items-center gap-3 rounded-2xl text-start text-[13px] font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300',
              sidebarExpanded ? 'justify-start px-3' : 'justify-center px-0',
              financeActive ? 'bg-white/15 text-white ring-1 ring-white/15' : 'text-slate-200/75 hover:bg-white/10 hover:text-white'
            )}>
            <Wallet className="h-[18px] w-[18px] shrink-0 text-sky-200" />
            <span className={cn('min-w-0 flex-1 truncate whitespace-nowrap transition-opacity duration-200', sidebarExpanded ? 'opacity-100' : 'hidden')}>{fa ? 'مدیریت مالی' : 'Financial management'}</span>
            {sidebarExpanded && <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', financeOpen && 'rotate-180')} />}
          </button>
          {financeOpen && sidebarExpanded && <div className="ms-4 space-y-1 border-s border-white/15 ps-3">
            {NAV.filter(n => n.parent === 'finance').map(n => {
              const selected = n.to === '/transactions' ? location.pathname === '/transactions' : location.pathname === '/wealth' && location.search === n.to.slice('/wealth'.length);
              return <NavLink key={n.to} to={n.to} className={cn(
                'flex min-h-9 items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200',
                selected ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-300/75 hover:bg-white/10 hover:text-white'
              )}>
                <n.icon className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{fa ? n.labelFa : n.labelEn}</span>
              </NavLink>;
            })}
          </div>}
        </div>}
      </div>
    </div>
  ));
  const currentNav = NAV.find(n => n.to === location.pathname + location.search) ?? NAV.find(n => n.to === location.pathname);
  const currentNavLabel = currentNav ? (fa ? currentNav.labelFa || t(currentNav.k) : currentNav.labelEn || t(currentNav.k)) : t('dashboard');  const profileLabel = settings.displayName || settings.username || (fa ? 'پروفایل من' : 'My profile');
  return (
    <div className="mealpha-glass-shell min-h-screen bg-background text-foreground md:flex">
      <aside
        aria-label={fa ? 'ناوبری اصلی' : 'Primary navigation'}
        className="relative z-50 hidden w-[88px] shrink-0 md:sticky md:top-0 md:block md:h-screen"
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => { if (!sidebarPinned) setSidebarExpanded(false); }}
      >
        <div
          dir={fa ? 'rtl' : 'ltr'}
          className={cn(
            'mealpha-glass-sidebar absolute inset-y-4 start-3 z-50 flex flex-col overflow-hidden rounded-[30px] border border-white/15 px-2 py-3 text-white shadow-[0_20px_72px_-24px_rgba(0,0,0,.82)] backdrop-blur-2xl transition-[width,box-shadow] duration-300 ease-out',
            sidebarExpanded ? 'w-[310px]' : 'w-[68px]'
          )}
        >
          <div className="mealpha-glass-sidebar__top mb-3 shrink-0 rounded-[23px] p-2">
            <div className="flex min-h-11 items-center justify-between gap-2">
              <NavLink to="/" className={cn('flex min-w-0 items-center gap-3', sidebarExpanded ? 'flex-1' : 'mx-auto')}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[15px] bg-gradient-to-br from-sky-300 via-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 ring-1 ring-white/25">
                  <img src="/mealpha.svg" alt="MeAlpha" className="h-8 w-8 object-contain" />
                </span>
                {sidebarExpanded && <span className="min-w-0 whitespace-nowrap">
                  <span className="block text-[15px] font-black tracking-tight text-white">MeAlpha</span>
                  <span className="mt-0.5 block text-[8px] font-bold tracking-[.15em] text-sky-100/65">PERSONAL COMMAND CENTER</span>
                </span>}
              </NavLink>
              {sidebarExpanded && <button
                type="button"
                aria-label={sidebarPinned ? (fa ? 'جمع‌کردن نوار کناری' : 'Collapse sidebar') : (fa ? 'ثابت‌کردن نوار کناری' : 'Pin sidebar open')}
                aria-pressed={sidebarPinned}
                title={sidebarPinned ? (fa ? 'جمع‌کردن' : 'Collapse') : (fa ? 'ثابت نگه‌داشتن' : 'Keep expanded')}
                onClick={() => {
                  if (sidebarPinned) { setSidebarPinned(false); setSidebarExpanded(false); }
                  else { setSidebarPinned(true); setSidebarExpanded(true); }
                }}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-slate-200/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              ><ChevronLeft className="h-4 w-4" /></button>}
            </div>
            {!sidebarExpanded && <button
              type="button"
              aria-label={fa ? 'بازکردن نوار کناری' : 'Expand sidebar'}
              onClick={() => { setSidebarPinned(true); setSidebarExpanded(true); }}
              className="mx-auto mt-2 grid h-7 w-7 place-items-center rounded-full text-slate-300/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            ><ChevronRight className="h-3.5 w-3.5" /></button>}
          </div>

          {desktopViewport && <div className={cn(
            'mealpha-sidebar-search mb-3 overflow-hidden px-1 transition-all duration-200',
            sidebarExpanded ? 'max-h-12 opacity-100' : 'pointer-events-none max-h-0 opacity-0'
          )}><GlobalSearch /></div>}

          <nav aria-label={fa ? 'بخش‌های برنامه' : 'Application sections'} className={cn(
            'min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-0.5 pt-1 transition-[padding] duration-200',
            sidebarExpanded ? 'pe-11' : 'pe-0'
          )}>{navItems()}</nav>

          <div className="mealpha-glass-sidebar__footer mt-3 shrink-0 rounded-[22px] border border-white/10 bg-white/[0.055] p-2">
            <div className={cn('flex min-h-8 items-center gap-2 text-[10px] font-semibold text-slate-200/80', sidebarExpanded ? 'px-2' : 'justify-center')}>
              <span className={cn('h-2 w-2 shrink-0 rounded-full', online ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.65)]' : 'bg-amber-400')} />
              {sidebarExpanded && <span className="truncate">{online ? (fa ? 'اینترنت متصل' : 'Internet connected') : (fa ? 'بدون اینترنت' : 'Offline')}</span>}
            </div>
            {sidebarExpanded && <div className="flex min-w-0 items-center gap-2 px-2 text-[10px]" role="status" aria-live="polite">
              <Cloud className="h-3.5 w-3.5 shrink-0 text-sky-200/75" />
              <span className={cn('h-2 w-2 shrink-0 rounded-full', dropboxConnected ? 'bg-emerald-400' : 'bg-slate-500')} />
              <span className={cn('min-w-0 truncate font-semibold', dropboxConnected ? 'text-emerald-200' : 'text-slate-400')}>{dropboxConnected ? (fa ? 'Dropbox متصل' : 'Dropbox linked') : (fa ? 'Dropbox متصل نیست' : 'Dropbox not connected')}</span>
              {dropboxConnected && settings.dropboxAccountName && <span className="ms-auto max-w-20 truncate text-[9px] text-slate-400">{settings.dropboxAccountName}</span>}
            </div>}
            <NavLink to="/settings" title={profileLabel} className={cn(
              'flex min-h-10 items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-white/10',
              sidebarExpanded ? 'justify-start' : 'justify-center'
            )}>
              <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-sky-500/20 text-xs font-bold text-white ring-1 ring-white/20" style={{ backgroundColor: settings.avatarColor || undefined }}>
                {settings.avatarDataUrl ? <img src={settings.avatarDataUrl} alt="" className="h-full w-full object-cover" /> : settings.avatarEmoji || profileLabel.slice(0, 1).toUpperCase() || 'α'}
              </span>
              {sidebarExpanded && <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-bold text-white">{profileLabel}</span>
                <span className="block truncate text-[9px] text-slate-400">{settings.username ? '@' + settings.username : (fa ? 'حساب کاربری' : 'Account')}</span>
              </span>}
              {sidebarExpanded && <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
            </NavLink>
          </div>

          <div className={cn(
            'mealpha-glass-context-rail absolute end-2 top-3 bottom-3 z-20 flex w-9 flex-col items-center gap-2 rounded-full border border-slate-200/80 bg-white/[.96] py-3 text-slate-700 shadow-[0_8px_28px_-12px_rgba(255,255,255,.55)] transition-[opacity,transform] duration-200',
            sidebarExpanded ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-1 opacity-0'
          )}>
            <button type="button" onClick={toggleTheme} title={settings.theme === 'light' ? (fa ? 'حالت تاریک' : 'Dark theme') : (fa ? 'حالت روشن' : 'Light theme')}
              aria-label={fa ? 'تغییر پوسته' : 'Toggle theme'} className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
              {settings.theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <button type="button" onClick={toggleLang} title={fa ? 'English' : 'فارسی'}
              aria-label={fa ? 'تغییر زبان' : 'Change language'} className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
              <Languages className="h-4 w-4" />
            </button>
            <span className="my-1 h-px w-5 bg-slate-300" />
            <NavLink to="/settings" title={fa ? 'تنظیمات' : 'Settings'} aria-label={fa ? 'تنظیمات' : 'Settings'} className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"><Settings className="h-4 w-4" /></NavLink>
            <span className="mt-auto max-w-full overflow-hidden px-1 text-[8px] font-bold tracking-widest text-slate-400 [writing-mode:vertical-rl]">{currentNavLabel}</span>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="app-topbar sticky top-0 z-40 flex h-[76px] min-w-0 items-center justify-between gap-1 border-b bg-background/90 px-3 backdrop-blur-xl sm:gap-3 sm:px-5 md:px-9">
          <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-3">
            <button className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border md:hidden" onClick={() => setMobileMenu(v => !v)} aria-label={fa ? 'بازکردن منو' : 'Open menu'}>{mobileMenu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}</button>
            <div className="md:hidden flex shrink-0 items-center gap-1 whitespace-nowrap text-[13px] font-black"><img src="/mealpha.svg" alt="" className="h-9 w-9 shrink-0 rounded-xl object-contain shadow-lg shadow-primary/20" />MeAlpha <span className="text-primary">Pro</span></div>
            <div className="hidden min-w-0 truncate text-xs text-muted-foreground lg:block">{fa ? 'فضای شخصی شما' : 'Your personal workspace'} <span className="mx-2 opacity-40">/</span><span className="font-semibold text-foreground">{currentNav ? (fa ? currentNav.labelFa || t(currentNav.k) : currentNav.labelEn || t(currentNav.k)) : t('dashboard')}</span></div>
          </div>
          <div className="relative flex items-center gap-2">
            {!desktopViewport && <GlobalSearch />}
            <button type="button" className={cn('relative grid h-10 w-10 place-items-center rounded-xl border bg-card/70 transition-colors hover:bg-secondary', activePopover === 'notifications' && 'border-primary text-primary')} aria-label={fa ? 'اعلان‌ها' : 'Notifications'} aria-expanded={activePopover === 'notifications'} onClick={() => setActivePopover(v => v === 'notifications' ? null : 'notifications')}>
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && <span className="absolute -end-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">{notifications.length}</span>}
            </button>
            <button type="button" className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-primary/10 text-sm font-bold text-primary ring-1 ring-primary/15 hover:ring-primary/50" aria-label={fa ? 'پروفایل کاربری' : 'User profile'} aria-expanded={activePopover === 'profile'} onClick={() => setActivePopover(v => v === 'profile' ? null : 'profile')} style={{ backgroundColor: settings.avatarColor || undefined }}>
              {settings.avatarDataUrl ? <img src={settings.avatarDataUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-white">{settings.avatarEmoji || profileLabel.slice(0,1).toUpperCase() || 'α'}</span>}
            </button>
            {activePopover === 'profile' && <div role="dialog" aria-label={fa ? 'منوی پروفایل' : 'Profile menu'} className="absolute end-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border bg-card shadow-2xl">
              <div className="relative h-24 bg-gradient-to-br from-primary/30 via-card to-accent/20">
                {settings.coverDataUrl && <img src={settings.coverDataUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
              </div>
              <div className="relative -mt-7 px-4 pb-4">
                <div className="mb-2 flex items-end gap-3">
                  <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border-2 border-card text-xl font-bold text-white shadow-lg" style={{ backgroundColor: settings.avatarColor || '#8b5cf6' }}>
                    {settings.avatarDataUrl ? <img src={settings.avatarDataUrl} alt="" className="h-full w-full object-cover" /> : settings.avatarEmoji || 'α'}
                  </div>
                  <div className="min-w-0 pb-1"><div className="truncate text-sm font-bold">{profileLabel}</div><div className="truncate text-xs text-muted-foreground">{settings.username ? '@' + settings.username : 'MeAlpha Pro'}</div></div>
                </div>
                {settings.bio && <p className="mb-3 text-xs leading-5 text-muted-foreground">{settings.bio}</p>}
                <NavLink to="/settings" onClick={() => setActivePopover(null)} className="block rounded-xl bg-primary/10 px-3 py-2 text-center text-xs font-semibold text-primary hover:bg-primary/15">{fa ? 'مشاهده و ویرایش پروفایل' : 'View and edit profile'}</NavLink>
              </div>
            </div>}
            {activePopover === 'notifications' && <div role="dialog" aria-label={fa ? 'مرکز اعلان‌ها' : 'Notification center'} className="absolute end-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border bg-card p-3 shadow-2xl">
              <div className="mb-2 flex items-center justify-between"><div className="font-bold text-sm">{fa ? 'مرکز اعلان‌ها' : 'Notifications'}</div><button type="button" aria-label={fa ? 'بستن اعلان‌ها' : 'Close notifications'} onClick={() => setActivePopover(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button></div>
              {notifications.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-center"><Bell className="mx-auto mb-2 h-6 w-6 text-muted-foreground" /><p className="text-sm font-medium">{fa ? 'فعلاً اعلان جدیدی نداری' : 'You are all caught up'}</p><p className="mt-1 text-xs text-muted-foreground">{fa ? 'موعد کارها و پرداخت‌های نزدیک اینجا نمایش داده می‌شود.' : 'Upcoming tasks and payment reminders will appear here.'}</p></div> : <div className="max-h-72 space-y-1 overflow-y-auto">{notifications.map(item => <NavLink key={item.id} to={item.to} onClick={() => setActivePopover(null)} className="flex items-start gap-3 rounded-xl p-3 text-start hover:bg-secondary"><CalendarClock className={cn('mt-0.5 h-4 w-4 shrink-0', item.overdue ? 'text-destructive' : 'text-primary')} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{item.detail}</span></span><ChevronLeft className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" /></NavLink>)}</div>}
              <NavLink to="/transactions" onClick={() => setActivePopover(null)} className="mt-2 flex items-center justify-center rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/15">{fa ? 'مشاهده یادآوری‌های پرداخت' : 'View payment reminders'}</NavLink>
            </div>}

          </div>
        </header>
        {mobileMenu && <div role="dialog" aria-label={fa ? 'منوی اصلی' : 'Main menu'} className="fixed inset-x-0 top-[68px] z-50 max-h-[calc(100dvh-68px)] overflow-y-auto overscroll-contain border-b bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl md:hidden"><div className="grid grid-cols-2 gap-2">
          {NAV.filter(n => !n.parent).map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({isActive}) => cn('flex items-center gap-2 rounded-xl p-3 text-sm', isActive ? 'bg-primary/10 text-primary' : 'bg-card text-muted-foreground')}><n.icon className="h-4 w-4" />{t(n.k)}</NavLink>)}
          <div className="col-span-2 rounded-xl border bg-card/60 p-2">
            <button type="button" aria-expanded={financeOpen} onClick={() => setFinanceOpen(value => !value)} className="flex w-full items-center gap-2 rounded-lg p-2 text-sm font-semibold">
              <Wallet className="h-4 w-4 text-primary" /><span className="flex-1 text-start">{fa ? 'مدیریت مالی' : 'Financial management'}</span><ChevronDown className={cn('h-4 w-4 transition-transform', financeOpen && 'rotate-180')} />
            </button>
            {financeOpen && <div className="mt-2 grid grid-cols-3 gap-2">
              {NAV.filter(n => n.parent === 'finance').map(n => {
                const selected = n.to === '/transactions' ? location.pathname === '/transactions' : location.pathname === '/wealth' && location.search === n.to.slice('/wealth'.length);
                return <NavLink key={n.to} to={n.to} className={cn('flex min-w-0 flex-col items-center gap-1 rounded-lg bg-background p-2 text-center text-xs', selected ? 'text-primary ring-1 ring-primary/30' : 'text-muted-foreground')}>
                  <n.icon className="h-4 w-4" /><span className="truncate">{fa ? n.labelFa : n.labelEn}</span>
                </NavLink>;
              })}
            </div>}
          </div>
        </div><div className="mt-3 flex gap-2"><Button variant="outline" size="sm" onClick={toggleTheme}>{settings.theme === 'light' ? <Moon className="me-2 h-4 w-4" /> : <Sun className="me-2 h-4 w-4" />}{fa ? 'تغییر تم' : 'Toggle theme'}</Button><Button variant="outline" size="sm" onClick={toggleLang}><Languages className="me-2 h-4 w-4" />{fa ? 'English' : 'فارسی'}</Button></div></div>}
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
