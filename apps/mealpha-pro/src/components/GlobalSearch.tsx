import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, X, ArrowRight, Command as CommandIcon } from 'lucide-react';
import { useStore } from '../lib/store';

type SearchResult = { id: string; title: string; detail: string; route: string; kind: string; score: number };

const PAGES = [
  { titleFa: 'داشبورد', titleEn: 'Dashboard', route: '/', keywords: 'home overview نمای کلی خانه' },
  { titleFa: 'اهداف', titleEn: 'Goals', route: '/goals', keywords: 'target objective هدف برنامه' },
  { titleFa: 'کارها', titleEn: 'Tasks', route: '/tasks', keywords: 'todo task وظیفه تسک' },
  { titleFa: 'عادت‌ها', titleEn: 'Habits', route: '/habits', keywords: 'routine habit روتین' },
  { titleFa: 'تمرکز', titleEn: 'Focus', route: '/focus', keywords: 'timer pomodoro تایمر' },
  { titleFa: 'تراکنش‌ها و امور مالی', titleEn: 'Transactions & Finance', route: '/transactions', keywords: 'money expense income payment account هزینه درآمد پرداخت حساب' },
  { titleFa: 'دارایی‌ها', titleEn: 'Assets', route: '/wealth?tab=assets', keywords: 'assets wealth دارایی' },
  { titleFa: 'بدهی‌ها', titleEn: 'Liabilities', route: '/wealth?tab=liabilities', keywords: 'liabilities debt بدهی' },
  { titleFa: 'بینش‌ها و گزارش‌ها', titleEn: 'Insights & Reports', route: '/insights', keywords: 'analytics report chart تحلیل گزارش نمودار' },
  { titleFa: 'فضای کار', titleEn: 'Workspace', route: '/workspace', keywords: 'workspace محیط کار' },
  { titleFa: 'تنظیمات', titleEn: 'Settings', route: '/settings', keywords: 'preferences profile تنظیمات ترجیحات پروفایل' },
];

export const normalizeSearchTerm = (value: unknown) => String(value ?? '')
  .normalize('NFKC')
  .toLocaleLowerCase()
  .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
  .replace(/[يى]/g, 'ی')
  .replace(/ك/g, 'ک')
  .replace(/[\u200c\u200d\u200e\u200f]/g, ' ')
  .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim()
  .replace(/\s+/g, ' ');

export const matchesSearchText = (haystack: unknown, query: unknown) => {
  const normalizedQuery = normalizeSearchTerm(query);
  if (!normalizedQuery) return false;
  const normalizedText = normalizeSearchTerm(haystack);
  return normalizedText.includes(normalizedQuery) ||
    normalizedText.replace(/\s/g, '').includes(normalizedQuery.replace(/\s/g, ''));
};

const searchableValue = (value: unknown): string => {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(searchableValue).filter(Boolean).join(' ');
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).map(searchableValue).filter(Boolean).join(' ');
  return String(value);
};

const matchScore = (text: unknown, query: string, title = false) => {
  const normalized = normalizeSearchTerm(text);
  if (!normalized || !matchesSearchText(normalized, query)) return 0;
  const compact = normalized.replace(/\s/g, '');
  const compactQuery = query.replace(/\s/g, '');
  if (normalized === query || compact === compactQuery) return title ? 130 : 112;
  if (normalized.startsWith(query) || compact.startsWith(compactQuery)) return title ? 112 : 94;
  if (normalized.includes(query)) return title ? 98 : 78;
  return title ? 86 : 66;
};

