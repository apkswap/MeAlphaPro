import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Target, ListChecks, Repeat, Timer, Receipt, Landmark, Sparkles, Settings, WifiOff, Languages, ChevronLeft, Boxes } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { cn } from '@project/components/lib/utils';
import { useStore } from '../lib/store';
import { Key } from '../lib/i18n';

const NAV: { to: string; k: Key; icon: typeof Target; section: 'workspace'|'insights'|'system' }[] = [
 {to:'/',k:'dashboard',icon:LayoutDashboard,section:'workspace'},{to:'/goals',k:'goals',icon:Target,section:'workspace'},{to:'/tasks',k:'tasks',icon:ListChecks,section:'workspace'},{to:'/habits',k:'habits',icon:Repeat,section:'workspace'},{to:'/focus',k:'focus',icon:Timer,section:'workspace'},{to:'/transactions',k:'finance',icon:Receipt,section:'workspace'},{to:'/wealth',k:'wealth',icon:Landmark,section:'workspace'},{to:'/insights',k:'insights',icon:Sparkles,section:'insights'},{to:'/studio',k:'studio',icon:Boxes,section:'system'},{to:'/settings',k:'settings',icon:Settings,section:'system'}
];
export default function Layout(){
 const {t,settings,setLocalSettings}=useStore();
 const toggleLang=()=>{void setLocalSettings({...settings,language:settings.language==='fa'?'en':'fa'});};
 const link=({isActive}:{isActive:boolean})=>cn('group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 whitespace-nowrap',isActive?'bg-gradient-to-r from-violet-500/20 to-cyan-400/10 text-white shadow-inner shadow-violet-400/5':'text-slate-400 hover:bg-white/[.05] hover:text-slate-100');
 const fa=settings.language==='fa';
 return <div className="min-h-screen flex flex-col md:flex-row">
 <aside className="relative z-20 flex shrink-0 flex-col border-b border-white/[.07] bg-[#090d1b]/95 backdrop-blur-xl md:sticky md:top-0 md:h-screen md:w-[258px] md:border-b-0 md:border-e">
 <div className="flex items-center justify-between gap-2 border-b border-white/[.06] px-4 py-5 md:px-5">
 <div className="flex min-w-0 items-center gap-3"><div className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl border border-violet-300/20 bg-gradient-to-br from-violet-500 via-indigo-600 to-cyan-400 shadow-lg shadow-violet-950/50"><span className="text-2xl font-black text-white">{settings.identity?.avatar?.trim() || "M"}</span><span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-cyan-200 shadow-[0_0_8px_#67e8f9]"/></div><div className="min-w-0"><div className="font-black tracking-tight text-slate-50">{settings.identity?.displayName?.trim() || "MeAlpha"} <span className="text-cyan-300">Pro</span></div><div className="text-[10px] tracking-wide text-slate-500">{fa?'طراحی زندگی، سنجش رشد':'DESIGN · MEASURE · GROW'}</div></div></div>
 <Button variant="ghost" size="sm" className="md:hidden h-9 gap-2" onClick={toggleLang}><Languages className="h-4 w-4"/><span>{fa?'EN':'فا'}</span></Button></div>
 <div className="hidden px-5 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[.2em] text-slate-600 md:block">{fa?'فضای کاری':'WORKSPACE'}</div>
 <nav className="flex items-center gap-1 overflow-x-auto px-2 py-2 md:flex-1 md:flex-col md:items-stretch md:overflow-visible md:px-3 md:py-1">
 {NAV.map(n=><NavLink key={n.to} to={n.to} end={n.to==='/'} className={link}>{({isActive})=><><n.icon className={cn('h-[18px] w-[18px] shrink-0 transition-colors',isActive?'text-cyan-200':'text-slate-500 group-hover:text-slate-200')}/><span className="hidden flex-1 md:inline">{t(n.k)}</span>{isActive&&<><span className="hidden h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_#67e8f9] md:block"/><ChevronLeft className="hidden h-3.5 w-3.5 text-slate-500 md:block"/></>}</>}</NavLink>)}
 </nav>
 <div className="hidden space-y-2 p-3 md:block"><div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/[.04] p-3"><div className="flex items-center gap-2 text-xs font-semibold text-emerald-300"><WifiOff className="h-3.5 w-3.5"/>{fa?'حریم خصوصی در اولویت':'LOCAL-FIRST'}</div><p className="mt-1 text-[10px] leading-relaxed text-slate-500">{fa?'اطلاعاتت روی دستگاه خودت ذخیره می‌شود.':'Your data stays on your device.'}</p></div><Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-slate-400" onClick={toggleLang}><Languages className="h-4 w-4"/><span>{fa?'Switch to English':'تغییر زبان به فارسی'}</span></Button><div className="px-3 pb-1 text-[10px] text-slate-600">MEALPHA PRO · STUDIO EDITION</div></div>
 </aside>
 <main className="relative min-h-screen w-full max-w-[1600px] flex-1 p-4 md:p-7 xl:p-9"><div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_0%,rgba(124,58,237,.08),transparent_35%),radial-gradient(ellipse_at_0%_80%,rgba(34,211,238,.04),transparent_35%)]"/><Outlet/></main>
 </div>;
}