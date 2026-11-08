import { Link } from 'react-router-dom';
import { Bar as RBar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Check, Flame } from 'lucide-react';
import { Checkbox } from '@project/components/ui/checkbox';
import { useStore } from '../lib/store';
import { fmtMoney, fmtNum } from '../lib/i18n';
import { findings, goalInfo, habitStats, monthFinance, netWorth, scores, taskStats } from '../lib/analytics';
import { Bar, Kpi, Panel, PageHeader, StatusPill } from '../components/ui-bits';
import { statusKey } from './Goals';
import { completeTx } from './Tasks';
import { useHabitToggle } from './Habits';
import { FindingCard, getDismissed } from './Insights';
import { cn } from '@project/components/lib/utils';

export default function Dashboard() {
  const { data, t, settings, save } = useStore();
  const d = data!, L = settings.language, cur = settings.currency;
  const sc = scores(d, settings);
  const ts = taskStats(d.tasks);
  const m = monthFinance(d.transactions, settings);
  const nw = netWorth(d.assets, d.liabilities, settings);
  const goals = d.goals.map((g) => ({ g, i: goalInfo(g) })).filter((x) => x.i.status !== 'Completed');
  const atRisk = goals.filter((x) => x.i.status === 'At Risk' || x.i.status === 'Delayed');
  const habits = d.habits.filter((h) => !h.archived);
  const doneHabits = habits.filter((h) => habitStats(h, d.habitLogs).doneToday).length;
  const dismissed = getDismissed();
  const recs = findings(d, settings, L).filter((f) => f.kind === 'weakness' && !dismissed.includes(f.id)).slice(0, 3);
  const { toggle, busy } = useHabitToggle();
  const chart = [5, 4, 3, 2, 1, 0].map((o) => { const x = monthFinance(d.transactions, settings, o); return { name: x.label.slice(2), [t('income')]: x.income, [t('expense')]: x.expense }; });
  const todayList = [...ts.todays, ...ts.overdue.filter((x) => !ts.todays.includes(x))].slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader title={t('dashboard')} subtitle={t('appTagline')} />
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Kpi label={t('overallScore')} value={sc.overall == null ? '—' : fmtNum(L, sc.overall)} tone="accent" hint={<Link to="/insights" className="underline">{t('insights')}</Link>} />
        <Kpi label={t('completionRate')} value={ts.completionRate == null ? '—' : `${fmtNum(L, ts.completionRate * 100)}%`} hint={`${t('overdue')}: ${fmtNum(L, ts.overdue.length)}`} tone={ts.overdue.length ? 'bad' : 'default'} />
        <Kpi label={t('activeGoals')} value={fmtNum(L, goals.length)} hint={`${t('atRisk')}: ${fmtNum(L, atRisk.length)}`} />
        <Kpi label={t('habitsToday')} value={`${fmtNum(L, doneHabits)}/${fmtNum(L, habits.length)}`} tone="good" />
        <Kpi label={t('cashFlow')} value={fmtMoney(L, m.net, cur)} tone={m.net >= 0 ? 'good' : 'bad'} hint={`${t('savingsRate')}: ${m.savingsRate == null ? '—' : fmtNum(L, m.savingsRate * 100) + '%'}`} />
        <Kpi label={t('netWorth')} value={fmtMoney(L, nw.net, cur)} tone="accent" />
      </div>
      {settings.monthlyBudget ? (
        <Panel title={t('budgetUsed')}>
          <Bar value={Math.min(1, m.expense / settings.monthlyBudget)} />
          <p className="text-xs text-muted-foreground mt-2 tabular-nums">{fmtMoney(L, m.expense, cur)} / {fmtMoney(L, settings.monthlyBudget, cur)}</p>
        </Panel>
      ) : null}
      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title={t('todayTasks')} action={<Link to="/tasks" className="text-xs text-primary">→</Link>}>
          {todayList.length === 0 && <p className="text-sm text-muted-foreground">{t('empty')}</p>}
          <ul className="space-y-2">{todayList.map((x) => (
            <li key={x.id} className="flex items-center gap-3 text-sm">
              <Checkbox checked={x.status === 'Done'} onCheckedChange={() => save('tasks', completeTx({ status: x.status === 'Done' ? 'Todo' : 'Done' }, x), x.id)} />
              <span className={cn('flex-1 truncate', x.status === 'Done' && 'line-through text-muted-foreground')}>{x.title}</span>
              {ts.overdue.includes(x) && <span className="text-[10px] text-destructive">{t('overdue')}</span>}
            </li>))}</ul>
        </Panel>
        <Panel title={t('habitsToday')} action={<Link to="/habits" className="text-xs text-primary">→</Link>}>
          {habits.length === 0 && <p className="text-sm text-muted-foreground">{t('empty')}</p>}
          <ul className="space-y-2">{habits.slice(0, 8).map((h) => { const s = habitStats(h, d.habitLogs); return (
            <li key={h.id} className="flex items-center gap-3 text-sm">
              <button disabled={busy === h.id} onClick={() => toggle(h)} className={cn('h-6 w-6 rounded-md border grid place-items-center', s.doneToday && 'bg-[hsl(var(--success))] border-transparent text-white')}><Check className="h-3.5 w-3.5" /></button>
              <span className="flex-1 truncate">{h.name}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><Flame className="h-3 w-3" />{fmtNum(L, s.current)}</span>
            </li>); })}</ul>
        </Panel>
        <Panel title={t('goals')} action={<Link to="/goals" className="text-xs text-primary">→</Link>}>
          {goals.length === 0 && <p className="text-sm text-muted-foreground">{t('empty')}</p>}
          <ul className="space-y-3">{goals.slice(0, 5).map(({ g, i }) => (
            <li key={g.id} className="space-y-1">
              <div className="flex justify-between gap-2 text-sm"><span className="truncate">{g.title}</span><StatusPill status={i.status} label={t(statusKey[i.status])} /></div>
              <Bar value={i.progress} />
            </li>))}</ul>
        </Panel>
      </div>
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <Panel title={`${t('income')} / ${t('expense')}`}>
          <div className="h-64" dir="ltr">
            <ResponsiveContainer>
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} width={60} />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <RBar dataKey={t('income')} fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                <RBar dataKey={t('expense')} fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title={t('recommendations')} action={<Link to="/insights" className="text-xs text-primary">→</Link>}>
          <div className="space-y-3">{recs.length ? recs.map((f) => <FindingCard key={f.id} f={f} />) : <p className="text-sm text-muted-foreground">{t('noRecs')}</p>}</div>
        </Panel>
      </div>
    </div>
  );
}
