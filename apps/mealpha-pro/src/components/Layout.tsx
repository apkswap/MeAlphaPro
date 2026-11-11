import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Target, ListChecks, Repeat, Timer, Receipt, Landmark, Sparkles, Settings, Cloud, Languages, Layers3, Sun, Moon } from 'lucide-react';
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

export default function Layout() {
  const { t, settings, setLocalSettings } = useStore();
  const toggleTheme = () => setLocalSettings({ ...settings, theme: settings.theme === 'light' ? 'dark' : 'light' });
  const toggleLang = () => {
    const s = { ...settings, language: settings.language === 'fa' ? 'en' as const : 'fa' as const };
    setLocalSettings(s);
  };
  const link = ({ isActive }: { isActive: boolean }) =>
    cn('flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 md:gap-2.5 px-1.5 md:px-2.5 py-2 md:py-2.5 rounded-xl text-[10px] md:text-[13px] font-medium transition-colors',
      isActive ? 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80');

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-52 md:min-w-52 md:h-screen md:sticky md:top-0 border-b md:border-b-0 md:border-e bg-[hsl(var(--sidebar-background))]/80 backdrop-blur flex flex-col">
        <div className="p-3 md:p-4 flex items-center gap-2.5 shrink-0">
          <div className="h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/20 to-accent/10 p-0.5 shadow-lg shadow-primary/10">
            <img src="/mealpha-infinity.png" alt="MeAlpha" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold leading-tight text-sm md:text-[15px]">MeAlpha Pro</div>
            <div className="text-[9px] text-muted-foreground tracking-wide">{t('appTagline')}</div>
          </div>
        </div>
        <nav aria-label="Main navigation" className="grid grid-cols-5 md:flex md:flex-col gap-1.5 px-2 md:px-2.5 py-2 md:py-3 overflow-visible md:overflow-x-visible md:overflow-y-auto md:flex-1 items-stretch border-y md:border-y-0">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={link}>
              <n.icon className="h-4 w-4 shrink-0" /><span>{t(n.k)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-2 md:p-2.5 flex flex-row md:flex-col justify-end md:justify-start gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="h-8 justify-start gap-2 px-2 text-xs" onClick={toggleTheme}>{settings.theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}<span>{settings.theme === 'light' ? (settings.language === 'fa' ? 'حالت تاریک' : 'Dark mode') : (settings.language === 'fa' ? 'حالت روشن' : 'Light mode')}</span></Button>
          <Button variant="ghost" size="sm" className="justify-start gap-2" onClick={toggleLang}><Languages className="h-4 w-4" /><span>{settings.language === 'fa' ? 'English' : 'فارسی'}</span></Button>
          <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-emerald-500"><Cloud className="h-4 w-4" /><span>{t('offlineReady')}</span></div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-4 md:p-8 max-w-7xl w-full mx-auto"><Outlet /></main>
    </div>
  );
}
