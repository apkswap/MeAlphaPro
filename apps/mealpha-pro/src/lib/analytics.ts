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
export type CurrencyRate = { from: string; to: string; rate: number };
export function parseRates(s: string, baseCurrency = ''): CurrencyRate[] {
  const rows: CurrencyRate[] = [];
  s.split(/[\n;,]+/).forEach((line) => {
    const text = line.trim();
    if (!text) return;
    const match = text.match(/^([A-Za-z]{3,8})\s*(?:\/|->|:)\s*([A-Za-z]{3,8})\s*=\s*([0-9]+(?:\.[0-9]+)?)$/);
    if (match && Number(match[3]) > 0) {
      rows.push({ from: match[1].toUpperCase(), to: match[2].toUpperCase(), rate: Number(match[3]) });
      return;
    }
    // Explicit pair form: "USD = IRT 26000" means 1 USD = 26000 IRT.
    const namedPair = text.match(/^([A-Za-z]{3,8})\s*=\s*([A-Za-z]{3,8})\s+([0-9]+(?:\.[0-9]+)?)$/);
    if (namedPair && Number(namedPair[3]) > 0) {
      rows.push({ from: namedPair[1].toUpperCase(), to: namedPair[2].toUpperCase(), rate: Number(namedPair[3]) });
      return;
    }
    const legacy = text.match(/^([A-Za-z]{3,8})\s*=\s*([0-9]+(?:\.[0-9]+)?)$/);
    if (legacy && Number(legacy[2]) > 0 && baseCurrency && legacy[1].toUpperCase() !== baseCurrency.toUpperCase()) {
      rows.push({ from: legacy[1].toUpperCase(), to: baseCurrency.toUpperCase(), rate: Number(legacy[2]) });
    }
  });
  return rows;
}
export function makeConverter(st: Settings) {
  const base = (st.currency || '').trim().toUpperCase();
  const graph = new Map<string, Array<{ currency: string; rate: number }>>();
  const edge = (from: string, to: string, rate: number) => {
    const list = graph.get(from) || [];
    list.push({ currency: to, rate });
    graph.set(from, list);
  };
  parseRates(st.exchangeRates, base).forEach(({ from, to, rate }) => { edge(from, to, rate); edge(to, from, 1 / rate); });
  const factorToBase = (currency: string): number | null => {
    if (currency === base) return 1;
    const queue: Array<{ currency: string; factor: number }> = [{ currency, factor: 1 }];
    const visited = new Set([currency]);
    while (queue.length) {
      const current = queue.shift()!;
      for (const next of graph.get(current.currency) || []) {
        if (visited.has(next.currency)) continue;
        const factor = current.factor * next.rate;
        if (next.currency === base) return factor;
        visited.add(next.currency);
        queue.push({ currency: next.currency, factor });
      }
    }
    return null;
  };
  const missing = new Set<string>();
  const conv = (amount: number, cur?: string) => {
    const c = (cur || base).trim().toUpperCase();
    const factor = factorToBase(c);
    if (factor == null) { missing.add(c); return Number.NaN; }
    return cents(amount * factor);
  };
  const fromBase = (amount: number, currency: string) => {
    const code = (currency || base).trim().toUpperCase();
    if (code === base) return cents(amount);
    const factor = factorToBase(code);
    if (factor == null) { missing.add(code); return null; }
    return cents(amount / factor);
  };
  return { conv, missing, factorToBase, fromBase };
}

export function monthFinance(tx: Rec[], st: Settings, offset = 0) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const prefix = isoOf(d).slice(0, 7);
  const { conv, missing } = makeConverter(st);
  let inc = 0, exp = 0, disc = 0, count = 0;
  tx.filter((x) => x.date?.startsWith(prefix) && (x.kind === 'Income' || x.kind === 'Expense')).forEach((x) => {
    const amount = Number(x.amount);
    if (!Number.isFinite(amount) || amount < 0) return;
    const v = conv(amount, x.currency);
    // Unknown exchange rates must never be counted as zero-valued money.
    if (!Number.isFinite(v)) return;
    count++;
    if (x.kind === 'Income') inc += v; else { exp += v; if (x.nature === 'Discretionary') disc += v; }
  });
  const income = inc / 100, expense = exp / 100;
  return {
    label: prefix, count, income, expense, discretionary: disc / 100, net: (inc - exp) / 100,
    savingsRate: inc > 0 ? (inc - exp) / inc : null, missing: [...missing], complete: missing.size === 0,
  };
}

