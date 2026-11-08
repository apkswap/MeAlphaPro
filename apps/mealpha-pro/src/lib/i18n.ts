export type Lang = 'fa' | 'en';

const dict = {
  appTagline: ['طراحی زندگی، سنجش رشد', 'Design your life. Measure your growth.'],
  offlineReady: ['آفلاین و آماده', 'Offline ready'],
  dashboard: ['داشبورد', 'Dashboard'],
  goals: ['اهداف', 'Goals'],
  tasks: ['کارها', 'Tasks'],
  habits: ['عادت‌ها', 'Habits'],
  focus: ['تمرکز', 'Focus'],
  finance: ['تراکنش‌ها', 'Transactions'],
  wealth: ['دارایی و بدهی', 'Assets & Debts'],
  insights: ['هوش عملکرد', 'Insights'],
  settings: ['تنظیمات', 'Settings'],
  signOut: ['خروج', 'Sign out'],
  add: ['افزودن', 'Add'],
  edit: ['ویرایش', 'Edit'],
  delete: ['حذف', 'Delete'],
  save: ['ذخیره', 'Save'],
  cancel: ['انصراف', 'Cancel'],
  search: ['جستجو…', 'Search…'],
  confirmDelete: ['این مورد حذف شود؟', 'Delete this item?'],
  confirmDeleteDesc: ['این عمل قابل بازگشت نیست.', 'This cannot be undone.'],
  empty: ['هنوز موردی ثبت نشده است.', 'Nothing here yet.'],
  noData: ['داده کافی نیست', 'Not enough data'],
  saved: ['ذخیره شد', 'Saved'],
  deleted: ['حذف شد', 'Deleted'],
  error: ['خطایی رخ داد', 'Something went wrong'],
  title: ['عنوان', 'Title'],
  name: ['نام', 'Name'],
  description: ['توضیحات', 'Description'],
  notes: ['یادداشت', 'Notes'],
  category: ['دسته', 'Category'],
  priority: ['اولویت', 'Priority'],
  status: ['وضعیت', 'Status'],
  horizon: ['افق زمانی', 'Horizon'],
  startDate: ['تاریخ شروع', 'Start date'],
  dueDate: ['موعد', 'Due date'],
  target: ['مقدار هدف', 'Target value'],
  current: ['مقدار فعلی', 'Current value'],
  progress: ['پیشرفت', 'Progress'],
  completed: ['تکمیل‌شده', 'Completed'],
  linkedGoal: ['هدف مرتبط', 'Linked goal'],
  estMin: ['زمان تخمینی (دقیقه)', 'Estimated (min)'],
  actMin: ['زمان واقعی (دقیقه)', 'Actual (min)'],
  frequency: ['تکرار', 'Frequency'],
  perPeriod: ['تعداد در هر دوره', 'Target per period'],
  amount: ['مبلغ', 'Amount'],
  currency: ['ارز', 'Currency'],
  date: ['تاریخ', 'Date'],
  kind: ['نوع', 'Type'],
  nature: ['ماهیت', 'Nature'],
  assetType: ['نوع دارایی', 'Asset type'],
  acqCost: ['بهای تمام‌شده', 'Acquisition cost'],
  curValue: ['ارزش فعلی', 'Current value'],
  valDate: ['تاریخ ارزش‌گذاری', 'Valuation date'],
  creditor: ['طلبکار', 'Creditor'],
  original: ['مبلغ اولیه', 'Original amount'],
  outstanding: ['مانده', 'Outstanding'],
  interest: ['نرخ بهره ٪', 'Interest rate %'],
  assets: ['دارایی‌ها', 'Assets'],
  liabilities: ['بدهی‌ها', 'Liabilities'],
  netWorth: ['ارزش خالص', 'Net worth'],
  income: ['درآمد', 'Income'],
  expense: ['هزینه', 'Expense'],
  cashFlow: ['جریان نقدی', 'Cash flow'],
  savingsRate: ['نرخ پس‌انداز', 'Savings rate'],
  thisMonth: ['این ماه', 'This month'],
  today: ['امروز', 'Today'],
  overdue: ['معوق', 'Overdue'],
  todayTasks: ['کارهای امروز', "Today's tasks"],
  completionRate: ['نرخ تکمیل', 'Completion rate'],
  activeGoals: ['اهداف فعال', 'Active goals'],
  atRisk: ['در خطر', 'At risk'],
  onTrack: ['در مسیر', 'On track'],
  delayed: ['تأخیر', 'Delayed'],
  overallScore: ['امتیاز کلی', 'Overall score'],
  scoreNote: ['امتیاز فقط بازتاب داده‌های ثبت‌شده است، نه ارزش شخصی شما.', 'Scores reflect recorded data only — never your personal worth.'],
  streak: ['زنجیره', 'Streak'],
  best: ['بهترین', 'Best'],
  habitsToday: ['عادت‌های امروز', 'Habits today'],
  last30: ['۳۰ روز اخیر', 'Last 30 days'],
  recommendations: ['پیشنهادها', 'Recommendations'],
  evidence: ['شواهد', 'Evidence'],
  action: ['اقدام پیشنهادی', 'Suggested action'],
  confidence: ['اطمینان', 'Confidence'],
  dismiss: ['نادیده', 'Dismiss'],
  accept: ['پذیرش و ساخت کار', 'Accept & create task'],
  noRecs: ['فعلاً مشکلی شناسایی نشد. داده‌های بیشتری ثبت کنید.', 'No issues detected yet. Keep logging data.'],
  strengths: ['نقاط قوت', 'Strengths'],
  weaknesses: ['نقاط ضعف', 'Weaknesses'],
  language: ['زبان', 'Language'],
  calendar: ['تقویم', 'Calendar'],
  jalali: ['شمسی', 'Jalali'],
  gregorian: ['میلادی', 'Gregorian'],
  reportCurrency: ['ارز گزارش', 'Reporting currency'],
  rates: ['نرخ‌های تبدیل', 'Exchange rates'],
  ratesHelp: ['هر خط: کد ارز = ارزش یک واحد به ارز گزارش. مثال: USD=600000', 'One per line: CODE = value of 1 unit in reporting currency. e.g. USD=600000'],
  monthlyBudget: ['بودجه ماهانه هزینه', 'Monthly expense budget'],
  budgetUsed: ['مصرف بودجه', 'Budget used'],
  missingRate: ['نرخ تبدیل ثبت نشده برای', 'No exchange rate recorded for'],
  start: ['شروع', 'Start'],
  pause: ['توقف', 'Pause'],
  reset: ['بازنشانی', 'Reset'],
  minutes: ['دقیقه', 'minutes'],
  linkTask: ['کار مرتبط (اختیاری)', 'Linked task (optional)'],
  sessionDone: ['جلسه تمرکز ثبت شد', 'Focus session logged'],
  estimate: ['تخمین', 'Estimate'],
  quickAdd: ['افزودن سریع', 'Quick add'],
  balance: ['تراز', 'Balance'],
} as const;

