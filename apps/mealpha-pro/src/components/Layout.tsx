import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Target, ListChecks, Repeat, Timer, Receipt, Landmark, Sparkles, Settings, Cloud, Languages, Sun, Moon, Layers3, ChevronRight, Search, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@project/components/lib/utils';
import { useStore } from '../lib/store';
import { Key } from '../lib/i18n';

const NAV: { to: string; k: Key; icon: typeof Target; group: 'overview' | 'manage' | 'system' }[] = [
 {to:'/',k:'dashboard',icon:LayoutDashboard,group:'overview'},{to:'/insights',k:'insights',icon:Sparkles,group:'overview'},
 {to:'/goals',k:'goals',icon:Target,group:'manage'},{to:'/tasks',k:'tasks',icon:ListChecks,group:'manage'},{to:'/habits',k:'habits',icon:Repeat,group:'manage'},{to:'/focus',k:'focus',icon:Timer,group:'manage'},{to:'/transactions',k:'finance',icon:Receipt,group:'manage'},{to:'/wealth',k:'wealth',icon:Landmark,group:'manage'},
 {to:'/workspace',k:'workspace',icon:Layers3,group:'system'},{to:'/settings',k:'settings',icon:Settings,group:'system'}
];
export default function Layout(){
 const {t,settings,setLocalSettings}=useStore(); const [collapsed,setCollapsed]=useState(false); const fa=settings.language==='fa';
 const toggleLang=()=>setLocalSettings({...settings,language:fa?'en':'fa'});
 const toggleTheme=()=>setLocalSettings({...settings,theme:settings.theme==='light'?'dark':'light'});
 const groupTitle=(g:string)=>g==='overview'?(fa?'نمای کلی':'OVERVIEW'):g==='manage'?(fa?'مدیریت':'MANAGEMENT'):(fa?'فضای کار':'WORKSPACE');
 return <div className={cn('ma-shell min-h-screen',collapsed&&'ma-shell-collapsed')}>
  <aside className="ma-sidebar">
   <div className="ma-brand"><div className="ma-brand-mark"><img src="/mealpha.svg" alt="MeAlpha"/></div>{!collapsed&&<div className="min-w-0"><div className="ma-brand-name">MeAlpha</div><div className="ma-brand-caption">DESIGN YOUR LIFE</div></div>}<button type="button" className="ma-collapse" onClick={()=>setCollapsed(v=>!v)} aria-label={collapsed?'Expand sidebar':'Collapse sidebar'}>{collapsed?<PanelLeftOpen size={17}/>:<PanelLeftClose size={17}/>}</button></div>
   <div className="ma-workspace-switch"><div className="ma-workspace-orb">A</div>{!collapsed&&<div className="min-w-0 flex-1"><div className="text-xs font-semibold">{fa?'فضای شخصی':'Personal space'}</div><div className="text-[10px] text-white/45">{fa?'حساب اصلی':'Primary workspace'}</div></div>}</div>
   <nav className="ma-nav">{(['overview','manage','system'] as const).map(group=><div className="ma-nav-group" key={group}>{!collapsed&&<div className="ma-nav-label">{groupTitle(group)}</div>}{NAV.filter(n=>n.group===group).map(n=><NavLink key={n.to} to={n.to} end={n.to==='/'} title={collapsed?t(n.k):undefined} className={({isActive})=>cn('ma-nav-link',isActive&&'active')}><n.icon size={18} strokeWidth={1.8}/>{!collapsed&&<span>{t(n.k)}</span>}<span className="ma-nav-active-dot"/></NavLink>)}</div>)}</nav>
   <div className="ma-sidebar-bottom"><div className="ma-sync-state"><span className="ma-live-dot"/>{!collapsed&&<span>{t('offlineReady')}</span>}</div><div className="ma-sidebar-actions"><button type="button" onClick={toggleTheme}>{settings.theme==='light'?<Moon size={17}/>:<Sun size={17}/>}<span>{fa?(settings.theme==='light'?'حالت تیره':'حالت روشن'):(settings.theme==='light'?'Dark mode':'Light mode')}</span></button><button type="button" onClick={toggleLang}><Languages size={17}/><span>{fa?'English':'فارسی'}</span></button></div>{!collapsed&&<div className="ma-user-mini"><div className="ma-user-avatar">{settings.avatarEmoji||'M'}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{settings.displayName||(fa?'کاربر MeAlpha':'MeAlpha user')}</div><div className="text-[10px] text-white/40">{settings.username?'@'+settings.username:'Personal account'}</div></div><span className="ma-user-presence"/></div>}</div>
  </aside>
  <main className="ma-main"><header className="ma-topbar"><div className="ma-breadcrumb"><span>MeAlpha</span><span className="opacity-30">/</span><strong>{t('dashboard')}</strong></div><div className="ma-topbar-tools"><label className="ma-search"><Search size={16}/><input aria-label="Search" placeholder={fa?'جستجو در فضای کار...':'Search your workspace...'}/><kbd>⌘ K</kbd></label><span className="ma-topbar-divider"/><div className="ma-date-chip">{new Intl.DateTimeFormat(fa?'fa-IR':'en-US',{weekday:'short',month:'short',day:'numeric'}).format(new Date())}</div><div className="ma-top-avatar">{settings.avatarEmoji||'M'}</div></div></header><div className="ma-content"><Outlet/></div><footer className="ma-footer"><span>MEALPHA / PERSONAL OPERATING SYSTEM</span><span>{fa?'ذخیره‌سازی محلی • آماده آفلاین':'LOCAL-FIRST • OFFLINE READY'}</span></footer></main>
 </div>;
}