export function netWorth(assets: Rec[], liabs: Rec[], st: Settings, transactions: Rec[] = []) {
  const { conv, missing } = makeConverter(st);
  const effectiveAssets: Rec[] = assets.map((asset): Rec => ({ ...asset, currentValue: Number(asset.currentValue || 0) + transactions.filter(tx => tx.assetId === asset.id && tx.currency === asset.currency).reduce((sum, tx) => sum + (tx.kind === 'Income' ? 1 : -1) * Number(tx.amount || 0), 0) }));
  const a = effectiveAssets.reduce((sum, x) => { const value = conv(Number(x.currentValue) || 0, x.currency); return sum + (Number.isFinite(value) ? value : 0); }, 0);
  const l = liabs.reduce((sum, x) => { const value = conv(Number(x.outstandingAmount) || 0, x.currency); return sum + (Number.isFinite(value) ? value : 0); }, 0);
  return { assets: a / 100, liabilities: l / 100, net: (a - l) / 100, missing: [...missing], complete: missing.size === 0 };
}

// ---- Goals ----
export type GoalStatus = 'Completed' | 'On Track' | 'At Risk' | 'Delayed' | 'Unknown';
export function goalInfo(g: Rec) {
  const target = Number(g.targetValue) || 0;
  const qualitative = g.trackingType === 'qualitative' || target <= 0;
  const checklistItems = Array.isArray(g.descriptionItems) ? g.descriptionItems.filter((item: any) => String(item.text || '').trim()) : [];
  const checklistProgress = checklistItems.length ? checklistItems.filter((item: any) => item.done).length / checklistItems.length : null;
  const progress = g.completed ? 1 : checklistProgress != null ? checklistProgress : qualitative ? null : Math.min(1, (Number(g.currentValue) || 0) / target);
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

// ---- Shared performance consistency metrics ----
export type FocusSession = { date?: string; minutes?: number; seconds?: number };

export function readFocusSessions(): FocusSession[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const value = JSON.parse(localStorage.getItem('mealpha-focus-sessions') || '[]');
    return Array.isArray(value) ? value as FocusSession[] : [];
  } catch {
    return [];
  }
}

export function consistencyStats(habits: Rec[], habitLogs: Rec[], focusSessions: FocusSession[], now = Date.now()) {
  const habitHistory = habits.filter((h) => !h.archived).map((h) => habitStats(h, habitLogs)).filter((s) => s.hasHistory);
  const weeklyHabitRate = habitHistory.length
    ? (habitHistory.reduce((sum, stat) => sum + stat.thisWeek, 0) / habitHistory.length) * 100
    : null;
  const weekStart = now - 7 * DAY;
  const weekSessions = focusSessions.filter((session) => {
    const date = new Date(session.date || '').getTime();
    return Number.isFinite(date) && date >= weekStart && date <= now;
  });
  const focusMinutes = weekSessions.reduce((sum, session) => {
    const seconds = Number(session.seconds);
    const minutes = seconds > 0 ? seconds / 60 : Number(session.minutes) || 0;
    return sum + (Number.isFinite(minutes) ? Math.max(0, minutes) : 0);
  }, 0);
  const focusScore = focusMinutes > 0 ? Math.min(100, focusMinutes / 300 * 100) : null;
  const sources = [weeklyHabitRate, focusScore].filter((value): value is number => value != null);
  return {
    score: sources.length ? sources.reduce((sum, value) => sum + value, 0) / sources.length : null,
    weeklyHabitRate,
    focusMinutes,
    focusScore,
  };
}

// ---- Tasks ----
export function taskStats(tasks: Rec[]) {
  // Journal entries are dated tasks for organization, not work items for metrics.
  const relevantTasks = tasks.filter((task) => task.dailyEntryType !== 'journal');
  const today = todayISO();
  const since = isoOf(new Date(Date.now() - 30 * DAY));
  const due30 = relevantTasks.filter((t) => t.dueDate && t.dueDate >= since && t.dueDate <= today);
  const done30 = due30.filter((t) => t.status === 'Done');
  const overdue = relevantTasks.filter((t) => t.status !== 'Done' && t.dueDate && t.dueDate < today);
  const todays = relevantTasks.filter((t) => t.dueDate === today);
  const timed = relevantTasks.filter((t) => t.status === 'Done' && Number(t.estimatedMinutes) > 0 && Number(t.actualMinutes) > 0);
  const est = timed.reduce((s, t) => s + Number(t.estimatedMinutes), 0);
  const act = timed.reduce((s, t) => s + Number(t.actualMinutes), 0);
  const completed = relevantTasks.filter((task) => task.status === 'Done').length;
  return {
    completionRate: relevantTasks.length ? completed / relevantTasks.length : null,
    completed, total: relevantTasks.length,
    due30CompletionRate: due30.length ? done30.length / due30.length : null, due30: due30.length,
    overdue, todays, estimateRatio: timed.length >= 3 ? act / est : null, timedCount: timed.length,
    focusToday: todays.filter((task) => task.status !== 'Done').length,
  };
}

