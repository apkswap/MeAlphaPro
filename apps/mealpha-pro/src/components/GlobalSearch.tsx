import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowRight, Command as CommandIcon } from 'lucide-react';
import { useStore } from '../lib/store';

type SearchResult = { id: string; title: string; detail: string; route: string; kind: string };

const PAGES = [
  { titleFa: 'داشبورد', titleEn: 'Dashboard', route: '/', keywords: 'home overview' },
  { titleFa: 'اهداف', titleEn: 'Goals', route: '/goals', keywords: 'target objective' },
  { titleFa: 'کارها', titleEn: 'Tasks', route: '/tasks', keywords: 'todo task' },
  { titleFa: 'عادت‌ها', titleEn: 'Habits', route: '/habits', keywords: 'routine habit' },
  { titleFa: 'تمرکز', titleEn: 'Focus', route: '/focus', keywords: 'timer pomodoro' },
  { titleFa: 'تراکنش‌ها و امور مالی', titleEn: 'Transactions & Finance', route: '/transactions', keywords: 'money expense income payment account' },
  { titleFa: 'دارایی‌ها و ثروت', titleEn: 'Wealth', route: '/wealth', keywords: 'assets liabilities wealth' },
  { titleFa: 'بینش‌ها و گزارش‌ها', titleEn: 'Insights & Reports', route: '/insights', keywords: 'analytics report chart' },
  { titleFa: 'فضای کار', titleEn: 'Workspace', route: '/workspace', keywords: 'workspace' },
  { titleFa: 'تنظیمات', titleEn: 'Settings', route: '/settings', keywords: 'preferences profile' },
];

const normalize = (value: unknown) => String(value ?? '')
  .toLocaleLowerCase()
  .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .normalize('NFKD')
  .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
  .trim();

export default function GlobalSearch() {
  const { data, settings } = useStore();
  const navigate = useNavigate();
  const fa = settings.language === 'fa';
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];
    const pageResults: SearchResult[] = PAGES.filter(page =>
      normalize([page.titleFa, page.titleEn, page.keywords].join(' ')).includes(q)
    ).map(page => ({
      id: page.route, title: fa ? page.titleFa : page.titleEn,
      detail: fa ? 'رفتن به بخش' : 'Open section', route: page.route, kind: fa ? 'بخش برنامه' : 'Section',
    }));
    if (!data) return pageResults.slice(0, 12);

    const collections: { key: string; route: string; kindFa: string; kindEn: string; fields: string[] }[] = [
      { key: 'goals', route: '/goals', kindFa: 'هدف', kindEn: 'Goal', fields: ['title', 'category', 'description', 'horizon'] },
      { key: 'tasks', route: '/tasks', kindFa: 'کار', kindEn: 'Task', fields: ['title', 'notes', 'status', 'priority'] },
      { key: 'habits', route: '/habits', kindFa: 'عادت', kindEn: 'Habit', fields: ['title', 'name', 'description', 'category'] },
      { key: 'transactions', route: '/transactions', kindFa: 'تراکنش', kindEn: 'Transaction', fields: ['description', 'category', 'kind', 'currency', 'amount'] },
      { key: 'paymentReminders', route: '/transactions', kindFa: 'یادآوری پرداخت', kindEn: 'Payment reminder', fields: ['description', 'status', 'currency', 'amount'] },
      { key: 'accounts', route: '/transactions', kindFa: 'حساب', kindEn: 'Account', fields: ['name', 'bankName', 'accountNumber', 'currency'] },
      { key: 'assets', route: '/wealth', kindFa: 'دارایی', kindEn: 'Asset', fields: ['name', 'description', 'category', 'currency'] },
      { key: 'liabilities', route: '/wealth', kindFa: 'بدهی', kindEn: 'Liability', fields: ['name', 'description', 'category', 'currency'] },
    ];
    const recordResults: SearchResult[] = [];
    for (const collection of collections) {
      const rows = (data as unknown as Record<string, Array<Record<string, unknown>>>)[collection.key] ?? [];
      for (const row of rows) {
        const haystack = normalize(collection.fields.map(field => row[field]).join(' '));
        if (!haystack.includes(q)) continue;
        const title = String(row.title ?? row.description ?? row.name ?? (fa ? 'بدون عنوان' : 'Untitled'));
        const detail = [row.category, row.status, row.bankName, row.currency]
          .filter(Boolean).map(String).join(' · ');
        recordResults.push({
          id: String(row.id ?? title), title,
          detail: detail || (fa ? 'برای مشاهده باز کن' : 'Open to view'),
          route: collection.route, kind: fa ? collection.kindFa : collection.kindEn,
        });
      }
    }
    return [...pageResults, ...recordResults].slice(0, 12);
  }, [data, query, fa]);

  const openSearch = () => { setQuery(''); setOpen(true); };
  const choose = (route: string) => { navigate(route); setOpen(false); setQuery(''); };

  return (
    <>
      <button type="button" onClick={openSearch}
        className="flex h-9 min-w-0 items-center gap-2 rounded-xl border bg-card/70 px-3 text-start text-muted-foreground transition-colors hover:border-primary/40 hover:bg-secondary sm:w-56"
        aria-label={fa ? 'جستجوی سراسری' : 'Global search'}>
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate text-xs">{fa ? 'جستجو در برنامه...' : 'Search your workspace...'}</span>
        <kbd className="hidden rounded border px-1.5 py-0.5 text-[9px] sm:inline">⌘ K</kbd>
      </button>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/55 px-3 pt-[12vh] backdrop-blur-sm"
          role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-label={fa ? 'جستجوی سراسری' : 'Global search'}
            className="w-full max-w-xl overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl">
            <div className="flex items-center gap-3 border-b px-4">
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
              <input autoFocus value={query} onChange={event => setQuery(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter' && results[0]) choose(results[0].route); }}
                placeholder={fa ? 'نام هدف، کار، حساب یا هر چیزی را بنویس...' : 'Search goals, tasks, accounts and more...'}
                className="h-14 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                aria-label={fa ? 'عبارت جستجو' : 'Search query'} />
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary" aria-label={fa ? 'بستن' : 'Close'}><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[min(60vh,480px)] overflow-y-auto p-2">
              {!query.trim() ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">{fa ? 'برای جستجو شروع به تایپ کن؛ میانبر Ctrl/⌘ + K هم فعاله.' : 'Start typing to search. Ctrl/⌘ + K also opens search.'}</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">{fa ? 'نتیجه‌ای پیدا نشد.' : 'No results found.'}</p>
              ) : (
                <div className="space-y-1">
                  {results.map(result => (
                    <button type="button" key={result.kind + result.id} onClick={() => choose(result.route)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Search className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{result.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{result.kind}{result.detail ? ' · ' + result.detail : ''}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t px-4 py-2 text-[10px] text-muted-foreground">
              <span>{fa ? 'جستجو در اطلاعات ذخیره‌شده روی دستگاه' : 'Searches locally stored app data'}</span>
              <span className="flex items-center gap-1"><CommandIcon className="h-3 w-3" />K · Esc</span>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
