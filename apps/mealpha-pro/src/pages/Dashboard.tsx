import { Link } from 'react-router-dom';
import { Bar as RBar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowUpRight, CalendarDays, Check, CircleAlert, Flame, ListTodo, Sparkles, Target, Timer } from 'lucide-react';
import { Checkbox } from '@project/components/ui/checkbox';
import { useStore } from '../lib/store';
import { fmtDate, fmtMoney, fmtNum } from '../lib/i18n';
import { findings, goalInfo, habitStats, isoOf, monthFinance, netWorth, scores, taskStats, todayISO } from '../lib/analytics';
import { Bar, Kpi, Panel, StatusPill } from '../components/ui-bits';
import { statusKey } from './Goals';
import { completeTx } from './Tasks';
import { useHabitToggle } from './Habits';
import { FindingCard, getDismissed } from './Insights';
import { cn } from '@project/components/lib/utils';

const DAY = 86400000;
const priorityRank: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

function localDay(offset: number) {
  return isoOf(new Date(Date.now() + offset * DAY));
}

export default function Dashboard() {
  const { data, t, settings, save } = useStore();
  const d = data!, L = settings.language, cur = settings.currency;
  const today = todayISO();
  const sc = scores(d, settings);
  const ts = taskStats(d.tasks);
  const m = monthFinance(d.transactions, settings);
  const nw = netWorth(d.assets, d.liabilities, settings);
  const goals = d.goals.map((g) => ({ g, i: goalInfo(g) })).filter((x) => x.i.status !== 'Completed');
  const atRisk = goals.filter((x) => x.i.status === 'At Risk' || x.i.status === 'Delayed');
  const habits = d.habits.filter((h) => !h.archived);
  const doneHabits = habits.filter((h) => habitStats(h, d.habitLogs).doneToday).length;
  const dismissed = getDismissed();
  const recs = findings(d, settings, L).filter((f) => f.kind === 'weakness' && !dismissed.includes(f.id))
    .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.severity] - { high: 0, medium: 1, low: 2 }[b.severity])).slice(0, 3);
  const { toggle, busy } = useHabitToggle();

  const agenda = d.tasks.filter((x) => x.status !== 'Done' && x.dueDate && x.dueDate <= today)
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '') ||
      (priorityRank[a.priority] ?? 3) - (priorityRank[b.priority] ?? 3)).slice(0, 7);
  const focusTasks = [...d.tasks].filter((x) => x.status !== 'Done')
    .sort((a, b) => (priorityRank[a.priority] ?? 3) - (priorityRank[b.priority] ?? 3) ||
      (a.dueDate || '9999').localeCompare(b.dueDate || '9999')).slice(0, 3);

  const week = Array.from({ length: 7 }, (_, index) => {
    const date = localDay(index - 6);
    const tasksDone = d.tasks.filter((x) => x.status === 'Done' && String(x.completedAt || '').slice(0, 10) === date).length;
    const habitDone = d.habitLogs.filter((x) => x.date === date).length;
    return { date, label: fmtDate(L, settings.calendar, date), tasksDone, habitDone };
  });
  const weekTotal = week.reduce((sum, x) => sum + x.tasksDone + x.habitDone, 0);
  const todayLabel = fmtDate(L, settings.calendar, today);
  const greeting = L === 'fa' ? 'امروز را آگاهانه بساز' : 'Make today intentional';
  const subtitle = L === 'fa'
    ? 'نمای زنده‌ای از اولویت‌ها، پیشرفت و تعادل زندگی شما'
    : 'A live view of your priorities, progress and life balance';

  return (
    <div className="space-y-6">
      <div className="glass-hero relative overflow-hidden rounded-3xl border p-5 md:p-7">
        <div className="absolute -end-12 -top-16 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary"><CalendarDays className="h-4 w-4" />{todayLabel}</div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight">{greeting}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/tasks" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20">{L === 'fa' ? 'برنامه‌ریزی کارها' : 'Plan tasks'}<ArrowUpRight className="h-4 w-4" /></Link>
            <Link to="/focus" className="inline-flex items-center gap-2 rounded-xl border bg-background/70 px-4 py-2.5 text-sm font-semibold"><Timer className="h-4 w-4" />{L === 'fa' ? 'شروع تمرکز' : 'Start focus'}</Link>
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-3 gap-3 border-t border-border/70 pt-4">
          <div><div className="text-xs text-muted-foreground">{L === 'fa' ? 'کارهای نیازمند اقدام' : 'Needs attention'}</div><div className="mt-1 text-2xl font-black tabular-nums">{fmtNum(L, agenda.length)}</div></div>
          <div><div className="text-xs text-muted-foreground">{L === 'fa' ? 'عادت‌های انجام‌شده' : 'Habits completed'}</div><div className="mt-1 text-2xl font-black tabular-nums">{fmtNum(L, doneHabits)}<span className="text-sm text-muted-foreground">/{fmtNum(L, habits.length)}</span></div></div>
          <div><div className="text-xs text-muted-foreground">{L === 'fa' ? 'اهداف در معرض خطر' : 'Goals at risk'}</div><div className={cn('mt-1 text-2xl font-black tabular-nums', atRisk.length > 0 && 'text-destructive')}>{fmtNum(L, atRisk.length)}</div></div>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
        <Kpi label={t('overallScore')} value={sc.overall == null ? '—' : fmtNum(L, sc.overall)} tone="accent" hint={<Link to="/insights" className="underline">{L === 'fa' ? 'تحلیل و تصمیم‌یار' : 'Open decision center'}</Link>} />
        <Kpi label={t('completionRate')} value={ts.completionRate == null ? '—' : `${fmtNum(L, ts.completionRate * 100)}%`} hint={`${t('overdue')}: ${fmtNum(L, ts.overdue.length)}`} tone={ts.overdue.length ? 'bad' : 'default'} />
        <Kpi label={t('activeGoals')} value={fmtNum(L, goals.length)} hint={`${t('atRisk')}: ${fmtNum(L, atRisk.length)}`} />
        <Kpi label={t('habitsToday')} value={`${fmtNum(L, doneHabits)}/${fmtNum(L, habits.length)}`} tone="good" />
        <Kpi label={t('cashFlow')} value={fmtMoney(L, m.net, cur)} tone={m.net >= 0 ? 'good' : 'bad'} hint={`${t('savingsRate')}: ${m.savingsRate == null ? '—' : fmtNum(L, m.savingsRate * 100) + '%'}`} />
        <Kpi label={t('netWorth')} value={fmtMoney(L, nw.net, cur)} tone="accent" />
      </div>

      {settings.monthlyBudget ? (
        <Panel title={t('budgetUsed')} action={<Link to="/transactions" className="text-xs text-primary">{L === 'fa' ? 'جزئیات مالی' : 'Finance details'} →</Link>}>
          <div className="flex items-center gap-4"><div className="flex-1"><Bar value={Math.min(1, m.expense / settings.monthlyBudget)} /><p className="mt-2 text-xs text-muted-foreground tabular-nums">{fmtMoney(L, m.expense, cur)} / {fmtMoney(L, settings.monthlyBudget, cur)}</p></div><div className={cn('text-xl font-black tabular-nums', m.expense > settings.monthlyBudget && 'text-destructive')}>{fmtNum(L, m.expense / settings.monthlyBudget * 100)}%</div></div>
        </Panel>
      ) : null}

      <div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-4">
        <Panel title={L === 'fa' ? 'صف اولویت‌های امروز' : "Today's priority queue"} action={<Link to="/tasks" className="text-xs text-primary">{t('tasks')} →</Link>}>
          {agenda.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-center"><ListTodo className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">{L === 'fa' ? 'کار معوق یا سررسیدشده‌ای ندارید؛ زمان خوبی برای پیشروی هدفمند است.' : 'No overdue or due tasks. A good moment for deliberate progress.'}</p></div> :
            <ul className="space-y-2">{agenda.map((x) => <li key={x.id} className="flex items-center gap-3 rounded-xl border bg-background/50 p-3">
              <Checkbox checked={x.status === 'Done'} onCheckedChange={() => save('tasks', completeTx({ ...x, status: x.status === 'Done' ? 'Todo' : 'Done' }, x), x.id)} />
              <div className="min-w-0 flex-1"><div className={cn('truncate text-sm font-medium', x.status === 'Done' && 'line-through text-muted-foreground')}>{x.title}</div><div className="mt-1 text-xs text-muted-foreground">{fmtDate(L, settings.calendar, x.dueDate)}{x.priority ? ` · ${L === 'fa' ? 'اولویت' : 'Priority'}: ${x.priority}` : ''}</div></div>
              {x.dueDate < today && <span className="rounded-full bg-destructive/10 px-2 py-1 text-[10px] text-destructive">{t('overdue')}</span>}
            </li>)}</ul>}
        </Panel>
        <Panel title={L === 'fa' ? 'سه حرکت بعدی' : 'Your next three moves'} action={<Sparkles className="h-4 w-4 text-primary" />}>
          <div className="space-y-3">{focusTasks.length ? focusTasks.map((x, index) => <div key={x.id} className="flex items-start gap-3"><div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{index + 1}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{x.title}</div><div className="mt-1 text-xs text-muted-foreground">{x.dueDate ? fmtDate(L, settings.calendar, x.dueDate) : (L === 'fa' ? 'بدون موعد' : 'No due date')} · {x.priority || (L === 'fa' ? 'بدون اولویت' : 'No priority')}</div></div></div>) : <p className="text-sm text-muted-foreground">{L === 'fa' ? 'همه کارها انجام شده‌اند. یک هدف تازه تعریف کنید.' : 'All tasks are complete. Set a new goal.'}</p>}</div>
          <Link to="/focus" className="mt-5 flex items-center justify-center gap-2 rounded-xl border bg-primary/5 p-3 text-sm font-semibold text-primary"><Timer className="h-4 w-4" />{L === 'fa' ? 'اجرای یک جلسه تمرکز' : 'Run a focus session'}</Link>
        </Panel>
      </div>

      <div className="grid xl:grid-cols-3 gap-4">
        <Panel title={L === 'fa' ? 'عادت‌های امروز' : "Today's habits"} action={<Link to="/habits" className="text-xs text-primary">{t('habits')} →</Link>}>
          {habits.length === 0 && <p className="text-sm text-muted-foreground">{t('empty')}</p>}
          <ul className="space-y-3">{habits.slice(0, 7).map((h) => { const s = habitStats(h, d.habitLogs); return (
            <li key={h.id} className="flex items-center gap-3 text-sm">
              <button disabled={busy === h.id} onClick={() => toggle(h)} className={cn('h-7 w-7 rounded-lg border grid place-items-center transition-colors', s.doneToday && 'bg-[hsl(var(--success))] border-transparent text-white')}><Check className="h-3.5 w-3.5" /></button>
              <span className="min-w-0 flex-1 truncate">{h.name}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><Flame className="h-3 w-3" />{fmtNum(L, s.current)}</span>
            </li>); })}</ul>
        </Panel>
        <Panel title={L === 'fa' ? 'پیشرفت اهداف' : 'Goal momentum'} action={<Link to="/goals" className="text-xs text-primary">{t('goals')} →</Link>}>
          {goals.length === 0 && <p className="text-sm text-muted-foreground">{t('empty')}</p>}
          <ul className="space-y-4">{goals.slice(0, 5).map(({ g, i }) => (
            <li key={g.id} className="space-y-2"><div className="flex justify-between gap-2 text-sm"><span className="truncate font-medium">{g.title}</span><StatusPill status={i.status} label={t(statusKey[i.status])} /></div><div className="flex items-center gap-3"><div className="flex-1"><Bar value={i.progress} /></div><span className="text-xs tabular-nums text-muted-foreground">{i.progress == null ? '—' : fmtNum(L, i.progress * 100) + '%'}</span></div></li>
          ))}</ul>
          {atRisk.length > 0 && <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/5 p-3 text-xs text-destructive"><CircleAlert className="h-4 w-4 shrink-0" />{L === 'fa' ? `${atRisk.length} هدف نیازمند بازبینی است.` : `${atRisk.length} goals need a review.`}</div>}
        </Panel>
        <Panel title={L === 'fa' ? 'مرور هوشمند' : 'Decision signals'} action={<Link to="/insights" className="text-xs text-primary">{L === 'fa' ? 'همه تحلیل‌ها' : 'All insights'} →</Link>}>
          {recs.length ? <div className="space-y-3">{recs.map((f) => <FindingCard key={f.id} f={f} />)}</div> : <div className="py-5 text-center"><Target className="mx-auto h-7 w-7 text-[hsl(var(--success))]" /><p className="mt-2 text-sm text-muted-foreground">{t('noRecs')}</p></div>}
        </Panel>
      </div>

      <Panel title={L === 'fa' ? 'ریتم هفت روز اخیر' : 'Your last seven days'} action={<span className="text-xs text-muted-foreground">{fmtNum(L, weekTotal)} {L === 'fa' ? 'اقدام ثبت‌شده' : 'logged actions'}</span>}>
        <div className="h-64" dir="ltr"><ResponsiveContainer><BarChart data={week}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(value) => String(value).split(' ')[0]} /><YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} width={32} /><Tooltip labelFormatter={(value) => value} contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} /><RBar dataKey="tasksDone" name={L === 'fa' ? 'کار تکمیل‌شده' : 'Tasks done'} stackId="a" fill="hsl(var(--chart-3))" radius={[0, 0, 0, 0]} /><RBar dataKey="habitDone" name={L === 'fa' ? 'عادت ثبت‌شده' : 'Habits logged'} stackId="a" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        <p className="mt-2 text-xs text-muted-foreground">{L === 'fa' ? 'نمودار بر اساس زمان تکمیل ثبت‌شده برای کارها و لاگ عادت‌ها محاسبه می‌شود؛ داده ثبت‌نشده به‌عنوان عملکرد صفر تفسیر نمی‌شود.' : 'Based on task completion timestamps and habit logs. Missing records are not interpreted as zero ability.'}</p>
      </Panel>
    </div>
  );
}