// ---- Scores (missing data → null, never zero) ----
export function scores(
  d: { goals: Rec[]; tasks: Rec[]; habits: Rec[]; habitLogs: Rec[]; transactions: Rec[] },
  st: Settings,
  focusSessions: FocusSession[] = [],
) {
  const fin = monthFinance(d.transactions, st, 0);
  const finance = fin.savingsRate == null || !fin.complete ? null : Math.max(0, Math.min(100, 50 + fin.savingsRate * 166));
  // Score measurable progress itself, including completed goals. Exclude only goals with no measurable evidence.
  const measurableGoals = d.goals.map(goalInfo).filter((x) => x.progress != null);
  const goals = measurableGoals.length
    ? (measurableGoals.reduce((sum, goal) => sum + Math.max(0, Math.min(1, goal.progress || 0)), 0) / measurableGoals.length) * 100
    : null;
  const ts = taskStats(d.tasks);
  // Prefer the last-30-day execution rate when there is a meaningful sample; otherwise
  // require at least three historical tasks before exposing a provisional all-time score.
  const tasks = ts.due30 >= 3 && ts.due30CompletionRate != null
    ? ts.due30CompletionRate * 100
    : ts.total >= 3 && ts.completionRate != null
      ? ts.completionRate * 100
      : null;
  const hs = d.habits.filter((h) => !h.archived).map((h) => habitStats(h, d.habitLogs)).filter((x) => x.hasHistory);
  const habits = hs.length ? (hs.reduce((sum, stat) => sum + stat.rate30, 0) / hs.length) * 100 : null;
  const consistency = consistencyStats(d.habits, d.habitLogs, focusSessions);
  const parts = { finance, goals, tasks, habits, consistency: consistency.score };
  const avail = Object.values(parts).filter((value): value is number => value != null);
  const coverageTotal = Object.keys(parts).length;
  // Do not publish a partial overall score: it can look perfect while key areas have no data.
  return {
    parts,
    overall: avail.length === coverageTotal ? avail.reduce((sum, value) => sum + value, 0) / coverageTotal : null,
    coverage: avail.length,
    coverageTotal,
    consistency,
  };
}

// ---- Rule-based decision engine ----
export type Finding = {
  id: string; kind: 'weakness' | 'strength'; severity: 'high' | 'medium' | 'low';
  title: string; evidence: string; action: string; confidence: 'confirmed' | 'hypothesis';
  money?: { spent: number; budget: number; currency: string };
};

