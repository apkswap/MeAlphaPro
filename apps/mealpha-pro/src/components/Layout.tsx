import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Target, ListChecks, Repeat, Timer, Receipt, Landmark, Sparkles, Settings, Cloud, Languages } from 'lucide-react';
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
];

export default function Layout() {
  const { t, settings, setLocalSettings } = useStore();
  const toggleLang = () => {
    const s = { ...settings, language: settings.language === 'fa' ? 'en' as const : 'fa' as const };
    setLocalSettings(s);
  };
  const link = ({ isActive }: { isActive: boolean }) =>
    cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
      isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary');

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-60 md:h-screen md:sticky md:top-0 border-b md:border-b-0 md:border-e bg-[hsl(var(--sidebar-background))]/80 backdrop-blur flex md:flex-col">
        <div className="p-4 md:p-5 flex items-center gap-2 shrink-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center font-black text-white">α</div>
          <div className="hidden md:block">
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
          <Button variant="ghost" size="sm" className="justify-start gap-2" onClick={toggleLang}><Languages className="h-4 w-4" /><span className="hidden md:inline">{settings.language === 'fa' ? 'English' : 'فارسی'}</span></Button>
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-emerald-500"><Cloud className="h-4 w-4" /><span className="hidden md:inline">{t('offlineReady')}</span></div>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto"><Outlet /></main>
    </div>
  );
}
