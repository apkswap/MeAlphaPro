import { Rec, Settings } from './store';
import { Lang } from './i18n';

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const isoOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const DAY = 86400000;
const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY);

// ---- Money (integer cents to avoid float drift) ----
const cents = (n: number) => Math.round(n * 100);
export function parseRates(s: string) {
  const m: Record<string, number> = {};
  s.split('\n').forEach((l) => {
    const [k, v] = l.split('=').map((x) => x?.trim());
    if (k && v && !isNaN(Number(v))) m[k.toUpperCase()] = Number(v);
  });
  return m;
}
export function makeConverter(st: Settings) {
  const rates = parseRates(st.exchangeRates);
  const base = st.currency.toUpperCase();
  const missing = new Set<string>();
  const conv = (amount: number, cur?: string) => {
    const c = (cur || base).toUpperCase();
    if (c === base) return cents(amount);
    if (rates[c] == null) { missing.add(c); return 0; }
    return cents(amount * rates[c]);
  };
  return { conv, missing };
}

export function monthFinance(tx: Rec[], st: Settings, offset = 0) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const prefix = isoOf(d).slice(0, 7);
  const { conv, missing } = makeConverter(st);
  let inc = 0, exp = 0, disc = 0, count = 0;
  tx.filter((x) => x.date?.startsWith(prefix)).forEach((x) => {
    count++;
    const v = conv(Number(x.amount) || 0, x.currency);
    if (x.kind === 'Income') inc += v; else { exp += v; if (x.nature === 'Discretionary') disc += v; }
  });
  const income = inc / 100, expense = exp / 100;
  return {
    label: prefix, count, income, expense, discretionary: disc / 100, net: (inc - exp) / 100,
    savingsRate: inc > 0 ? (inc - exp) / inc : null, missing: [...missing],
  };
}

export function netWorth(assets: Rec[], liabs: Rec[], st: Settings) {
  const { conv, missing } = makeConverter(st);
  const a = assets.reduce((s, x) => s + conv(Number(x.currentValue) || 0, x.currency), 0);
  const l = liabs.reduce((s, x) => s + conv(Number(x.outstandingAmount) || 0, x.currency), 0);
  return { assets: a / 100, liabilities: l / 100, net: (a - l) / 100, missing: [...missing] };
}

// ---- Goals ----
export type GoalStatus = 'Completed' | 'On Track' | 'At Risk' | 'Delayed' | 'Unknown';
export function goalInfo(g: Rec) {
  const target = Number(g.targetValue) || 0;
  const qualitative = g.trackingType === 'qualitative' || target <= 0;
  const progress = g.completed ? 1 : qualitative ? null : Math.min(1, (Number(g.currentValue) || 0) / target);
  const today = todayISO();
  let status: GoalStatus = 'Unknown', expected: number | null = null, predicted: string | null = null;
  if (g.completed || progress === 1) status = 'Completed';
  else if (qualitative) status = g.dueDate && todayISO() > g.dueDate ? 'Delayed' : 'On Track';
  else if (progress != null && g.startDate && g.dueDate) {
    const total = Math.max(1, daysBetween(g.startDate, g.dueDate));
    const elapsed = Math.max(0, daysBetween(g.startDate, today));
    expected = Math.min(1, elapsed / total);
    if (today > g.dueDate) status = 'Delayed';
    else if (progress >= expected - 0.1) status = 'On Track';
    else if (progress >= expected - 0.25) status = 'At Risk';
    else status = 'Delayed';
    if (progress > 0 && elapsed > 0) {
      const daysNeeded = Math.ceil((elapsed / progress) * (1 - progress));
      predicted = isoOf(new Date(Date.now() + daysNeeded * DAY));
    }
  }
  return { progress, status, expected, predicted };
}

// ---- Habits ----
export function habitStats(h: Rec, logs: Rec[]) {
  const dates = new Set(logs.filter((l) => l.habitId === h.id).map((l) => l.date));
  const day = (i: number) => isoOf(new Date(Date.now() - i * DAY));
  let cur = 0;
  let i = dates.has(day(0)) ? 0 : 1;
  while (dates.has(day(i))) { cur++; i++; }
  const sorted = [...dates].sort();
  let best = 0, run = 0, prev = '';
  sorted.forEach((d) => { run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; });
  const last = (n: number, from = 0) => Array.from({ length: n }, (_, k) => day(k + from)).filter((d) => dates.has(d)).length;
  const weekly = h.frequency === 'Weekly';
  const target = Math.max(1, Number(h.targetPerPeriod) || 1);
  const expected30 = weekly ? (30 / 7) * target : 30;
  const expectedWeek = weekly ? target : 7;
  return {
    doneToday: dates.has(day(0)), current: cur, best, dates,
    rate30: Math.min(1, last(30) / expected30),
    thisWeek: Math.min(1, last(7) / expectedWeek), prevWeek: Math.min(1, last(7, 7) / expectedWeek),
    hasHistory: dates.size > 0,
  };
}