export function findings(d: { goals: Rec[]; tasks: Rec[]; habits: Rec[]; habitLogs: Rec[]; transactions: Rec[] }, st: Settings, lang: Lang): Finding[] {
  const fa = lang === 'fa';
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const out: Finding[] = [];
  const monthlyBudget = Number(st.monthlyBudget ?? 0);
  const m0 = monthFinance(d.transactions, st, 0), m1 = monthFinance(d.transactions, st, 1);
  if (m0.complete && monthlyBudget && m0.expense > monthlyBudget)
    out.push({ id: `budget-${m0.label}`, kind: 'weakness', severity: 'high', confidence: 'confirmed',
      title: fa ? 'عبور از بودجه ماهانه' : 'Monthly budget exceeded',
      evidence: fa ? `هزینه این ماه ${m0.expense.toLocaleString()} ${st.currency} در برابر بودجه ${monthlyBudget.toLocaleString()} ${st.currency}` : `Spent ${m0.expense.toLocaleString()} ${st.currency} vs budget ${monthlyBudget.toLocaleString()} ${st.currency}`,
      money: { spent: m0.expense, budget: monthlyBudget, currency: st.currency },
      action: fa ? 'هزینه‌های اختیاری این ماه را بازبینی کنید' : 'Review discretionary expenses this month' });
  if (m0.complete && m0.expense > 0 && m0.discretionary / m0.expense > 0.4)
    out.push({ id: `disc-${m0.label}`, kind: 'weakness', severity: 'medium', confidence: 'confirmed',
      title: fa ? 'سهم بالای هزینه‌های اختیاری' : 'High discretionary spending',
      evidence: fa ? `${pct(m0.discretionary / m0.expense)} از هزینه‌ها اختیاری است` : `${pct(m0.discretionary / m0.expense)} of expenses are discretionary`,
      action: fa ? 'برای هزینه‌های اختیاری سقف تعیین کنید' : 'Set a cap for discretionary spending' });
  if (m0.complete && m1.complete && m1.expense > 0 && m0.count >= 3 && m1.count >= 3) {
    const expenseGrowth = (m0.expense - m1.expense) / m1.expense;
    if (expenseGrowth >= 0.2)
      out.push({ id: `expense-growth-${m0.label}`, kind: 'weakness', severity: expenseGrowth >= 0.4 ? 'high' : 'medium', confidence: 'confirmed',
        title: fa ? 'افزایش محسوس هزینه‌ها' : 'Expenses increased materially',
        evidence: fa ? `هزینه‌ها نسبت به ماه قبل ${pct(expenseGrowth)} بیشتر شده‌اند` : `Expenses are up ${pct(expenseGrowth)} compared with last month`,
        action: fa ? 'دسته‌های هزینه‌ای با بیشترین رشد را بررسی کنید' : 'Review the categories contributing most to the increase' });
    else if (expenseGrowth <= -0.2)
      out.push({ id: `expense-down-${m0.label}`, kind: 'strength', severity: 'low', confidence: 'confirmed',
        title: fa ? 'کاهش هزینه‌های ماهانه' : 'Monthly expenses decreased',
        evidence: fa ? `هزینه‌ها نسبت به ماه قبل ${pct(Math.abs(expenseGrowth))} کمتر شده‌اند` : `Expenses are down ${pct(Math.abs(expenseGrowth))} compared with last month`,
        action: fa ? 'الگوی هزینه‌های کنترل‌شده را حفظ کنید' : 'Keep the spending changes that are working' });
  }
  if (m0.complete && m0.savingsRate != null && m0.income > 0 && m0.count >= 3 && m0.savingsRate < 0.1)
    out.push({ id: `low-savings-${m0.label}`, kind: 'weakness', severity: m0.savingsRate < 0 ? 'high' : 'medium', confidence: 'confirmed',
      title: fa ? 'حاشیه پس‌انداز پایین' : 'Low savings margin',
      evidence: fa ? `نرخ پس‌انداز این ماه ${pct(m0.savingsRate)} است` : `This month's savings rate is ${pct(m0.savingsRate)}`,
      action: fa ? 'هزینه‌های ثابت و اختیاری را برای ایجاد حاشیه امن بازبینی کنید' : 'Review fixed and discretionary costs to create a safer margin' });
  if (m0.complete && monthlyBudget > 0 && m0.expense >= monthlyBudget * 0.8 && m0.expense <= monthlyBudget)
    out.push({ id: `budget-near-${m0.label}`, kind: 'weakness', severity: 'medium', confidence: 'confirmed',
      title: fa ? 'نزدیک شدن به سقف بودجه' : 'Approaching the monthly budget limit',
      evidence: fa ? `${pct(m0.expense / monthlyBudget)} از بودجه ماهانه مصرف شده است` : `${pct(m0.expense / monthlyBudget)} of the monthly budget has been used`,
      action: fa ? 'پیش از ثبت هزینه‌های جدید، مانده بودجه را بررسی کنید' : 'Check the remaining budget before adding new discretionary costs' });
  if (m0.complete && m1.complete && m0.savingsRate != null && m1.savingsRate != null && m0.count >= 3 && m1.count >= 3) {
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
  if (ts.due30CompletionRate != null && ts.due30 >= 5 && ts.due30CompletionRate >= 0.8)
    out.push({ id: 'taskstrong', kind: 'strength', severity: 'low', confidence: 'confirmed',
      title: fa ? 'اجرای منظم کارها' : 'Consistent task execution', evidence: `${pct(ts.due30CompletionRate)} (${ts.due30})`,
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
