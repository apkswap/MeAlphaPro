import { useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Target, ListChecks, Repeat, Timer, Receipt, Landmark, Wallet, ChevronDown, Sparkles, Settings, Languages, Layers3, Sun, Moon, Bell, Cloud, Menu, X, ChevronLeft, CalendarClock, Search, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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

export default function Layout() {
  const { t, settings, setLocalSettings, data, save } = useStore();
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [mobileMenu, setMobileMenu] = useState(false);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileMenuPanelRef = useRef<HTMLElement>(null);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [sidebarFocused, setSidebarFocused] = useState(false);
  const sidebarExpanded = sidebarPinned || sidebarHovered || sidebarFocused;
  const [financeOpen, setFinanceOpen] = useState(false);
  const [activePopover, setActivePopover] = useState<'notifications' | 'profile' | null>(null);
  const headerActionsRef = useRef<HTMLDivElement>(null);
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
    if (!activePopover) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!headerActionsRef.current?.contains(event.target as Node)) setActivePopover(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActivePopover(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activePopover]);
  useEffect(() => {
    if (!mobileMenu) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => mobileMenuPanelRef.current?.querySelector<HTMLElement>('[data-mobile-menu-close]')?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileMenu(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = mobileMenuPanelRef.current;
      if (!panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter(element => element.getAttribute('aria-hidden') !== 'true');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (mobileMenuTriggerRef.current?.isConnected) mobileMenuTriggerRef.current.focus();
      else previousFocus?.focus?.();
    };
  }, [mobileMenu]);
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
    'group relative flex min-h-11 items-center gap-3 rounded-2xl text-[13px] font-semibold transition-all duration-200',
    sidebarExpanded ? 'justify-start px-3' : 'justify-center px-0',
    isActive
      ? 'bg-white text-slate-950 shadow-[0_8px_24px_-12px_rgba(255,255,255,.55)]'
      : 'text-slate-200/75 hover:bg-white/10 hover:text-white'
  );
  const navItems = () => groups.map(group => (
    <div key={group.id} className="mb-4">
      {sidebarExpanded
        ? <div className="px-3 pb-2 pt-1 text-[9px] font-bold tracking-[.16em] text-sky-200/60">{group.label}</div>
        : <div className="mx-auto my-2 h-px w-8 bg-white/10" aria-hidden="true" />}
      <div className="space-y-1">
        {NAV.filter(n => n.group === group.id && !n.parent).map(n => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} title={t(n.k)} className={navLink}>
            <n.icon className="h-[18px] w-[18px] shrink-0" />
            <span className={cn('min-w-0 flex-1 truncate transition-opacity duration-200', sidebarExpanded ? 'opacity-100' : 'sr-only')}>{t(n.k)}</span>
          </NavLink>
        ))}
        {group.id === 'manage' && <div className="space-y-1">
          <button type="button" aria-expanded={sidebarExpanded && financeOpen} title={fa ? 'مدیریت مالی' : 'Financial management'} onClick={() => { setSidebarPinned(true); setFinanceOpen(value => !value); }}
            className={cn('group flex min-h-11 w-full items-center gap-3 rounded-2xl text-start text-[13px] font-semibold transition-all duration-200', sidebarExpanded ? 'justify-start px-3' : 'justify-center px-0', financeActive ? 'bg-white/12 text-white ring-1 ring-white/10' : 'text-slate-200/75 hover:bg-white/10 hover:text-white')}>
            <Wallet className="h-[18px] w-[18px] shrink-0" />
            <span className={cn('min-w-0 flex-1 truncate', sidebarExpanded ? 'block' : 'sr-only')}>{fa ? 'مدیریت مالی' : 'Financial management'}</span>
            {sidebarExpanded && <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform duration-200', financeOpen && 'rotate-180')} />}
          </button>
          {sidebarExpanded && financeOpen && <div className="ms-4 space-y-1 border-s border-white/15 ps-3">
            {NAV.filter(n => n.parent === 'finance').map(n => {
              const selected = n.to === '/transactions' ? location.pathname === '/transactions' : location.pathname === '/wealth' && location.search === n.to.slice('/wealth'.length);
              return <NavLink key={n.to} to={n.to} title={fa ? n.labelFa : n.labelEn} className={cn('flex min-h-9 items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200', selected ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-200/70 hover:bg-white/10 hover:text-white')}>
                <n.icon className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{fa ? n.labelFa : n.labelEn}</span>
              </NavLink>;
            })}
          </div>}
        </div>}
      </div>
    </div>
  ));
  const currentNav = NAV.find(n => n.to === location.pathname + location.search)
    ?? NAV.find(n => n.to.startsWith(location.pathname + '?'))
    ?? NAV.find(n => n.to === location.pathname);
  const profileLabel = settings.displayName || settings.username || (fa ? 'پروفایل من' : 'My profile');
  const openTaskCount = data?.tasks.filter((task: any) => task.dailyEntryType !== 'journal' && task.status !== 'Done').length ?? 0;
  const goalCount = data?.goals.length ?? 0;

  const activeHabitCount = data?.habits.filter((habit: any) => !habit.archived).length ?? 0;
  const pendingPaymentCount = data?.paymentReminders.filter((reminder: any) => reminder.status !== 'Paid').length ?? 0;
  const mobileGroups = [
    { id: 'overview', label: fa ? 'نمای کلی' : 'OVERVIEW', items: NAV.filter(n => n.group === 'main') },
    { id: 'life', label: fa ? 'مدیریت زندگی' : 'LIFE MANAGEMENT', items: NAV.filter(n => n.group === 'manage' && !n.parent && n.to !== '/insights') },
    { id: 'intelligence', label: fa ? 'هوشمندی و تحلیل' : 'INTELLIGENCE', items: NAV.filter(n => n.to === '/insights') },
    { id: 'finance', label: fa ? 'مدیریت مالی' : 'FINANCE', items: NAV.filter(n => n.parent === 'finance') },
    { id: 'system', label: fa ? 'فضای کار و سیستم' : 'WORKSPACE & SYSTEM', items: NAV.filter(n => n.group === 'system') },
  ];
  const mobileBadge = (to: string) => {
    if (to === '/tasks') return openTaskCount;
    if (to === '/goals') return goalCount;
    if (to === '/habits') return activeHabitCount;
    if (to === '/transactions') return pendingPaymentCount;
    if (to === '/wealth?tab=assets') return data?.assets.length ?? 0;
    if (to === '/wealth?tab=liabilities') return data?.liabilities.length ?? 0;
    return 0;
  };
  return (
    <div className="mealpha-app-shell min-h-screen bg-background text-foreground md:flex">
      <aside className="relative z-50 hidden h-screen w-[88px] shrink-0 md:sticky md:top-0 md:block" aria-label={fa ? 'ناوبری اصلی' : 'Primary navigation'}>
        <div
          className={cn('mealpha-sidebar-panel absolute inset-y-4 start-3 z-50 flex flex-col rounded-[30px] border py-3 text-white shadow-2xl transition-[width] duration-300 ease-out', sidebarExpanded ? 'w-[232px] px-2.5' : 'w-[68px] px-1.5')}
          onMouseEnter={() => setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
          onFocusCapture={() => setSidebarFocused(true)}
          onBlurCapture={event => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSidebarFocused(false);
          }}
        >
          <div className={cn('mb-4 flex min-h-14 items-center gap-1', sidebarExpanded ? 'justify-between' : 'justify-center')}>
            <NavLink to="/" title="MeAlpha" className={cn('flex min-w-0 items-center rounded-2xl transition-colors hover:bg-white/5', sidebarExpanded ? 'flex-1 justify-start gap-2 px-1 py-1' : 'h-14 w-14 min-w-14 shrink-0 justify-center')}>
              <img src="/mealpha.svg" alt="MeAlpha" className="h-14 w-14 min-w-14 shrink-0 rounded-2xl object-contain" />
              {sidebarExpanded && <div className="min-w-0 whitespace-nowrap">
                <div className="text-[15px] font-black tracking-tight text-white">MeAlpha</div>
                <div className="mt-0.5 text-[8px] font-bold tracking-[.16em] text-sky-200/60">PERSONAL COMMAND CENTER</div>
              </div>}
            </NavLink>
            {sidebarExpanded && <button type="button" onClick={() => setSidebarPinned(value => !value)} aria-label={sidebarPinned ? (fa ? 'جمع‌کردن نوار کناری' : 'Unpin sidebar') : (fa ? 'ثابت‌کردن نوار کناری' : 'Pin sidebar')} aria-expanded={sidebarExpanded}
              title={sidebarPinned ? (fa ? 'جمع‌کردن پنل' : 'Collapse sidebar') : (fa ? 'ثابت‌کردن پنل' : 'Pin sidebar')}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-slate-300/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70">
              {sidebarPinned ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </button>}
          </div>

          <button type="button" onClick={() => window.dispatchEvent(new Event('mealpha:open-global-search'))}
            aria-label={fa ? 'جستجوی سراسری' : 'Global search'} title={fa ? 'جستجوی سراسری' : 'Global search'}
            className={cn('mealpha-sidebar-search mb-4 flex h-10 w-full shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] text-start text-[11px] text-slate-300/80 transition-all hover:border-sky-200/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70', sidebarExpanded ? 'px-3' : 'justify-center px-0')}>
            <Search className="h-3.5 w-3.5 shrink-0" />
            {sidebarExpanded && <><span className="min-w-0 flex-1 truncate">{fa ? 'جستجو در برنامه...' : 'Search workspace...'}</span><kbd className="rounded-md border border-white/10 bg-black/10 px-1.5 py-0.5 text-[9px] text-slate-400">Ctrl K</kbd></>}
          </button>

          <nav aria-label={fa ? 'بخش‌های برنامه' : 'App sections'} className="mealpha-sidebar-nav min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-0.5 pt-1">
            {navItems()}

          </nav>

          <div className="mt-3 shrink-0 space-y-2 border-t border-white/10 pt-3">
            <NavLink to="/settings" title={fa ? 'پروفایل و تنظیمات' : 'Profile and settings'}
              className={cn('flex min-h-11 items-center gap-2 rounded-2xl p-1.5 transition-colors hover:bg-white/10', sidebarExpanded ? 'justify-start' : 'justify-center')}>
              <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/15 text-base font-bold text-white shadow-lg" style={{ backgroundColor: settings.avatarColor || '#168be5' }}>
                {settings.avatarDataUrl ? <img src={settings.avatarDataUrl} alt="" className="h-full w-full object-cover" /> : settings.avatarEmoji || 'α'}
              </span>
              {sidebarExpanded && <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-white">{profileLabel}</span>
                <span className="mt-0.5 block truncate text-[10px] text-slate-400">{settings.username ? '@' + settings.username : (fa ? 'حساب من' : 'My account')}</span>
              </span>}
            </NavLink>

            <div className={cn('flex min-h-8 items-center gap-2 text-[10px]', sidebarExpanded ? 'justify-start px-2' : 'justify-center')} role="status" aria-live="polite">
              <span title={online ? (fa ? 'اینترنت متصل' : 'Internet connected') : (fa ? 'بدون اینترنت' : 'Offline')} className="flex items-center gap-2 text-slate-300/70">
                <span className={cn('h-2 w-2 rounded-full', online ? 'bg-emerald-400' : 'bg-amber-400')} />
                {sidebarExpanded && <span>{online ? (fa ? 'اینترنت متصل' : 'Online') : (fa ? 'بدون اینترنت' : 'Offline')}</span>}
              </span>
              {sidebarExpanded && <span className="ms-auto flex min-w-0 items-center gap-1.5 truncate text-slate-300/70" title={dropboxConnected ? (fa ? 'Dropbox متصل' : 'Dropbox connected') : (fa ? 'Dropbox متصل نیست' : 'Dropbox not connected')}>
                <Cloud className="h-3.5 w-3.5 shrink-0" />
                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dropboxConnected ? 'bg-emerald-400' : 'bg-slate-500')} />
                <span className="truncate">{dropboxConnected ? (fa ? 'Dropbox متصل' : 'Dropbox linked') : (fa ? 'Dropbox خاموش' : 'Dropbox off')}</span>
              </span>}
            </div>


          </div>


        </div>
        <GlobalSearch externalTrigger />
      </aside>
      <div className="min-w-0 flex-1">
        <header className="app-topbar sticky top-0 z-40 flex h-[calc(68px+env(safe-area-inset-top))] min-w-0 items-center justify-between gap-1 border-b bg-background/85 px-2.5 pt-[env(safe-area-inset-top)] backdrop-blur-2xl sm:h-[76px] sm:px-5 sm:pt-0 md:px-9">
          <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-3">
            <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border/70 bg-card/70 shadow-sm backdrop-blur-xl md:hidden" ref={mobileMenuTriggerRef} onClick={() => setMobileMenu(v => !v)} aria-label={mobileMenu ? (fa ? 'بستن منو' : 'Close menu') : (fa ? 'بازکردن منو' : 'Open menu')} aria-expanded={mobileMenu} aria-controls="mealpha-mobile-menu" title={mobileMenu ? (fa ? 'بستن منو' : 'Close menu') : (fa ? 'بازکردن منو' : 'Open menu')}>{mobileMenu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}</button>
            <div className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[12px] font-black sm:text-[13px] md:hidden"><img src="/mealpha.svg" alt="" className="h-9 w-9 shrink-0 rounded-xl object-contain shadow-lg shadow-primary/20" />MeAlpha</div>
            <div className="hidden min-w-0 truncate text-xs text-muted-foreground lg:block">{fa ? 'فضای شخصی شما' : 'Your personal workspace'} <span className="mx-2 opacity-40">/</span><span className="font-semibold text-foreground">{currentNav ? (fa ? currentNav.labelFa || t(currentNav.k) : currentNav.labelEn || t(currentNav.k)) : t('dashboard')}</span></div>
          </div>
          <div className="hidden shrink-0 items-center gap-1 md:flex">
            <button type="button" onClick={toggleTheme} aria-label={settings.theme === 'light' ? (fa ? 'شب' : 'Night') : (fa ? 'روز' : 'Day')} title={fa ? 'تغییر پوسته' : 'Toggle theme'} className="flex h-9 items-center gap-1.5 rounded-xl border border-border/70 bg-card/70 px-2 text-[11px] font-semibold text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-secondary">
              {settings.theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <span className="hidden lg:inline">{settings.theme === 'light' ? (fa ? 'شب' : 'Night') : (fa ? 'روز' : 'Day')}</span>
            </button>
            <button type="button" onClick={toggleLang} aria-label={fa ? 'EN' : 'فا'} title={fa ? 'Change language' : 'تغییر زبان'} className="flex h-9 min-w-9 items-center justify-center rounded-xl border border-border/70 bg-card/70 px-2 text-[11px] font-bold text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-secondary">{fa ? 'EN' : 'فا'}</button>
          </div>
          <div ref={headerActionsRef} className="relative flex shrink-0 items-center gap-1 sm:gap-2">
            <button type="button" onClick={() => window.dispatchEvent(new Event('mealpha:open-global-search'))} aria-label={fa ? 'جستجوی سراسری' : 'Global search'} className="grid h-9 w-9 place-items-center rounded-xl border border-border/70 bg-card/70 text-muted-foreground shadow-sm backdrop-blur-xl transition-colors hover:border-primary/40 hover:bg-secondary sm:h-10 sm:w-10 md:hidden"><Search className="h-3.5 w-3.5" /></button>
            <button type="button" className={cn('relative grid h-9 w-9 place-items-center rounded-xl border border-border/70 bg-card/70 shadow-sm backdrop-blur-xl transition-colors hover:bg-secondary sm:h-10 sm:w-10', activePopover === 'notifications' && 'border-primary text-primary')} aria-label={fa ? 'اعلان‌ها' : 'Notifications'} aria-haspopup="dialog" aria-controls="mealpha-notification-center" aria-expanded={activePopover === 'notifications'} onClick={() => setActivePopover(v => v === 'notifications' ? null : 'notifications')}>
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && <span className="absolute -end-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">{notifications.length}</span>}
            </button>
            <button type="button" className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-primary/10 text-sm font-bold text-primary shadow-sm ring-1 ring-primary/20 transition hover:ring-primary/50 sm:h-10 sm:w-10" aria-label={fa ? 'پروفایل کاربری' : 'User profile'} aria-haspopup="dialog" aria-controls="mealpha-profile-menu" aria-expanded={activePopover === 'profile'} onClick={() => setActivePopover(v => v === 'profile' ? null : 'profile')} style={{ backgroundColor: settings.avatarColor || undefined }}>
              {settings.avatarDataUrl ? <img src={settings.avatarDataUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-white">{settings.avatarEmoji || profileLabel.slice(0,1).toUpperCase() || 'α'}</span>}
            </button>
            {activePopover === 'profile' && <div id="mealpha-profile-menu" role="dialog" aria-label={fa ? 'منوی پروفایل' : 'Profile menu'} className="absolute end-0 top-full z-[70] mt-2 max-h-[min(70dvh,32rem)] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-2xl border bg-card shadow-2xl">
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
            {activePopover === 'notifications' && <div id="mealpha-notification-center" role="dialog" aria-label={fa ? 'مرکز اعلان‌ها' : 'Notification center'} className="absolute end-0 top-full z-[70] mt-2 max-h-[min(70dvh,32rem)] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-2xl border bg-card p-3 shadow-2xl">
              <div className="mb-2 flex items-center justify-between"><div className="font-bold text-sm">{fa ? 'مرکز اعلان‌ها' : 'Notifications'}</div><button type="button" aria-label={fa ? 'بستن اعلان‌ها' : 'Close notifications'} onClick={() => setActivePopover(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button></div>
              {notifications.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-center"><Bell className="mx-auto mb-2 h-6 w-6 text-muted-foreground" /><p className="text-sm font-medium">{fa ? 'فعلاً اعلان جدیدی نداری' : 'You are all caught up'}</p><p className="mt-1 text-xs text-muted-foreground">{fa ? 'موعد کارها و پرداخت‌های نزدیک اینجا نمایش داده می‌شود.' : 'Upcoming tasks and payment reminders will appear here.'}</p></div> : <div className="max-h-72 space-y-1 overflow-y-auto">{notifications.map(item => <NavLink key={item.id} to={item.to} onClick={() => setActivePopover(null)} className="flex items-start gap-3 rounded-xl p-3 text-start hover:bg-secondary"><CalendarClock className={cn('mt-0.5 h-4 w-4 shrink-0', item.overdue ? 'text-destructive' : 'text-primary')} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{item.detail}</span></span><ChevronLeft className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" /></NavLink>)}</div>}
              <NavLink to="/transactions" onClick={() => setActivePopover(null)} className="mt-2 flex items-center justify-center rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/15">{fa ? 'مشاهده یادآوری‌های پرداخت' : 'View payment reminders'}</NavLink>
            </div>}

          </div>
        </header>
        {mobileMenu && <>
          <button type="button" aria-label={fa ? 'بستن منوی اصلی' : 'Close main menu'} onClick={() => setMobileMenu(false)}
            className="fixed inset-0 z-[60] bg-slate-950/55 backdrop-blur-sm md:hidden" />
          <section ref={mobileMenuPanelRef} id="mealpha-mobile-menu" role="dialog" aria-modal="true" aria-label={fa ? 'مرکز دسترسی MeAlpha' : 'MeAlpha navigation center'}
            className="mealpha-mobile-menu fixed inset-y-2 start-2 z-[70] flex w-[min(24rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-[28px] border border-border/70 bg-card/95 p-4 shadow-2xl backdrop-blur-2xl md:hidden">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 pb-4">
              <div className="min-w-0">
                <div className="text-[9px] font-black tracking-[.2em] text-primary">MEALPHA / NAVIGATOR</div>
                <h2 className="mt-1 text-lg font-black">{fa ? 'مرکز دسترسی' : 'Navigation center'}</h2>
                <p className="mt-1 text-[11px] text-muted-foreground">{fa ? 'همه بخش‌ها و ابزارهای فضای شخصی' : 'Every module in your personal workspace'}</p>
              </div>
              <button type="button" onClick={() => setMobileMenu(false)} data-mobile-menu-close aria-label={fa ? 'بستن' : 'Close'}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border bg-background/70 text-muted-foreground transition hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 grid shrink-0 grid-cols-3 gap-2">
              <div className="rounded-2xl border bg-background/70 p-2.5">
                <div className="text-lg font-black tabular-nums">{openTaskCount}</div>
                <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{fa ? 'کار باز' : 'Open tasks'}</div>
              </div>
              <div className="rounded-2xl border bg-background/70 p-2.5">
                <div className="text-lg font-black tabular-nums">{goalCount}</div>
                <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{fa ? 'هدف' : 'Goals'}</div>
              </div>
              <div className="rounded-2xl border bg-background/70 p-2.5">
                <div className="text-lg font-black tabular-nums">{pendingPaymentCount}</div>
                <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{fa ? 'پرداخت باز' : 'Open payments'}</div>
              </div>
            </div>

            <div className="mt-3 grid shrink-0 grid-cols-2 gap-2">
              <button type="button" onClick={() => { setMobileMenu(false); window.dispatchEvent(new Event('mealpha:open-global-search')); }}
                className="flex h-10 items-center justify-center gap-2 rounded-xl border bg-background/70 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:bg-primary/5">
                <Search className="h-4 w-4 text-primary" />{fa ? 'جستجوی همه‌جا' : 'Search everything'}
              </button>
              <NavLink to="/focus" onClick={() => setMobileMenu(false)}
                className="flex h-10 items-center justify-center gap-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-lg shadow-primary/15">
                <Timer className="h-4 w-4" />{fa ? 'شروع تمرکز' : 'Start focus'}
              </NavLink>
            </div>

            <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pe-1">
              {mobileGroups.filter(group => group.items.length > 0).map(group => (
                <section key={group.id} aria-labelledby={`mobile-nav-${group.id}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 id={`mobile-nav-${group.id}`} className="text-[9px] font-black tracking-[.16em] text-muted-foreground">{group.label}</h3>
                    <span className="h-px w-8 bg-border" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map(item => {
                      const badge = mobileBadge(item.to);
                      const selected = item.to.includes('?')
                        ? location.pathname + location.search === item.to
                        : location.pathname === item.to;
                      const label = item.parent ? (fa ? item.labelFa : item.labelEn) : t(item.k);
                      return <NavLink key={item.to} to={item.to} onClick={() => setMobileMenu(false)}
                        className={cn('flex min-h-12 min-w-0 items-center gap-2 rounded-2xl border px-3 py-2 text-start transition-all',
                          selected ? 'border-primary/35 bg-primary/10 text-primary shadow-sm' : 'border-border/70 bg-background/65 text-foreground hover:border-primary/25 hover:bg-primary/5')}>
                        <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-xl', selected ? 'bg-primary/15' : 'bg-muted/80')}>
                          <item.icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">{label}</span>
                        {badge > 0 && <span className="min-w-5 rounded-full bg-primary/10 px-1.5 py-0.5 text-center text-[9px] font-black tabular-nums text-primary">{badge}</span>}
                      </NavLink>;
                    })}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-3 grid shrink-0 grid-cols-2 gap-2 border-t border-border/70 pt-3">
              <Button variant="outline" size="sm" className="h-10 rounded-xl" onClick={toggleTheme}>
                {settings.theme === 'light' ? <Moon className="me-2 h-4 w-4" /> : <Sun className="me-2 h-4 w-4" />}
                {fa ? 'تغییر تم' : 'Change theme'}
              </Button>
              <Button variant="outline" size="sm" className="h-10 rounded-xl" onClick={toggleLang}>
                <Languages className="me-2 h-4 w-4" />{fa ? 'English' : 'فارسی'}
              </Button>
            </div>
          </section>
        </>}
        <main className="mx-auto min-h-[calc(100dvh-68px-env(safe-area-inset-top))] w-full max-w-[1600px] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-6 md:min-h-0 md:px-8 md:pb-10 md:pt-8"><Outlet /></main>
      </div>
    </div>
  );
}