// ---- Tasks ----
export function taskStats(tasks: Rec[]) {
  const today = todayISO();
  const since = isoOf(new Date(Date.now() - 30 * DAY));
  const due30 = tasks.filter((t) => t.dueDate && t.dueDate >= since && t.dueDate <= today);
  const done30 = due30.filter((t) => t.status === 'Done');
  const overdue = tasks.filter((t) => t.status !== 'Done' && t.dueDate && t.dueDate < today);
  const todays = tasks.filter((t) => t.dueDate === today);
  const timed = tasks.filter((t) => t.status === 'Done' && Number(t.estimatedMinutes) > 0 && Number(t.actualMinutes) > 0);
  const est = timed.reduce((s, t) => s + Number(t.estimatedMinutes), 0);
  const act = timed.reduce((s, t) => s + Number(t.actualMinutes), 0);
  return {
    completionRate: due30.length ? done30.length / due30.length : null, due30: due30.length,
    overdue, todays, estimateRatio: timed.length >= 3 ? act / est : null, timedCount: timed.length,
    focusToday: tasks.length,
  };
}

// ---- Scores (missing data → null, never zero) ----
export function scores(d: { goals: Rec[]; tasks: Rec[]; habits: Rec[]; habitLogs: Rec[]; transactions: Rec[] }, st: Settings) {
  const fin = monthFinance(d.transactions, st, 0);
  const finance = fin.savingsRate == null ? null : Math.max(0, Math.min(100, 50 + fin.savingsRate * 166));
  const g = d.goals.map(goalInfo).filter((x) => x.status !== 'Unknown' && x.status !== 'Completed');
  const goals = g.length ? (g.filter((x) => x.status === 'On Track').length / g.length) * 100 : null;
  const ts = taskStats(d.tasks);
  const tasks = ts.completionRate == null ? null : ts.completionRate * 100;
  const hs = d.habits.filter((h) => !h.archived).map((h) => habitStats(h, d.habitLogs)).filter((x) => x.hasHistory);
  const habits = hs.length ? (hs.reduce((s, x) => s + x.rate30, 0) / hs.length) * 100 : null;
  const parts = { finance, goals, tasks, habits };
  const avail = Object.values(parts).filter((v): v is number => v != null);
  return { parts, overall: avail.length ? avail.reduce((a, b) => a + b, 0) / avail.length : null, coverage: avail.length };
}

// ---- Rule-based decision engine ----
export type Finding = {
  id: string; kind: 'weakness' | 'strength'; severity: 'high' | 'medium' | 'low';
  title: string; evidence: string; action: string; confidence: 'confirmed' | 'hypothesis';
};