export type Key = keyof typeof dict;
export const tr = (lang: Lang, k: Key) => dict[k][lang === 'fa' ? 0 : 1];

const optLabels: Record<string, [string, string]> = {
  Low: ['کم', 'Low'], Medium: ['متوسط', 'Medium'], High: ['زیاد', 'High'],
  Todo: ['انجام‌نشده', 'To do'], 'In Progress': ['در حال انجام', 'In progress'], Done: ['انجام شد', 'Done'],
  Lifetime: ['مادام‌العمر', 'Lifetime'], Annual: ['سالانه', 'Annual'], Quarterly: ['فصلی', 'Quarterly'],
  Monthly: ['ماهانه', 'Monthly'], Weekly: ['هفتگی', 'Weekly'], Daily: ['روزانه', 'Daily'],
  Income: ['درآمد', 'Income'], Expense: ['هزینه', 'Expense'],
  Essential: ['ضروری', 'Essential'], Discretionary: ['اختیاری', 'Discretionary'],
};
export const opt = (lang: Lang, v?: string) => (v ? optLabels[v]?.[lang === 'fa' ? 0 : 1] ?? v : '—');

export function fmtDate(lang: Lang, cal: string, iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  const loc = `${lang === 'fa' ? 'fa-IR' : 'en-US'}-u-ca-${cal === 'jalali' ? 'persian' : 'gregory'}`;
  return new Intl.DateTimeFormat(loc, { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
}

export function fmtNum(lang: Lang, n: number | null | undefined, digits = 0) {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US', { maximumFractionDigits: digits }).format(n);
}

export function fmtMoney(lang: Lang, n: number | null | undefined, cur: string) {
  if (n == null) return '—';
  return `${fmtNum(lang, n, 2)} ${cur}`;
}
