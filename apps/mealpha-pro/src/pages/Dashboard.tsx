import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar as RBar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, Bell, CalendarDays, Coins, Flame, Goal, ListChecks, Play, Sparkles, Target, Timer, Wallet } from 'lucide-react';
import { useStore } from '../lib/store';
import { fmtMoney, fmtNum, fmtDate } from '../lib/i18n';
import { goalInfo, habitStats, monthFinance, netWorth, scores, taskStats } from '../lib/analytics';
import { cn } from '@project/components/lib/utils';

const panel = 'rounded-[22px] border border-sky-400/20 bg-gradient-to-br from-[#0d2347]/95 via-[#091a38]/95 to-[#07152e]/95 shadow-[0_18px_45px_-28px_rgba(0,160,255,.5)] backdrop-blur-xl';
const money = (value: number, L: 'fa' | 'en', currency: string) => fmtMoney(L, value, currency);

export default function Dashboard() {
  const { data, t, settings } = useStore();
  const d = data!, L = settings.language, cur = settings.currency;
  const fa = L === 'fa';
  const month = monthFinance(d.transactions, settings);
  const nw = netWorth(d.assets, d.liabilities, settings);
  const ts = taskStats(d.tasks);
  const sc = scores(d, settings);
  const goals = d.goals.map(g => ({ g, info: goalInfo(g) })).filter(x => x.info.status !== 'Completed').slice(0, 4);
  const activeHabits = d.habits.filter(h => !h.archived);
  const doneHabits = activeHabits.filter(h => habitStats(h, d.habitLogs).doneToday).length;
  const months = [5,4,3,2,1,0].map(offset => {
    const m = monthFinance(d.transactions, settings, offset);
    const date = new Date(); date.setMonth(date.getMonth() - offset);
    return { month: new Intl.DateTimeFormat(fa ? 'fa-IR-u-ca-persian' : 'en-US', { month: 'short' }).format(date), income: m.income, expense: m.expense };
  });
  const week = Array.from({length:7}, (_,i) => {
    const date = new Date(); date.setDate(date.getDate() - (6-i));
    const key = date.toISOString().slice(0,10);
    const due = d.tasks.filter(x => x.dueDate === key);
    const done = due.filter(x => x.status === 'Done').length;
    return { day: new Intl.DateTimeFormat(fa ? 'fa-IR' : 'en-US', { weekday:'short' }).format(date), value: due.length ? Math.round(done/due.length*100) : 0 };
  });
  const overall = sc.overall ?? 0;
  const progressColor = '#18d5e5';
  const topCards = [
    { label: fa ? 'سرمایه کل' : 'Total net worth', value: money(nw.net,L,cur), hint: fa ? 'ارزش خالص دارایی‌ها' : 'Assets minus liabilities', icon: Wallet, color: 'amber', change: null },
    { label: fa ? 'درآمد ماه' : 'Monthly income', value: money(month.income,L,cur), hint: fa ? 'درآمد ثبت‌شده این ماه' : 'Income recorded this month', icon: Coins, color: 'teal', change: null },
    { label: fa ? 'هزینه ماه' : 'Monthly expenses', value: money(month.expense,L,cur), hint: fa ? 'هزینه ثبت‌شده این ماه' : 'Expenses recorded this month', icon: Wallet, color: 'rose', change: null },
    { label: fa ? 'درصد پیشرفت' : 'Overall progress', value: sc.overall == null ? '—' : fmtNum(L,overall)+'%', hint: fa ? 'بر اساس داده‌های ثبت‌شده' : 'Based on your recorded activity', icon: Activity, color: 'blue', change: null },
  ];
  const today = new Date();
  const dateText = fmtDate(L, settings.calendar, today.toISOString().slice(0,10));
  const chartTooltip = { background:'#07152e', border:'1px solid rgba(56,189,248,.25)', borderRadius:12, color:'#e8f4ff' };
  return (
    <div className="me-dashboard space-y-5" dir={fa ? 'rtl' : 'ltr'}>
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-sky-400/15 bg-[#071831]/75 px-5 py-4 shadow-lg shadow-sky-950/20">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-sky-500/10 text-sky-300"><CalendarDays className="h-6 w-6"/></div>
          <div><div className="text-sm font-bold text-slate-100">{dateText}</div><div className="text-xs text-slate-400">{fa ? 'به مسیر رشدت ادامه بده' : 'Keep moving forward'}</div></div>
        </div>
        <div className="min-w-0 text-end">
          <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">{fa ? `سلام، ${settings.displayName || 'بهترِ خودت'}؛ خوش اومدی` : `Welcome back, ${settings.displayName || 'to your best self'}`}</h1>
          <p className="mt-1 text-xs text-slate-400">{fa ? 'با برنامه‌ریزی هوشمند، زندگی متعادل‌تری بساز.' : 'Build a more intentional and balanced life.'}</p>
        </div>
        <div className="flex items-center gap-2 text-sky-300"><Bell className="h-5 w-5"/><span className="hidden text-xs sm:inline">{fa ? 'داشبورد شخصی' : 'Personal dashboard'}</span></div>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {topCards.map((item) => {
          const Icon = item.icon;
          const colors: Record<string,string> = {amber:'from-amber-400/20 to-amber-500/5 border-amber-400/40 text-amber-300',teal:'from-emerald-400/20 to-teal-500/5 border-emerald-400/40 text-emerald-300',rose:'from-rose-400/20 to-pink-500/5 border-rose-400/40 text-rose-300',blue:'from-sky-400/20 to-blue-500/5 border-sky-400/40 text-sky-300'};
          return <div key={item.label} className={cn('relative min-h-[150px] overflow-hidden rounded-[20px] border bg-gradient-to-br p-5 shadow-xl',colors[item.color])}>
            <div className="absolute -bottom-10 -left-6 h-24 w-40 rounded-full bg-current opacity-[.08] blur-2xl"/>
            <div className="relative flex items-center justify-between"><span className="text-sm font-bold text-slate-100">{item.label}</span><Icon className="h-6 w-6"/></div>
            <div className="relative mt-6 break-words text-xl font-black leading-tight text-white sm:text-2xl">{item.value}</div>
            <div className="relative mt-3 text-xs text-slate-300">{item.hint}</div>
          </div>;
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className={cn(panel,'min-h-[310px] p-5')}>
          <div className="mb-4 flex items-center justify-between"><h2 className="font-extrabold text-slate-100">{fa ? 'روند جریان مالی ماهانه' : 'Monthly cash flow'}</h2><Activity className="h-5 w-5 text-cyan-300"/></div>
          <div className="h-[245px]" dir="ltr"><ResponsiveContainer width="100%" height="100%"><AreaChart data={months}>
            <defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16d6ae" stopOpacity={.38}/><stop offset="100%" stopColor="#16d6ae" stopOpacity={0}/></linearGradient><linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff963d" stopOpacity={.3}/><stop offset="100%" stopColor="#ff963d" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid stroke="rgba(125,180,230,.14)" strokeDasharray="4 4"/><XAxis dataKey="month" stroke="#9bb4d0" tick={{fontSize:11}}/><YAxis stroke="#9bb4d0" tick={{fontSize:10}} width={48}/><Tooltip contentStyle={chartTooltip}/><Area type="monotone" dataKey="income" name={fa?'درآمد':'Income'} stroke="#18d5a8" strokeWidth={3} fill="url(#incomeFill)"/><Area type="monotone" dataKey="expense" name={fa?'هزینه':'Expense'} stroke="#ff963d" strokeWidth={3} fill="url(#expenseFill)"/>
          </AreaChart></ResponsiveContainer></div>
          <div className="mt-1 flex justify-center gap-5 text-xs text-slate-300"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-emerald-400"/> {fa?'درآمد':'Income'}</span><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-orange-400"/> {fa?'هزینه':'Expense'}</span></div>
        </div>
        <div className={cn(panel,'min-h-[310px] p-5')}>
          <div className="mb-4 flex items-center justify-between"><h2 className="font-extrabold text-slate-100">{fa ? 'عملکرد هفتگی' : 'Weekly performance'}</h2><Activity className="h-5 w-5 text-cyan-300"/></div>
          <div className="h-[270px]" dir="ltr"><ResponsiveContainer width="100%" height="100%"><BarChart data={week}>
            <CartesianGrid stroke="rgba(125,180,230,.14)" strokeDasharray="4 4"/><XAxis dataKey="day" stroke="#9bb4d0" tick={{fontSize:11}}/><YAxis domain={[0,100]} stroke="#9bb4d0" tick={{fontSize:10}}/><Tooltip contentStyle={chartTooltip} formatter={(v:any)=>[`${v}%`,fa?'تکمیل':'Completion']}/><RBar dataKey="value" radius={[7,7,0,0]}>{week.map((_,i)=><Cell key={i} fill={i%2?'#0da8ef':'#18d5d0'}/>)}</RBar>
          </BarChart></ResponsiveContainer></div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_1fr_1fr]">
        <div className={cn(panel,'p-5')}>
          <div className="mb-5 flex items-center justify-between"><h2 className="font-extrabold text-slate-100">{fa?'پیشرفت اهداف':'Goal progress'}</h2><Target className="h-6 w-6 text-cyan-300"/></div>
          {goals.length ? <div className="space-y-5">{goals.map(({g,info})=><div key={g.id} className="space-y-2"><div className="flex items-center justify-between gap-2 text-sm"><span className="truncate text-slate-100">{g.title}</span><span className="font-bold text-cyan-300">{info.progress == null ? '—' : fmtNum(L,info.progress*100)+'%'}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400" style={{width:`${(info.progress||0)*100}%`}}/></div></div>)}</div> : <p className="py-8 text-center text-sm text-slate-400">{t('empty')}</p>}
          <Link to="/goals" className="mt-5 inline-flex text-xs font-bold text-cyan-300 hover:text-white">{fa?'همه اهداف ←':'All goals →'}</Link>
        </div>
        <div className={cn(panel,'flex flex-col items-center justify-center p-5 text-center')}>
          <div className="mb-3 flex w-full items-center justify-between"><h2 className="font-extrabold text-slate-100">{fa?'تایمر تمرکز':'Focus timer'}</h2><Timer className="h-6 w-6 text-cyan-300"/></div>
          <div className="relative my-2 grid h-40 w-40 place-items-center rounded-full border-[9px] border-slate-800 shadow-[0_0_35px_rgba(0,190,255,.12)]"><div className="absolute inset-[-9px] rounded-full border-[9px] border-transparent border-t-cyan-400 border-l-sky-500 rotate-[-35deg]"/><div className="text-4xl font-black tracking-wider text-white" dir="ltr">25:00</div></div>
          <p className="mt-2 text-xs text-slate-400">{fa?'تمرکز عمیق برای موفقیت بیشتر':'Deep focus for better progress'}</p>
          <Link to="/focus" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-900/40"><Play className="h-4 w-4"/>{fa?'شروع تمرکز':'Start focus'}</Link>
        </div>
        <div className="relative min-h-[260px] overflow-hidden rounded-[22px] border border-indigo-300/20 bg-[radial-gradient(ellipse_at_70%_15%,rgba(129,105,255,.48),transparent_45%),linear-gradient(150deg,#252c69,#111b48_58%,#07152e)] p-5 shadow-xl">
          <div className="absolute -bottom-2 left-0 right-0 h-28 bg-[linear-gradient(155deg,transparent_0_25%,#101b42_26%_45%,transparent_46%),linear-gradient(25deg,#080f2a_0_36%,transparent_37%),linear-gradient(160deg,transparent_0_35%,#18295a_36%_60%,transparent_61%)] opacity-90"/>
          <div className="relative z-10 flex h-full min-h-[220px] flex-col justify-between text-end"><Sparkles className="ms-auto h-6 w-6 text-amber-300"/><div><p className="text-lg font-bold leading-9 text-white">{fa?'«هر قدم کوچک، تو را به هدف‌های بزرگ‌تر نزدیک‌تر می‌کند.»':'“Every small step brings you closer to bigger goals.”'}</p><Link to="/goals" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-sky-300/40 bg-sky-500/20 px-4 py-2.5 text-xs font-bold text-white backdrop-blur">{fa?'شروع برنامه‌ریزی جدید':'Plan something new'} <Goal className="h-4 w-4"/></Link></div></div>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-3">
        <Link to="/tasks" className={cn(panel,'flex items-center gap-3 p-4 transition hover:border-cyan-300/50')}><ListChecks className="h-5 w-5 text-cyan-300"/><span className="text-sm font-bold text-slate-100">{t('todayTasks')}</span><span className="ms-auto text-sm font-black text-cyan-300">{fmtNum(L,ts.todays.length)}</span></Link>
        <Link to="/habits" className={cn(panel,'flex items-center gap-3 p-4 transition hover:border-cyan-300/50')}><Flame className="h-5 w-5 text-orange-300"/><span className="text-sm font-bold text-slate-100">{t('habitsToday')}</span><span className="ms-auto text-sm font-black text-cyan-300">{fmtNum(L,doneHabits)}/{fmtNum(L,activeHabits.length)}</span></Link>
        <Link to="/insights" className={cn(panel,'flex items-center gap-3 p-4 transition hover:border-cyan-300/50')}><Sparkles className="h-5 w-5 text-violet-300"/><span className="text-sm font-bold text-slate-100">{t('insights')}</span><span className="ms-auto text-sm font-black text-cyan-300">{sc.overall == null ? '—' : fmtNum(L,sc.overall)}</span></Link>
      </section>
    </div>
  );
}