export function findings(d: { goals: Rec[]; tasks: Rec[]; habits: Rec[]; habitLogs: Rec[]; transactions: Rec[] }, st: Settings, lang: Lang): Finding[] {
  const fa = lang === 'fa';
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const out: Finding[] = [];
  const m0 = monthFinance(d.transactions, st, 0), m1 = monthFinance(d.transactions, st, 1);
  if (st.monthlyBudget && m0.expense > st.monthlyBudget)
    out.push({ id: `budget-${m0.label}`, kind: 'weakness', severity: 'high', confidence: 'confirmed',
      title: fa ? 'عبور از بودجه ماهانه' : 'Monthly budget exceeded',
      evidence: fa ? `هزینه این ماه ${m0.expense.toLocaleString()} در برابر بودجه ${st.monthlyBudget.toLocaleString()}` : `Spent ${m0.expense.toLocaleString()} vs budget ${st.monthlyBudget.toLocaleString()}`,
      action: fa ? 'هزینه‌های اختیاری این ماه را بازبینی کنید' : 'Review discretionary expenses this month' });
  if (m0.expense > 0 && m0.discretionary / m0.expense > 0.4)
    out.push({ id: `disc-${m0.label}`, kind: 'weakness', severity: 'medium', confidence: 'confirmed',
      title: fa ? 'سهم بالای هزینه‌های اختیاری' : 'High discretionary spending',
      evidence: fa ? `${pct(m0.discretionary / m0.expense)} از هزینه‌ها اختیاری است` : `${pct(m0.discretionary / m0.expense)} of expenses are discretionary`,
      action: fa ? 'برای هزینه‌های اختیاری سقف تعیین کنید' : 'Set a cap for discretionary spending' });
  if (m0.savingsRate != null && m1.savingsRate != null && m0.count >= 3 && m1.count >= 3) {
    const diff = m0.savingsRate - m1.savingsRate;
    if (Math.abs(diff) >= 0.1)
      out.push({ id: `save-${m0.label}`, kind: diff > 0 ? 'strength' : 'weakness', severity: diff > 0 ? 'low' : 'medium', confidence: 'confirmed',
        title: diff > 0 ? (fa ? 'بهبود نرخ پس‌انداز' : 'Savings rate improving') : (fa ? 'کاهش نرخ پس‌انداز' : 'Savings rate declining'),
        evidence: `${pct(m1.savingsRate)} → ${pct(m0.savingsRate)}`,
        action: diff > 0 ? (fa ? 'مازاد را به هدف مالی اختصاص دهید' : 'Direct the surplus to a financial goal') : (fa ? 'علت افزایش هزینه را بررسی کنید' : 'Investigate which costs grew') });
  }
  d.goals.forEach((g) => {
    const gi = goalInfo(g);
    if (gi.status === 'At Risk' || gi.status === 'Delayed')
      out.push({ id: `goal-${g.id}-${gi.status}`, kind: 'weakness', severity: gi.status === 'Delayed' ? 'high' : 'medium', confidence: 'confirmed',
        title: (fa ? 'هدف عقب از برنامه: ' : 'Goal behind schedule: ') + g.title,
        evidence: fa ? `پیشرفت ${pct(gi.progress ?? 0)} در برابر انتظار ${pct(gi.expected ?? 0)}` : `Progress ${pct(gi.progress ?? 0)} vs expected ${pct(gi.expected ?? 0)}`,
        action: fa ? 'مایل‌استون‌ها یا موعد را بازنگری کنید' : 'Revise milestones or the deadline' });
    if (gi.status === 'On Track' && gi.progress != null && gi.expected != null && gi.progress - gi.expected > 0.25)
      out.push({ id: `goalfast-${g.id}`, kind: 'strength', severity: 'low', confidence: 'hypothesis',
        title: (fa ? 'پیشرفت سریع‌تر از انتظار: ' : 'Ahead of schedule: ') + g.title,
        evidence: `${pct(gi.progress)} vs ${pct(gi.expected)}`,
        action: fa ? 'شاید بتوانید هدف را بزرگ‌تر کنید' : 'Consider raising the target' });
  });
  const ts = taskStats(d.tasks);
  if (ts.overdue.length >= 3)
    out.push({ id: `overdue-${ts.overdue.length}`, kind: 'weakness', severity: 'high', confidence: 'confirmed',
      title: fa ? 'کارهای معوق متعدد' : 'Multiple overdue tasks',
      evidence: fa ? `${ts.overdue.length} کار از موعد گذشته` : `${ts.overdue.length} tasks are past due`,
      action: fa ? 'کارهای معوق را دوباره اولویت‌بندی یا حذف کنید' : 'Re-prioritise, reschedule or drop overdue tasks' });
  if (ts.estimateRatio != null && ts.estimateRatio > 1.3)
    out.push({ id: 'estimates', kind: 'weakness', severity: 'medium', confidence: ts.timedCount >= 8 ? 'confirmed' : 'hypothesis',
      title: fa ? 'کم‌تخمینی زمان کارها' : 'Tasks take longer than estimated',
      evidence: fa ? `زمان واقعی ${Math.round(ts.estimateRatio * 100)}٪ تخمین (${ts.timedCount} کار)` : `Actual time is ${Math.round(ts.estimateRatio * 100)}% of estimates (${ts.timedCount} tasks)`,
      action: fa ? `تخمین‌ها را حدود ${Math.round((ts.estimateRatio - 1) * 100)}٪ افزایش دهید` : `Pad future estimates by ~${Math.round((ts.estimateRatio - 1) * 100)}%` });
  if (ts.completionRate != null && ts.due30 >= 5 && ts.completionRate >= 0.8)
    out.push({ id: 'taskstrong', kind: 'strength', severity: 'low', confidence: 'confirmed',
      title: fa ? 'اجرای منظم کارها' : 'Consistent task execution', evidence: `${pct(ts.completionRate)} (${ts.due30})`,
      action: fa ? 'همین روال را ادامه دهید' : 'Keep the current routine' });
  const active = d.habits.filter((h) => !h.archived);
  const declining = active.filter((h) => { const s = habitStats(h, d.habitLogs); return s.hasHistory && s.prevWeek - s.thisWeek >= 0.3; });
  if (declining.length)
    out.push({ id: `habits-${declining.map((h) => h.id).join()}`, kind: 'weakness', severity: declining.length > 1 ? 'high' : 'medium', confidence: 'confirmed',
      title: fa ? 'افت ثبات عادت‌ها' : 'Declining habit consistency',
      evidence: declining.map((h) => h.name).join('، '),
      action: active.length > 4 ? (fa ? 'تعداد عادت‌های فعال را کاهش دهید' : 'Reduce your active habit load') : (fa ? 'یادآور یا زمان ثابت تعیین کنید' : 'Anchor these habits to a fixed time') });
  active.forEach((h) => { const s = habitStats(h, d.habitLogs); if (s.current >= 7)
    out.push({ id: `streak-${h.id}`, kind: 'strength', severity: 'low', confidence: 'confirmed',
      title: (fa ? 'زنجیره موفق: ' : 'Strong streak: ') + h.name, evidence: `${s.current}`, action: fa ? 'ادامه دهید' : 'Keep it going' }); });
  return out;
}