const COLLECTIONS: { key: string; route: string; kindFa: string; kindEn: string; fields: string[] }[] = [
  { key: 'goals', route: '/goals', kindFa: 'هدف', kindEn: 'Goal', fields: ['title', 'category', 'description', 'horizon', 'status', 'trackingType', 'dueDate', 'startDate', 'notes'] },
  { key: 'tasks', route: '/tasks', kindFa: 'کار', kindEn: 'Task', fields: ['title', 'notes', 'status', 'priority', 'dueDate', 'category', 'tags'] },
  { key: 'habits', route: '/habits', kindFa: 'عادت', kindEn: 'Habit', fields: ['title', 'name', 'description', 'category', 'frequency'] },
  { key: 'transactions', route: '/transactions', kindFa: 'تراکنش', kindEn: 'Transaction', fields: ['description', 'category', 'kind', 'currency', 'amount', 'date', 'notes', 'accountName'] },
  { key: 'paymentReminders', route: '/transactions', kindFa: 'یادآوری پرداخت', kindEn: 'Payment reminder', fields: ['description', 'status', 'currency', 'amount', 'dueDate', 'category'] },
  { key: 'accounts', route: '/transactions', kindFa: 'حساب', kindEn: 'Account', fields: ['name', 'bankName', 'accountNumber', 'currency', 'description'] },
  { key: 'assets', route: '/wealth', kindFa: 'دارایی', kindEn: 'Asset', fields: ['name', 'description', 'category', 'currency', 'currentValue', 'purchaseDate'] },
  { key: 'liabilities', route: '/wealth', kindFa: 'بدهی', kindEn: 'Liability', fields: ['name', 'description', 'category', 'currency', 'amount', 'dueDate'] },
];

type GlobalSearchProps = { externalTrigger?: boolean };

