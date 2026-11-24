import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { useStore } from '../lib/store';
import { fmtMoney, fmtNum } from '../lib/i18n';
import { findings, habitStats, scores, taskStats } from '../lib/analytics';
import { Panel, Bar } from '../components/ui-bits';
import MoneyEquivalents from '../components/MoneyEquivalents';
import { toast } from 'sonner';

type FocusSession = { date?: string; minutes?: number; seconds?: number };

const readFocusSessions = (): FocusSession[] => {
  try {
    const value = JSON.parse(localStorage.getItem('mealpha-focus-sessions') || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export default function GrowthEngine({ showMoney = false, compact = false }: { showMoney?: boolean; compact?: boolean }) {
  const { data, settings, save } = useStore();
  const d = data!;
  const fa = settings.language === 'fa';
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('mealpha-dismissed') || '[]'); } catch { return []; }
  });
  const focusSessions = useMemo(readFocusSessions, []);
  const weekStart = Date.now() - 7 * 86400000;
  const weekSessions = focusSessions.filter((s) => {
    const date = new Date(s.date || '').getTime();
    return Number.isFinite(date) && date >= weekStart && date <= Date.now();
  });
  const focusMinutes = weekSessions.reduce((sum, s) => sum + (Number(s.seconds) > 0 ? Number(s.seconds) / 60 : Number(s.minutes) || 0), 0);
  const activeHabits = d.habits.filter((h) => !h.archived);
  const habitStatsList = activeHabits.map((h) => habitStats(h, d.habitLogs));
  const habitsWithHistory = habitStatsList.filter((s) => s.hasHistory);
  const habitConsistency = habitsWithHistory.length ? habitsWithHistory.reduce((sum, s) => sum + s.rate30 * 100, 0) / habitsWithHistory.length : null;
  const weeklyHabitRate = habitsWithHistory.length ? habitStatsList.filter((s) => s.hasHistory).reduce((sum, s) => sum + s.thisWeek * 100, 0) / habitsWithHistory.length : null;
  const task = taskStats(d.tasks);
  const focusConsistency = weekSessions.length ? Math.min(100, focusMinutes / 300 * 100) : null;
  // Use the recent weekly habit trend and focus sessions; task completion already has its own Life Score domain.
  const consistencyParts = [weeklyHabitRate, focusConsistency].filter((v): v is number => v != null);
  const consistencyScore = consistencyParts.length ? consistencyParts.reduce((a, b) => a + b, 0) / consistencyParts.length : null;
  const base = scores(d, settings);
  const lifeParts = { ...base.parts, consistency: consistencyScore };
  const available = Object.values(lifeParts).filter((v): v is number => v != null);
  // A Life Score is final only when all five domains have enough data.
  const lifeScore = available.length === 5 ? Math.round(available.reduce((a, b) => a + b, 0) / 5) : null;
  const recommendations = findings(d, settings, settings.language).filter((f) => f.kind === 'weakness' && !dismissed.includes(f.id)).slice(0, 3);
  const labels = fa
    ? { finance: 'مالی', goals: 'اهداف', tasks: 'وظایف', habits: 'عادت‌ها', consistency: 'استمرار' }
    : { finance: 'Finance', goals: 'Goals', tasks: 'Tasks', habits: 'Habits', consistency: 'Consistency' };

  const createTask = async (f: (typeof recommendations)[number]) => {
    const ok = await save('tasks', {
      title: f.action,
      notes: `${f.title}\n${f.evidence}`,
      status: 'Todo',
      priority: f.severity === 'high' ? 'High' : 'Medium',
      dueDate: new Date().toISOString().slice(0, 10)
    });
    if (ok) { toast.success(fa ? 'پیشنهاد به وظیفه تبدیل شد.' : 'Recommendation added as a task.'); dismiss(f.id); }
  };
  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem('mealpha-dismissed', JSON.stringify(next));
  };

  if (compact) {
    return (
      <Panel title={fa ? 'هوش عملکردی آلفا' : 'Alpha Performance Intelligence'} action={<Link to="/insights" className="text-xs font-semibold text-primary">{fa ? 'تحلیل کامل' : 'Full analysis'} →</Link>}>
        <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
          <div className="flex items-center gap-3">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border bg-primary/5">
              <span className="text-2xl font-black tabular-nums">{lifeScore == null ? '—' : fmtNum(settings.language, lifeScore)}</span>
            </div>
            <div>
              <div className="text-sm font-semibold">{fa ? 'امتیاز رشد' : 'Life score'}</div>
              <div className="text-xs text-muted-foreground">{fa ? `پوشش داده: ${available.length} از ۵ حوزه` : `Data coverage: ${available.length}/5 areas`}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {Object.entries(lifeParts).map(([key, value]) => (
              <div key={key} className="min-w-0 space-y-1">
                <div className="flex justify-between gap-2 text-[11px]"><span>{labels[key as keyof typeof labels]}</span><span className="tabular-nums text-muted-foreground">{value == null ? '—' : `${fmtNum(settings.language, Math.round(value))}%`}</span></div>
                <Bar value={value == null ? null : value / 100} />
              </div>
            ))}
          </div>
        </div>
        {recommendations.length ? (
          <div className="mt-4 space-y-2 border-t pt-3">
            {recommendations.slice(0, 2).map((f) => (
              <div key={f.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/40 p-3">
                <span className={`h-2 w-2 shrink-0 rounded-full ${f.severity === 'high' ? 'bg-destructive' : 'bg-amber-500'}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold">{f.title}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{f.evidence}</div>
                  <div className="mt-1 text-xs">{f.action}</div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => void createTask(f)}>{fa ? 'ثبت کار' : 'Make task'}</Button>
                <Button size="sm" variant="ghost" onClick={() => dismiss(f.id)}>{fa ? 'رد' : 'Dismiss'}</Button>
              </div>
            ))}
          </div>
        ) : <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">{fa ? 'فعلاً هشدار یا پیشنهاد قابل اتکایی از داده‌ها استخراج نشده است.' : 'No reliable new recommendations from the available data.'}</p>}
      </Panel>
    );
  }


  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <div>
          <h2 className="font-bold">{fa ? 'موتور رشد آلفا' : 'Alpha Growth Engine'}</h2>
          <p className="text-xs text-muted-foreground">{fa ? 'تحلیل عملکرد، استمرار و اقدام بعدی در یک نگاه' : 'Performance, consistency and your next best actions'}</p>
        </div>
      </div>
      <div className="grid lg:grid-cols-[1fr_1.15fr] gap-4">
        <Panel title="Life Score">
          <div className="flex items-center gap-5 mb-4">
            <div className="h-24 w-24 shrink-0 rounded-full grid place-items-center border-[7px] border-primary/20 relative">
              <div className="absolute inset-[-7px] rounded-full border-[7px] border-primary border-b-transparent border-l-transparent" style={{ transform: `rotate(${lifeScore == null ? 0 : lifeScore * 3.6}deg)`, opacity: lifeScore == null ? 0.25 : 1 }} />
              <span className="text-3xl font-black tabular-nums">{lifeScore == null ? '—' : fmtNum(settings.language, lifeScore)}</span>
            </div>
            <div className="min-w-0">
              <div className="font-semibold">{fa ? 'امتیاز رشد کلی' : 'Overall growth score'}</div>
              <p className="text-xs text-muted-foreground mt-1">{fa ? `پوشش داده: ${available.length} از ۵ حوزه` : `Data coverage: ${available.length} of 5 areas`}</p>
              <Link to="/insights" className="inline-flex items-center gap-1 text-xs text-primary mt-2">{fa ? 'تحلیل کامل' : 'Full analysis'} <ArrowUpRight className="h-3 w-3" /></Link>
            </div>
          </div>
          <div className="space-y-3">
            {Object.entries(lifeParts).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-xs"><span>{labels[key as keyof typeof labels]}</span><span className="tabular-nums text-muted-foreground">{value == null ? (fa ? 'داده کافی نیست' : 'Not enough data') : `${fmtNum(settings.language, Math.round(value))}%`}</span></div>
                <Bar value={value == null ? null : value / 100} />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">{fa ? 'امتیاز کلی پس از ثبت داده کافی در هر ۵ حوزه نمایش داده می‌شود؛ فعلاً فقط حوزه‌های دارای داده در پوشش محاسبه شده‌اند.' : 'The overall score appears only after all five areas have enough data; coverage shows how many areas are currently available.'}</p>
        </Panel>

        <div className="space-y-4">
          <Panel title={fa ? "Consistency Engine · موتور استمرار" : "Consistency Engine"}>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-muted/60 p-3"><div className="text-xl font-bold tabular-nums">{weeklyHabitRate == null ? '—' : `${fmtNum(settings.language, Math.round(weeklyHabitRate))}%`}</div><div className="text-[11px] text-muted-foreground">{fa ? 'نرخ عادت هفتگی' : 'Weekly habits'}</div></div>
              <div className="rounded-xl bg-muted/60 p-3"><div className="text-xl font-bold tabular-nums">{fmtNum(settings.language, Math.round(focusMinutes))}</div><div className="text-[11px] text-muted-foreground">{fa ? 'دقیقه تمرکز' : 'Focus minutes'}</div></div>
              <div className="rounded-xl bg-muted/60 p-3"><div className="text-xl font-bold tabular-nums">{fmtNum(settings.language, task.overdue.length)}</div><div className="text-[11px] text-muted-foreground">{fa ? 'وظیفه معوق' : 'Overdue tasks'}</div></div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs"><span>{fa ? 'امتیاز استمرار' : 'Consistency score'}</span><b>{consistencyScore == null ? (fa ? 'داده کافی نیست' : 'Not enough data') : `${fmtNum(settings.language, Math.round(consistencyScore))}/100`}</b></div>
            <Bar value={consistencyScore == null ? null : consistencyScore / 100} />
            <p className="text-[11px] text-muted-foreground mt-3">{fa ? 'افت یک روزه باعث صفر شدن زنجیره پیشرفت نمی‌شود؛ روند هفتگی و ۳۰ روزه مبناست.' : 'A missed day does not erase progress; weekly and 30-day trends are considered.'}</p>
          </Panel>

          <Panel title="Alpha Intelligence" action={<Link to="/insights" className="text-xs text-primary">{fa ? 'همه تحلیل‌ها' : 'All insights'} →</Link>}>
            {recommendations.length ? <div className="space-y-3">
              {recommendations.map((f) => (
                <div key={f.id} className="rounded-xl border bg-card/60 p-3 space-y-2">
                  <div className="flex items-start gap-2"><span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${f.severity === 'high' ? 'bg-destructive' : f.severity === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} /><div className="text-sm font-semibold flex-1">{f.title}</div></div>
                  <p className="text-xs text-muted-foreground">{f.money ? (showMoney ? (fa ? `هزینه ${fmtMoney(settings.language, f.money.spent, f.money.currency)} در برابر بودجه ${fmtMoney(settings.language, f.money.budget, f.money.currency)}` : `Spent ${fmtMoney(settings.language, f.money.spent, f.money.currency)} vs budget ${fmtMoney(settings.language, f.money.budget, f.money.currency)}`) : (fa ? 'جزئیات مالی مخفی است؛ برای مشاهده، مبالغ را در داشبورد نمایش دهید.' : 'Financial details are hidden. Show amounts on the dashboard to view them.')) : f.evidence}</p>
                  {showMoney && f.money && <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-muted/40 p-2"><div className="mb-1 text-[10px] text-muted-foreground">{fa ? 'هزینه' : 'Spent'}</div><MoneyEquivalents amount={f.money.spent} settings={settings} /></div>
                    <div className="rounded-lg bg-muted/40 p-2"><div className="mb-1 text-[10px] text-muted-foreground">{fa ? 'بودجه' : 'Budget'}</div><MoneyEquivalents amount={f.money.budget} settings={settings} /></div>
                  </div>}
                  <p className="text-xs">{f.action}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => void createTask(f)}><CheckCircle2 className="h-3.5 w-3.5 me-1" />{fa ? 'تبدیل به وظیفه' : 'Create task'}</Button>
                    <Button size="sm" variant="ghost" onClick={() => dismiss(f.id)}>{fa ? 'رد کردن' : 'Dismiss'}</Button>
                  </div>
                </div>
              ))}
            </div> : <p className="text-sm text-muted-foreground py-4">{fa ? 'فعلاً پیشنهاد تازه‌ای وجود ندارد. با ثبت داده‌های بیشتر، تحلیل‌ها دقیق‌تر می‌شوند.' : 'No new recommendations. Add more activity to unlock deeper insights.'}</p>}
          </Panel>
        </div>
      </div>
    </section>
  );
}
