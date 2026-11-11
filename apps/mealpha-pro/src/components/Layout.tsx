import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Target, ListChecks, Repeat, Timer, Receipt, Landmark, Sparkles, Settings, Languages, Layers3, Sun, Moon, Search, Bell, Cloud, Menu, X } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { cn } from '@project/components/lib/utils';
import { useStore } from '../lib/store';
import { Key } from '../lib/i18n';

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
  const { t, settings, setLocalSettings } = useStore();
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [mobileMenu, setMobileMenu] = useState(false);
  const location = useLocation();
  useEffect(() => { const on = () => setOnline(true); const off = () => setOnline(false); window.addEventListener('online', on); window.addEventListener('offline', off); return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); }; }, []);
  useEffect(() => setMobileMenu(false), [location.pathname]);
  const toggleTheme = () => setLocalSettings({ ...settings, theme: settings.theme === 'light' ? 'dark' : 'light' });
  const toggleLang = () => setLocalSettings({ ...settings, language: settings.language === 'fa' ? 'en' : 'fa' });
  const fa = settings.language === 'fa';
  const dropboxConnected = Boolean(settings.dropboxRefreshToken || settings.dropboxAccessToken);
  const groups = [
    { id: 'main', label: fa ? 'نمای کلی' : 'OVERVIEW' },
    { id: 'manage', label: fa ? 'مدیریت زندگی' : 'LIFE MANAGEMENT' },
    { id: 'system', label: fa ? 'فضای کار' : 'WORKSPACE' },
  ] as const;
  const navLink = ({ isActive }: { isActive: boolean }) => cn(
    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200',
    isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
  );
  const navItems = (mobile = false) => groups.map(group => (
    <div key={group.id} className={mobile ? '' : 'mb-5'}>
      {!mobile && <div className="px-3 pb-2 text-[9px] font-bold tracking-[.16em] text-muted-foreground/70">{group.label}</div>}
      <div className={mobile ? 'flex justify-around gap-1' : 'space-y-1'}>
        {NAV.filter(n => n.group === group.id && (!mobile || ['/', '/tasks', '/habits', '/transactions', '/settings'].includes(n.to))).map(n => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={mobile ? ({ isActive }) => cn('flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[9px]', isActive ? 'text-primary' : 'text-muted-foreground') : navLink}>
            <n.icon className={mobile ? 'h-5 w-5' : 'h-[17px] w-[17px] shrink-0'} />
            <span className={mobile ? 'max-w-full truncate' : 'truncate'}>{t(n.k)}</span>
          </NavLink>
        ))}
      </div>
    </div>
  ));
  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-[248px] md:shrink-0 md:flex-col md:border-e md:border-sidebar-border md:bg-sidebar-background/90 md:px-4 md:py-5 md:backdrop-blur-xl">
        <NavLink to="/" className="mb-8 flex items-center gap-3 px-2">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25"><img src="/mealpha-infinity.png" alt="MeAlpha" className="h-8 w-8 object-contain" /></div>
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
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b bg-background/80 px-4 backdrop-blur-xl md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button className="grid h-9 w-9 place-items-center rounded-xl border md:hidden" onClick={() => setMobileMenu(v => !v)} aria-label={fa ? 'بازکردن منو' : 'Open menu'}>{mobileMenu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}</button>
            <div className="md:hidden text-sm font-black">MeAlpha <span className="text-primary">Pro</span></div>
            <div className="hidden text-xs text-muted-foreground sm:block">{fa ? 'فضای شخصی شما' : 'Your personal workspace'} <span className="mx-2 opacity-40">/</span><span className="font-semibold text-foreground">{t(NAV.find(n => n.to === location.pathname)?.k ?? 'dashboard')}</span></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden h-9 w-56 items-center gap-2 rounded-xl border bg-card/70 px-3 lg:flex"><Search className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">{fa ? 'جستجو در برنامه...' : 'Search your workspace...'}</span><kbd className="ms-auto rounded border px-1.5 py-0.5 text-[9px] text-muted-foreground">⌘ K</kbd></div>
            <button className="relative grid h-9 w-9 place-items-center rounded-xl border bg-card/70 text-muted-foreground hover:text-foreground" aria-label={fa ? 'اعلان‌ها' : 'Notifications'}><Bell className="h-4 w-4" /><span className="absolute end-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" /></button>
            <button className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-sm font-bold text-primary">{(settings.displayName || settings.username || 'α').slice(0,1).toUpperCase()}</button>
          </div>
        </header>
        {mobileMenu && <div className="absolute inset-x-0 top-[68px] z-40 border-b bg-background p-4 shadow-xl md:hidden"><div className="grid grid-cols-2 gap-2">{NAV.map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({isActive}) => cn('flex items-center gap-2 rounded-xl p-3 text-sm', isActive ? 'bg-primary/10 text-primary' : 'bg-card text-muted-foreground')}><n.icon className="h-4 w-4" />{t(n.k)}</NavLink>)}</div><div className="mt-3 flex gap-2"><Button variant="outline" size="sm" onClick={toggleTheme}>{settings.theme === 'light' ? <Moon className="me-2 h-4 w-4" /> : <Sun className="me-2 h-4 w-4" />}{fa ? 'تغییر تم' : 'Toggle theme'}</Button><Button variant="outline" size="sm" onClick={toggleLang}><Languages className="me-2 h-4 w-4" />{fa ? 'English' : 'فارسی'}</Button></div></div>}
        <main className="mx-auto w-full max-w-[1600px] px-4 pb-24 pt-6 sm:px-6 md:px-8 md:pb-10 md:pt-8"><Outlet /></main>
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-1 backdrop-blur-xl md:hidden">{navItems(true)}</nav>
      </div>
    </div>
  );
}