export default function GlobalSearch({ externalTrigger = false }: GlobalSearchProps) {
  const { data, settings } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const fa = settings.language === 'fa';
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closeSearch = () => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  };

  const openSearch = () => {
    setQuery('');
    setActiveIndex(0);
    setOpen(true);
  };

  useEffect(() => {
    if (!externalTrigger) return;
    const onExternalOpen = () => {
      setQuery('');
      setActiveIndex(0);
      setOpen(true);
    };
    window.addEventListener('mealpha:open-global-search', onExternalOpen);
    return () => window.removeEventListener('mealpha:open-global-search', onExternalOpen);
  }, [externalTrigger]);

  useEffect(() => {
    closeSearch();
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearch();
      } else if (event.key === 'Escape' && open) {
        event.preventDefault();
        closeSearch();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (triggerRef.current?.isConnected) triggerRef.current.focus();
      else previousFocus?.focus?.();
    };
  }, [open]);

  useEffect(() => setActiveIndex(0), [query]);

  const results = useMemo(() => {
    const q = normalizeSearchTerm(query);
    if (!q) return [];
    const pageResults: SearchResult[] = PAGES.flatMap(page => {
      const title = fa ? page.titleFa : page.titleEn;
      const score = Math.max(
        matchScore(title, q, true),
        matchScore(fa ? page.titleEn : page.titleFa, q, true),
        matchScore(page.keywords, q)
      );
      return score ? [{
        id: page.route,
        title,
        detail: fa ? 'رفتن به بخش' : 'Open section',
        route: page.route,
        kind: fa ? 'بخش برنامه' : 'Section',
        score
      }] : [];
    });

    const recordResults: SearchResult[] = [];
    if (data) {
      for (const collection of COLLECTIONS) {
        const rows = (data as unknown as Record<string, Array<Record<string, unknown>>>)[collection.key] ?? [];
        for (const row of rows) {
          const title = String(row.title ?? row.name ?? row.description ?? (fa ? 'بدون عنوان' : 'Untitled'));
          const searchable = collection.fields.map(field => searchableValue(row[field])).join(' ');
          const titleScore = matchScore(title, q, true);
          const contentScore = matchScore(searchable, q);
          const score = Math.max(titleScore, contentScore);
          if (!score) continue;
          const detail = [row.category, row.status, row.bankName, row.currency, row.dueDate]
            .filter(Boolean).map(searchableValue).join(' · ');
          recordResults.push({
            id: String(row.id ?? title),
            title,
            detail: detail || (fa ? 'برای مشاهده باز کن' : 'Open to view'),
            route: collection.route,
            kind: fa ? collection.kindFa : collection.kindEn,
            score
          });
        }
      }
    }
    return [...pageResults, ...recordResults]
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, 12);
  }, [data, query, fa]);

  const choose = (route: string) => {
    navigate(route);
    closeSearch();
  };

  const activeResult = results[activeIndex];

  return (
    <>
      {!externalTrigger && (
      <button ref={triggerRef} type="button" onClick={openSearch}
        className="flex h-10 w-10 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-xl border bg-card/70 px-2 text-start text-muted-foreground transition-colors hover:border-primary/40 hover:bg-secondary sm:w-60 sm:justify-start sm:px-3"
        aria-label={fa ? 'جستجوی سراسری' : 'Global search'} aria-haspopup="dialog" aria-expanded={open}>
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden min-w-0 flex-1 truncate text-xs sm:block">{fa ? 'جستجو در برنامه...' : 'Search your workspace...'}</span>
        <kbd className="hidden rounded border px-1.5 py-0.5 text-[9px] sm:inline">Ctrl K</kbd>
      </button>
      )}
      {open && createPortal(
        <div data-testid="global-search-overlay"
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black/65 p-3 backdrop-blur-md sm:p-6"
          role="presentation" onPointerDown={event => { if (event.target === event.currentTarget) closeSearch(); }}>
          <section data-testid="global-search-dialog" role="dialog" aria-modal="true" aria-label={fa ? 'جستجوی سراسری' : 'Global search'}
            dir={fa ? 'rtl' : 'ltr'}
            onKeyDown={event => {
              if (event.key !== 'Tab') return;
              const focusable = event.currentTarget.querySelectorAll<HTMLElement>('input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])');
              if (!focusable.length) return;
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
              }
            }}
            className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[42rem] flex-col overflow-hidden rounded-[26px] border bg-popover text-popover-foreground shadow-2xl shadow-black/40 sm:max-h-[calc(100dvh-3rem)]">
            <div className="flex shrink-0 items-center gap-3 border-b px-4 sm:px-5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Search className="h-5 w-5" /></div>
              <input ref={inputRef} role="combobox" aria-expanded={open} aria-autocomplete="list" aria-controls="mealpha-search-results"
                aria-activedescendant={activeResult ? 'mealpha-search-option-' + activeIndex : undefined}
                value={query} onChange={event => setQuery(event.target.value)}
                onKeyDown={event => {
                  if (!results.length) return;
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setActiveIndex(index => (index + 1) % results.length);
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setActiveIndex(index => (index - 1 + results.length) % results.length);
                  } else if (event.key === 'Enter' && activeResult) {
                    event.preventDefault();
                    choose(activeResult.route);
                  }
                }}
                placeholder={fa ? 'نام هدف، کار، حساب یا هر چیزی را بنویس...' : 'Search goals, tasks, accounts and more...'}
                className="h-[4.25rem] min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                aria-label={fa ? 'عبارت جستجو' : 'Search query'} autoComplete="off" spellCheck={false} />
              <button type="button" onClick={closeSearch} className="shrink-0 rounded-xl border border-transparent p-2.5 text-muted-foreground transition-colors hover:border-border hover:bg-secondary" aria-label={fa ? 'بستن' : 'Close'}><X className="h-4 w-4" /></button>
            </div>
            <div id="mealpha-search-results" role="listbox" aria-label={fa ? 'نتایج جستجو' : 'Search results'} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:p-3">
              {!query.trim() ? (
                <p className="px-3 py-10 text-center text-sm text-muted-foreground">{fa ? 'برای جستجو شروع به تایپ کن؛ میانبر Ctrl/⌘ + K هم فعاله.' : 'Start typing to search. Ctrl/⌘ + K also opens search.'}</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-10 text-center text-sm text-muted-foreground">{fa ? 'نتیجه‌ای پیدا نشد. املای عبارت را بررسی کن.' : 'No results found. Check the spelling and try again.'}</p>
              ) : (
                <div className="space-y-1">
                  {results.map((result, index) => (
                    <button type="button" role="option" id={'mealpha-search-option-' + index}
                      aria-selected={index === activeIndex} key={result.kind + result.id}
                      onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(result.route)}
                      className={'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ' + (index === activeIndex ? 'bg-accent' : 'hover:bg-accent/70')}>
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Search className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{result.title}</span>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">{result.kind}{result.detail ? ' · ' + result.detail : ''}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-[10px] text-muted-foreground sm:px-5">
              <span>{fa ? 'جستجو در اطلاعات ذخیره‌شده روی دستگاه' : 'Searches locally stored app data'}</span>
              <span className="flex items-center gap-3"><span>↑ ↓ {fa ? 'انتخاب' : 'Navigate'}</span><span>Enter {fa ? 'بازکردن' : 'Open'}</span><span>Esc {fa ? 'بستن' : 'Close'}</span><CommandIcon className="h-3 w-3" />K</span>
            </div>
          </section>
        </div>,
        document.body
      )}
    </>
  );
}
