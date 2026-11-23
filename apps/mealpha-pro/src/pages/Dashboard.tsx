import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar as RBar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight, Check, Flame, Plus, Sparkles, Wallet, Target, CalendarDays, Clock3, ChevronLeft, ChevronRight, Eye, EyeOff, Trash2, NotebookPen } from 'lucide-react';
import { Checkbox } from '@project/components/ui/checkbox';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Textarea } from '@project/components/ui/textarea';
import { useStore } from '../lib/store';
import { fmtMoney, fmtNum } from '../lib/i18n';
import { goalInfo, habitStats, monthFinance, netWorth, scores, taskStats, todayISO } from '../lib/analytics';
import { Bar, Kpi, Panel, PageHeader, StatusPill } from '../components/ui-bits';
import { statusKey } from './Goals';
import { completeTx } from './Tasks';
import { useHabitToggle } from './Habits';
import GrowthEngine from '../components/GrowthEngine';
import MoneyEquivalents from '../components/MoneyEquivalents';
import { cn } from '@project/components/lib/utils';

export default function Dashboard() {
  const { data, t, settings, save, remove } = useStore();
  const d = data!, L = settings.language, cur = settings.currency, fa = L === 'fa';
  const [showMoney, setShowMoney] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => todayISO());
  const [newDailyTask, setNewDailyTask] = useState('');
  const [journalText, setJournalText] = useState('');
  const dailyEntries = (d.customItems || []).filter((item) => item.kind === 'dashboard-daily-entry' && item.date === selectedDay);
  const dailyTasks = dailyEntries.filter((item) => item.entryType === 'checklist');
  const dailyJournal = dailyEntries.find((item) => item.entryType === 'journal');
  useEffect(() => { setJournalText(dailyJournal?.notes || ''); }, [selectedDay, dailyJournal?.id, dailyJournal?.notes]);
  const moneyText = (amount: number) => showMoney ? fmtMoney(L, amount, cur) : '••••••';
  const addDailyTask = async () => {
    const title = newDailyTask.trim();
    if (!title) return;
    const ok = await save('customItems', { id: crypto.randomUUID(), kind: 'dashboard-daily-entry', entryType: 'checklist', date: selectedDay, title, done: false, createdAt: new Date().toISOString() });
    if (ok) setNewDailyTask('');
  };
  const saveJournal = async () => {
    const payload = { ...(dailyJournal || {}), id: dailyJournal?.id || crypto.randomUUID(), kind: 'dashboard-daily-entry', entryType: 'journal', date: selectedDay, notes: journalText, title: fa ? 'یادداشت روزانه' : 'Daily journal' };
    await save('customItems', payload, dailyJournal?.id);
  };
  const sc = scores(d, settings), ts = taskStats(d.tasks), m = monthFinance(d.transactions, settings);
  const nw = netWorth(d.assets, d.liabilities, settings, d.transactions);
  const goals = d.goals.map((g) => ({ g, i: goalInfo(g) })).filter((x) => x.i.status !== 'Completed');
  const atRisk = goals.filter((x) => x.i.status === 'At Risk' || x.i.status === 'Delayed');
  const habits = d.habits.filter((h) => !h.archived);
  const doneHabits = habits.filter((h) => habitStats(h, d.habitLogs).doneToday).length;
  const { toggle, busy } = useHabitToggle();
  const chart = [5, 4, 3, 2, 1, 0].map((o) => { const x = monthFinance(d.transactions, settings, o); return { name: x.label.slice(2), [t('income')]: x.income, [t('expense')]: x.expense, complete: x.complete }; });
  const moneyTooltip = ({ active, payload, label }: any) => showMoney && active && payload?.length ? (
    <div className="rounded-xl border bg-popover p-3 text-xs">
      <div className="font-semibold">{label}</div>
      {payload.map((item: any, index: number) => <div key={`${item.dataKey}-${index}`} className="mt-2"><div>{item.name}: {fmtMoney(L, Number(item.value), cur)}</div><MoneyEquivalents amount={Number(item.value)} settings={settings} /></div>)}
    </div>
  ) : null;
  const todayList = [...ts.todays, ...ts.overdue.filter((x) => !ts.todays.includes(x))].slice(0, 6);
  const greeting = fa ? 'خوش اومدی،' : 'Welcome back,';
  const displayName = settings.displayName || settings.username || (fa ? 'دوست من' : 'there');
  return (
    <div className="space-y-5">\n      <section className="relative isolate mb-1 overflow-hidden rounded-[24px] border border-violet-500/30 px-6 py-8 sm:px-8" style={{background:'linear-gradient(105deg,#170827 0%,#32105c 35%,#7926a8 62%,#12091e 100%)'}}>
        <div className="absolute inset-0 -z-10 opacity-80" style={{background:'radial-gradient(ellipse at 65% 120%,#f9b74a 0%,#b04bdf 16%,transparent 43%),linear-gradient(180deg,transparent 35%,#10051d 100%)'}} />
        <div className="absolute bottom-0 end-0 -z-10 h-full w-2/3 opacity-50" style={{clipPath:'polygon(0 100%,18% 70%,30% 82%,48% 43%,65% 73%,80% 22%,100% 55%,100% 100%)',background:'linear-gradient(180deg,#32105c,#090512)'}} />
        <div className="relative max-w-xl"><div className="mb-2 text-xs font-bold tracking-wide text-amber-300">{fa ? 'مدیریت هوشمند مالی' : 'SMART FINANCIAL COMMAND'}</div><h2 className="text-xl font-black leading-relaxed sm:text-2xl">{fa ? 'گامی به سوی آینده بهتر...' : 'Make every day a step toward a better future.'}</h2></div>
      </section>

      {[...new Set([...m.missing, ...nw.missing])].length > 0 && <div role="status" className="rounded-xl border border-[hsl(var(--warning)/.45)] bg-[hsl(var(--warning)/.08)] px-4 py-3 text-xs leading-6 text-[hsl(var(--warning))]">{t('missingRate')}: {[...new Set([...m.missing, ...nw.missing])].join(', ')} · {fa ? 'مبالغ این ارزها در جمع کل وارد نشده‌اند؛ نرخ تبدیل را در تنظیمات ثبت کنید.' : 'These amounts are excluded from totals until an exchange rate is configured.'}</div>}
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
            <Button type="button" variant="outline" size="sm" onClick={() => setShowMoney((value) => !value)} aria-label={showMoney ? (fa ? 'مخفی‌کردن مبالغ' : 'Hide amounts') : (fa ? 'نمایش مبالغ' : 'Show amounts')}>
              {showMoney ? <EyeOff className="me-1 h-4 w-4" /> : <Eye className="me-1 h-4 w-4" />}{showMoney ? (fa ? 'مخفی‌کردن مبالغ' : 'Hide amounts') : (fa ? 'نمایش مبالغ' : 'Show amounts')}
            </Button>
            <Link to="/transactions" className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20"><Plus className="h-4 w-4" />{fa ? 'ثبت تراکنش' : 'Add transaction'}</Link>
            <Link to="/tasks" className="inline-flex h-10 items-center gap-2 rounded-xl border bg-background/70 px-4 text-xs font-semibold hover:bg-secondary"><CalendarDays className="h-4 w-4" />{fa ? 'برنامه امروز' : 'Today plan'}</Link>
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="rounded-2xl border bg-background/65 p-4"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{t('netWorth')}</span><Wallet className="h-4 w-4 text-primary" /></div><div className="mt-2 break-words text-xl font-black tabular-nums sm:text-2xl">{nw.complete ? moneyText(nw.net) : '—'}</div>{showMoney && nw.complete && <MoneyEquivalents amount={nw.net} settings={settings} />}<div className="mt-1 text-[10px] text-muted-foreground">{fa ? 'دارایی خالص ثبت‌شده' : 'Recorded net worth'}</div></div>
          <div className="rounded-2xl border bg-background/65 p-4"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{t('cashFlow')}</span>{m.net >= 0 ? <ArrowUpRight className="h-4 w-4 text-emerald-500" /> : <ArrowDownRight className="h-4 w-4 text-rose-500" />}</div><div className={cn('mt-2 break-words text-xl font-black tabular-nums sm:text-2xl',m.net >= 0 ? 'text-emerald-500' : 'text-rose-500')}>{m.complete ? moneyText(m.net) : '—'}</div>{showMoney && m.complete && <MoneyEquivalents amount={m.net} settings={settings} />}<div className="mt-1 text-[10px] text-muted-foreground">{fa ? 'خالص این ماه' : 'Net this month'}</div></div>
          <div className="rounded-2xl border bg-background/65 p-4"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{t('overallScore')}</span><Sparkles className="h-4 w-4 text-primary" /></div><div className="mt-2 text-xl font-black tabular-nums sm:text-2xl">{sc.overall == null ? '—' : fmtNum(L,sc.overall)}<span className="ms-1 text-xs font-medium text-muted-foreground">/100</span></div><div className="mt-1 text-[10px] text-muted-foreground">{fa ? 'بر اساس داده‌های ثبت‌شده' : 'Based on recorded data'}</div></div>
          <div className="rounded-2xl border bg-background/65 p-4"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{t('habitsToday')}</span><Target className="h-4 w-4 text-primary" /></div><div className="mt-2 text-xl font-black tabular-nums sm:text-2xl">{fmtNum(L,doneHabits)}<span className="mx-1 text-muted-foreground">/</span>{fmtNum(L,habits.length)}</div><div className="mt-1 text-[10px] text-muted-foreground">{fa ? 'عادت انجام‌شده امروز' : 'Habits completed today'}</div></div>
        </div>
      </section>
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel title={fa ? 'جریان مالی' : 'Cash flow'} action={<Link to="/transactions" className="text-xs font-semibold text-primary">{fa ? 'همه تراکنش‌ها' : 'All transactions'} ↗</Link>}>
          <div className="mb-3 flex flex-wrap items-center gap-2"><span className="text-2xl font-black">{m.complete ? moneyText(m.net) : '—'}</span><span className={cn('rounded-full px-2 py-1 text-[10px] font-bold',m.net >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500')}>{!m.complete || m.savingsRate == null ? '—' : fmtNum(L,m.savingsRate*100)+'%'} {fa ? 'نرخ پس‌انداز' : 'savings rate'}</span></div>{showMoney && m.complete && <MoneyEquivalents amount={m.net} settings={settings} />}
          {showMoney && chart.every((item) => item.complete) ? <div className="h-60" dir="ltr"><ResponsiveContainer><BarChart data={chart} barGap={5}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} /><XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={false} tickLine={false} /><YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} width={54} axisLine={false} tickLine={false} /><Tooltip content={moneyTooltip} /><RBar dataKey={t('income')} fill="hsl(var(--chart-3))" radius={[5,5,0,0]} /><RBar dataKey={t('expense')} fill="hsl(var(--chart-5))" radius={[5,5,0,0]} /></BarChart></ResponsiveContainer></div> : <div className="grid h-60 place-items-center text-sm text-muted-foreground">{!showMoney ? (fa ? 'برای مشاهده نمودار، نمایش مبالغ را فعال کنید.' : 'Show amounts to view the financial chart.') : (fa ? 'به دلیل نبود نرخ تبدیل، نمودار کامل نیست.' : 'The chart is incomplete because exchange rates are missing.')}</div>}
        </Panel>
        <Panel title={fa ? 'نمای کلی عملکرد' : 'Performance overview'}>
          <div className="grid grid-cols-2 gap-3">
            <Kpi label={t('completionRate')} value={ts.completionRate == null ? '—' : fmtNum(L,ts.completionRate*100)+'%'} tone={ts.overdue.length ? 'bad' : 'good'} hint={t('completionRate')} />
            <Kpi label={t('activeGoals')} value={fmtNum(L,goals.length)} hint={fa ? 'هدف فعال' : 'Active goals'} />
            <Kpi label={t('atRisk')} value={fmtNum(L,atRisk.length)} tone={atRisk.length ? 'bad' : 'good'} />
            <div><Kpi label={t('income')} value={m.complete ? moneyText(m.income) : '—'} tone="good" />{showMoney && m.complete && <MoneyEquivalents amount={m.income} settings={settings} />}</div>
          </div>
          {settings.monthlyBudget && m.complete ? <div className="mt-5 rounded-xl bg-muted/60 p-3"><div className="mb-2 flex justify-between text-xs"><span>{t('budgetUsed')}</span><b>{fmtNum(L,Math.min(100,m.expense/settings.monthlyBudget*100))}%</b></div><Bar value={Math.min(1,m.expense/settings.monthlyBudget)} /><div className="mt-2 text-xs text-muted-foreground">{m.complete ? moneyText(m.expense) : '—'} / {moneyText(settings.monthlyBudget)}<div className="mt-2 grid grid-cols-2 gap-2"><div><span>{fa ? 'هزینه' : 'Spent'}</span>{showMoney && m.complete && <MoneyEquivalents amount={m.expense} settings={settings} />}</div><div><span>{fa ? 'بودجه' : 'Budget'}</span>{showMoney && <MoneyEquivalents amount={settings.monthlyBudget} settings={settings} />}</div></div></div></div> : null}
        </Panel>
      </div>
      <GrowthEngine showMoney={showMoney} />
      <Panel title={fa ? 'کارهای روزانه و روزنوشت' : 'Daily checklist & journal'} action={<div className="flex items-center gap-2"><Input aria-label={fa ? 'انتخاب روز' : 'Select day'} type="date" className="h-8 w-auto" value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)} /></div>}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex gap-2"><Input value={newDailyTask} onChange={(event) => setNewDailyTask(event.target.value)} placeholder={fa ? 'کار جدید برای امروز...' : 'Add a task for this day...'} onKeyDown={(event) => { if (event.key === 'Enter') void addDailyTask(); }} /><Button type="button" size="sm" onClick={() => void addDailyTask()} disabled={!newDailyTask.trim()}><Plus className="me-1 h-4 w-4" />{fa ? 'افزودن' : 'Add'}</Button></div>
            {dailyTasks.length ? <ul className="space-y-2">{dailyTasks.map((item) => <li key={item.id} className="flex items-center gap-2 rounded-xl border bg-background/50 p-2"><Checkbox checked={!!item.done} onCheckedChange={(checked) => void save('customItems', { ...item, done: !!checked }, item.id)} /><span className={cn('min-w-0 flex-1 text-sm', item.done && 'text-muted-foreground line-through')}>{item.title}</span><Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={fa ? 'حذف مورد' : 'Delete item'} onClick={() => void remove('customItems', item.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></li>)}</ul> : <div className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">{fa ? 'برای این روز هنوز کاری ثبت نشده است.' : 'No checklist items for this day yet.'}</div>}
            <div className="text-[11px] text-muted-foreground">{fa ? 'انجام‌شده' : 'Completed'}: {dailyTasks.filter((item) => item.done).length} / {dailyTasks.length}</div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold"><NotebookPen className="h-4 w-4 text-primary" />{fa ? 'روزنوشت' : 'Daily journal'}</div>
            <Textarea rows={5} value={journalText} onChange={(event) => setJournalText(event.target.value)} placeholder={fa ? 'اتفاقات، افکار یا نکات امروزت را اینجا بنویس...' : 'Write down your day, thoughts or notes...'} />
            <div className="flex justify-end"><Button type="button" size="sm" variant="outline" onClick={() => void saveJournal()}>{fa ? 'ذخیره یادداشت' : 'Save journal'}</Button></div>
          </div>
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={t('todayTasks')} action={<Link to="/tasks" className="text-xs font-semibold text-primary">{fa ? 'مشاهده همه' : 'View all'} ↗</Link>}>
          {todayList.length === 0 ? <div className="grid min-h-28 place-items-center text-sm text-muted-foreground">{t('empty')}</div> : <ul className="space-y-3">{todayList.map(x => <li key={x.id} className="flex items-center gap-3 text-sm"><Checkbox checked={x.status === 'Done'} onCheckedChange={() => save('tasks',completeTx({ ...x, status: x.status === 'Done' ? 'Todo' : 'Done' },x),x.id)} /><span className={cn('min-w-0 flex-1 truncate',x.status === 'Done' && 'line-through text-muted-foreground')}>{x.title}</span>{ts.overdue.includes(x) && <span className="text-[10px] text-destructive">{t('overdue')}</span>}</li>)}</ul>}
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
