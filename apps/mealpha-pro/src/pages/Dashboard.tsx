import { Link } from 'react-router-dom';
import { Bar as RBar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight, Check, Flame, Plus, Sparkles, Wallet, Target, CalendarDays, Clock3, ChevronLeft, ChevronRight } from 'lucide-react';
import { Checkbox } from '@project/components/ui/checkbox';
import { useStore } from '../lib/store';
import { fmtMoney, fmtNum } from '../lib/i18n';
import { goalInfo, habitStats, monthFinance, netWorth, scores, taskStats } from '../lib/analytics';
import { Bar, Kpi, Panel, PageHeader, StatusPill } from '../components/ui-bits';
import { statusKey } from './Goals';
import { completeTx } from './Tasks';
import { useHabitToggle } from './Habits';
import GrowthEngine from '../components/GrowthEngine';
import { cn } from '@project/components/lib/utils';

export default function Dashboard() {
  const { data, t, settings, save } = useStore();
  const d = data!, L = settings.language, cur = settings.currency, fa = L === 'fa';
  const sc = scores(d, settings), ts = taskStats(d.tasks), m = monthFinance(d.transactions, settings);
  const nw = netWorth(d.assets, d.liabilities, settings, d.transactions);
  const goals = d.goals.map((g) => ({ g, i: goalInfo(g) })).filter((x) => x.i.status !== 'Completed');
  const atRisk = goals.filter((x) => x.i.status === 'At Risk' || x.i.status === 'Delayed');
  const habits = d.habits.filter((h) => !h.archived);
  const doneHabits = habits.filter((h) => habitStats(h, d.habitLogs).doneToday).length;
  const { toggle, busy } = useHabitToggle();
  const chart = [5, 4, 3, 2, 1, 0].map((o) => { const x = monthFinance(d.transactions, settings, o); return { name: x.label.slice(2), [t('income')]: x.income, [t('expense')]: x.expense }; });
  const todayList = [...ts.todays, ...ts.overdue.filter((x) => !ts.todays.includes(x))].slice(0, 6);
  const greeting = fa ? 'خوش اومدی،' : 'Welcome back,';
  const displayName = settings.displayName || settings.username || (fa ? 'دوست من' : 'there');
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border bg-card p-5 shadow-sm sm:p-7">
        <div className="pointer-events-none absolute -end-20 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 start-1/3 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-2xl">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-primary"><Sparkles className="h-4 w-4" />{fa ? 'مرکز فرماندهی شخصی' : 'PERSONAL COMMAND CENTER'}</div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{greeting} {displayName}</h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{fa ? 'یک نگاه به وضعیت مالی، اهداف و ریتم امروزت داشته باش.' : 'Your money, goals and daily rhythm — all in one clear view.'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/transactions" className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20"><Plus className="h-4 w-4" />{fa ? 'ثبت تراکنش' : 'Add transaction'}</Link>
            <Link to="/tasks" className="inline-flex h-10 items-center gap-2 rounded-xl border bg-background/70 px-4 text-xs font-semibold hover:bg-secondary"><CalendarDays className="h-4 w-4" />{fa ? 'برنامه امروز' : 'Today plan'}</Link>
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="rounded-2xl border bg-background/65 p-4"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{t('netWorth')}</span><Wallet className="h-4 w-4 text-primary" /></div><div className="mt-2 break-words text-xl font-black tabular-nums sm:text-2xl">{fmtMoney(L,nw.net,cur)}</div><div className="mt-1 text-[10px] text-muted-foreground">{fa ? 'دارایی خالص ثبت‌شده' : 'Recorded net worth'}</div></div>
          <div className="rounded-2xl border bg-background/65 p-4"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{t('cashFlow')}</span>{m.net >= 0 ? <ArrowUpRight className="h-4 w-4 text-emerald-500" /> : <ArrowDownRight className="h-4 w-4 text-rose-500" />}</div><div className={cn('mt-2 break-words text-xl font-black tabular-nums sm:text-2xl',m.net >= 0 ? 'text-emerald-500' : 'text-rose-500')}>{fmtMoney(L,m.net,cur)}</div><div className="mt-1 text-[10px] text-muted-foreground">{fa ? 'خالص این ماه' : 'Net this month'}</div></div>
          <div className="rounded-2xl border bg-background/65 p-4"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{t('overallScore')}</span><Sparkles className="h-4 w-4 text-primary" /></div><div className="mt-2 text-xl font-black tabular-nums sm:text-2xl">{sc.overall == null ? '—' : fmtNum(L,sc.overall)}<span className="ms-1 text-xs font-medium text-muted-foreground">/100</span></div><div className="mt-1 text-[10px] text-muted-foreground">{fa ? 'بر اساس داده‌های ثبت‌شده' : 'Based on recorded data'}</div></div>
          <div className="rounded-2xl border bg-background/65 p-4"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{t('habitsToday')}</span><Target className="h-4 w-4 text-primary" /></div><div className="mt-2 text-xl font-black tabular-nums sm:text-2xl">{fmtNum(L,doneHabits)}<span className="mx-1 text-muted-foreground">/</span>{fmtNum(L,habits.length)}</div><div className="mt-1 text-[10px] text-muted-foreground">{fa ? 'عادت انجام‌شده امروز' : 'Habits completed today'}</div></div>
        </div>
      </section>
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel title={fa ? 'جریان مالی' : 'Cash flow'} action={<Link to="/transactions" className="text-xs font-semibold text-primary">{fa ? 'همه تراکنش‌ها' : 'All transactions'} ↗</Link>}>
          <div className="mb-3 flex flex-wrap items-center gap-2"><span className="text-2xl font-black">{fmtMoney(L,m.net,cur)}</span><span className={cn('rounded-full px-2 py-1 text-[10px] font-bold',m.net >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500')}>{m.savingsRate == null ? '—' : fmtNum(L,m.savingsRate*100)+'%'} {fa ? 'نرخ پس‌انداز' : 'savings rate'}</span></div>
          <div className="h-60" dir="ltr"><ResponsiveContainer><BarChart data={chart} barGap={5}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} /><XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={false} tickLine={false} /><YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} width={54} axisLine={false} tickLine={false} /><Tooltip contentStyle={{background:'hsl(var(--popover))',border:'1px solid hsl(var(--border))',borderRadius:14,fontSize:12}} /><RBar dataKey={t('income')} fill="hsl(var(--chart-3))" radius={[5,5,0,0]} /><RBar dataKey={t('expense')} fill="hsl(var(--chart-5))" radius={[5,5,0,0]} /></BarChart></ResponsiveContainer></div>
        </Panel>
        <Panel title={fa ? 'نمای کلی عملکرد' : 'Performance overview'}>
          <div className="grid grid-cols-2 gap-3">
            <Kpi label={t('completionRate')} value={ts.completionRate == null ? '—' : fmtNum(L,ts.completionRate*100)+'%'} tone={ts.overdue.length ? 'bad' : 'good'} hint={t('completionRate')} />
            <Kpi label={t('activeGoals')} value={fmtNum(L,goals.length)} hint={fa ? 'هدف فعال' : 'Active goals'} />
            <Kpi label={t('atRisk')} value={fmtNum(L,atRisk.length)} tone={atRisk.length ? 'bad' : 'good'} />
            <Kpi label={t('income')} value={fmtMoney(L,m.income,cur)} tone="good" />
          </div>
          {settings.monthlyBudget ? <div className="mt-5 rounded-xl bg-muted/60 p-3"><div className="mb-2 flex justify-between text-xs"><span>{t('budgetUsed')}</span><b>{fmtNum(L,Math.min(100,m.expense/settings.monthlyBudget*100))}%</b></div><Bar value={Math.min(1,m.expense/settings.monthlyBudget)} /><div className="mt-2 text-[10px] text-muted-foreground">{fmtMoney(L,m.expense,cur)} / {fmtMoney(L,settings.monthlyBudget,cur)}</div></div> : null}
        </Panel>
      </div>
      <GrowthEngine />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={t('todayTasks')} action={<Link to="/tasks" className="text-xs font-semibold text-primary">{fa ? 'مشاهده همه' : 'View all'} ↗</Link>}>
          {todayList.length === 0 ? <div className="grid min-h-28 place-items-center text-sm text-muted-foreground">{t('empty')}</div> : <ul className="space-y-3">{todayList.map(x => <li key={x.id} className="flex items-center gap-3 text-sm"><Checkbox checked={x.status === 'Done'} onCheckedChange={() => save('tasks',completeTx({status:x.status === 'Done' ? 'Todo' : 'Done'},x),x.id)} /><span className={cn('min-w-0 flex-1 truncate',x.status === 'Done' && 'line-through text-muted-foreground')}>{x.title}</span>{ts.overdue.includes(x) && <span className="text-[10px] text-destructive">{t('overdue')}</span>}</li>)}</ul>}
        </Panel>
        <Panel title={t('habitsToday')} action={<Link to="/habits" className="text-xs font-semibold text-primary">{fa ? 'تقویم عادت‌ها' : 'Habit calendar'} ↗</Link>}>
          {habits.length === 0 ? <div className="grid min-h-28 place-items-center text-sm text-muted-foreground">{t('empty')}</div> : <ul className="space-y-3">{habits.slice(0,6).map(h => { const s=habitStats(h,d.habitLogs); return <li key={h.id} className="flex items-center gap-3 text-sm"><button disabled={busy===h.id} onClick={()=>toggle(h)} className={cn('grid h-7 w-7 place-items-center rounded-lg border transition-colors',s.doneToday?'border-emerald-500 bg-emerald-500 text-white':'hover:border-primary')}><Check className="h-4 w-4" /></button><span className="min-w-0 flex-1 truncate">{h.name}</span><span className="flex items-center gap-1 text-xs text-muted-foreground"><Flame className="h-3.5 w-3.5 text-orange-500" />{fmtNum(L,s.current)}</span></li>})}</ul>}
        </Panel>
        <Panel title={t('goals')} action={<Link to="/goals" className="text-xs font-semibold text-primary">{fa ? 'همه اهداف' : 'All goals'} ↗</Link>}>
          {goals.length === 0 ? <div className="grid min-h-28 place-items-center text-sm text-muted-foreground">{t('empty')}</div> : <ul className="space-y-4">{goals.slice(0,5).map(({g,i})=><li key={g.id} className="space-y-2"><div className="flex items-center justify-between gap-2 text-xs"><span className="truncate font-semibold">{g.title}</span><StatusPill status={i.status} label={t(statusKey[i.status])} /></div><Bar value={i.progress} /></li>)}</ul>}
        </Panel>
      </div>
      <Panel title={fa ? 'شروع سریع' : 'Quick access'}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[{to:'/goals',icon:Target,label:t('goals')},{to:'/focus',icon:Clock3,label:t('focus')},{to:'/wealth',icon:Wallet,label:t('wealth')},{to:'/insights',icon:Sparkles,label:t('insights')}].map(x=><Link key={x.to} to={x.to} className="flex items-center gap-3 rounded-xl border bg-background/60 p-3 text-xs font-semibold transition hover:border-primary/50 hover:bg-primary/5"><x.icon className="h-4 w-4 text-primary" />{x.label}<ChevronRight className="ms-auto h-3.5 w-3.5 opacity-50 rtl:rotate-180" /></Link>)}
        </div>
      </Panel>
    </div>
  );
}
