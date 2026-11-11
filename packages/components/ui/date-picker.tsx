import * as React from 'react';
import { format, isValid, parse } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Calendar } from './calendar';
import { Input } from './input';
import { Popover, PopoverAnchor, PopoverContent } from './popover';

const DISPLAY_FORMAT = 'MMM d, yyyy';
const PARSE_FORMATS = ['MMM d, yyyy', 'MMMM d, yyyy', 'M/d/yyyy', 'M/d/yy', 'yyyy-MM-dd'];
const DAY_MS = 86400000;
type CalendarSystem = 'jalali' | 'gregorian';
type Language = 'fa' | 'en';
type JalaliParts = { year: number; month: number; day: number };

function utcNoon(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12));
}
function jalaliParts(date: Date): JalaliParts {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
    timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(utcNoon(date));
  const get = (key: string) => Number(parts.find(part => part.type === key)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}
function compareJalali(a: JalaliParts, b: JalaliParts) {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}
function fromJalali(year: number, month: number, day: number): Date | undefined {
  if (!Number.isInteger(year) || month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  let low = Math.floor(Date.UTC(year + 621, 0, 1, 12) / DAY_MS);
  let high = Math.floor(Date.UTC(year + 623, 0, 1, 12) / DAY_MS);
  const target = { year, month, day };
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = new Date(mid * DAY_MS + 12 * 60 * 60 * 1000);
    const comparison = compareJalali(jalaliParts(candidate), target);
    if (comparison === 0) {
      return new Date(candidate.getUTCFullYear(), candidate.getUTCMonth(), candidate.getUTCDate(), 12);
    }
    if (comparison < 0) low = mid + 1;
    else high = mid - 1;
  }
  return undefined;
}
function monthLength(year: number, month: number) {
  const first = fromJalali(year, month, 1);
  const next = month === 12 ? fromJalali(year + 1, 1, 1) : fromJalali(year, month + 1, 1);
  if (!first || !next) return 30;
  return (Date.UTC(next.getFullYear(), next.getMonth(), next.getDate()) -
    Date.UTC(first.getFullYear(), first.getMonth(), first.getDate())) / DAY_MS;
}
function displayDate(date: Date, calendar: CalendarSystem, lang: Language) {
  if (calendar !== 'jalali') return format(date, DISPLAY_FORMAT);
  const locale = lang === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US-u-ca-persian';
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(utcNoon(date));
  const get = (key: string) => parts.find(part => part.type === key)?.value ?? '';
  return `${get('year')}/${get('month')}/${get('day')}`;
}
function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
}
function parseDateText(text: string, reference: Date, calendar: CalendarSystem): Date | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  if (calendar === 'jalali') {
    const match = /^(\d{3,4})[\/-](\d{1,2})[\/-](\d{1,2})$/.exec(normalizeDigits(trimmed));
    if (!match) return undefined;
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > monthLength(year, month)) return undefined;
    return fromJalali(year, month, day);
  }
  for (const pattern of PARSE_FORMATS) {
    const parsed = parse(trimmed, pattern, reference);
    if (isValid(parsed)) return parsed;
  }
  return undefined;
}

function JalaliCalendar({ selected, month, onMonthChange, onSelect, lang }: {
  selected?: Date; month: Date; onMonthChange: (date: Date) => void;
  onSelect: (date: Date) => void; lang: Language;
}) {
  const { year, month: jm } = jalaliParts(month);
  const first = fromJalali(year, jm, 1);
  const days = monthLength(year, jm);
  if (!first) return null;
  const offset = (first.getDay() + 1) % 7; // Saturday is the first day of the Persian week.
  const locale = lang === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US-u-ca-persian';
  const monthTitle = new Intl.DateTimeFormat(locale, {
    year: 'numeric', month: 'long', timeZone: 'UTC',
  }).format(utcNoon(first));
  const weekdays = lang === 'fa'
    ? ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
    : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const previous = jm === 1 ? fromJalali(year - 1, 12, 1) : fromJalali(year, jm - 1, 1);
  const next = jm === 12 ? fromJalali(year + 1, 1, 1) : fromJalali(year, jm + 1, 1);
  const sameDay = (a?: Date, b?: Date) => !!a && !!b &&
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  return (
    <div dir={lang === 'fa' ? 'rtl' : 'ltr'} className="w-[280px] p-3">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" aria-label={lang === 'fa' ? 'ماه قبل' : 'Previous month'}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-accent"
          disabled={!previous} onClick={() => previous && onMonthChange(previous)}>
          {lang === "fa" ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" /> }
        </button>
        <div className="flex items-center gap-1">
          <select aria-label={lang === 'fa' ? 'ماه' : 'Month'} className="h-8 max-w-[112px] rounded-md border bg-background px-1 text-xs" value={jm} onChange={event => { const next = fromJalali(year, Number(event.target.value), 1); if (next) onMonthChange(next); }}>
            {Array.from({ length: 12 }, (_, index) => { const m = index + 1; const date = fromJalali(year, m, 1); return <option key={m} value={m}>{date ? new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(utcNoon(date)) : m}</option>; })}
          </select>
          <select aria-label={lang === 'fa' ? 'سال' : 'Year'} className="h-8 w-[76px] rounded-md border bg-background px-1 text-xs" value={year} onChange={event => { const next = fromJalali(Number(event.target.value), jm, 1); if (next) onMonthChange(next); }}>
            {Array.from({ length: 101 }, (_, index) => year - 50 + index).map(y => <option key={y} value={y}>{new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US', { useGrouping: false }).format(y)}</option>)}
          </select>
        </div>
        <button type="button" aria-label={lang === 'fa' ? 'ماه بعد' : 'Next month'}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-accent"
          disabled={!next} onClick={() => next && onMonthChange(next)}>
          {lang === "fa" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" /> }
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdays.map((name, index) => <div key={index} className="py-1 text-xs font-medium text-muted-foreground">{name}</div>)}
        {Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} aria-hidden="true" />)}
        {Array.from({ length: days }, (_, index) => {
          const day = index + 1;
          const date = fromJalali(year, jm, day);
          if (!date) return <span key={day} />;
          const isSelected = sameDay(selected, date);
          const isToday = sameDay(new Date(), date);
          return (
            <button key={day} type="button" onClick={() => onSelect(date)} aria-pressed={isSelected}
              className={cn(
                'h-8 w-8 justify-self-center rounded-md text-sm transition-colors hover:bg-accent',
                isSelected && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                isToday && !isSelected && 'bg-accent font-semibold text-accent-foreground',
              )}>
              {new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US', { useGrouping: false }).format(day)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  calendar?: CalendarSystem;
  lang?: Language;
}

function DatePicker({
  value, onChange, placeholder = 'Pick a date', disabled, className,
  calendar = 'gregorian', lang = 'en',
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState(() => value ? displayDate(value, calendar, lang) : '');
  const [month, setMonth] = React.useState(() => value ?? new Date());
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const valueRef = React.useRef(value);

  React.useEffect(() => {
    valueRef.current = value;
    setText(value ? displayDate(value, calendar, lang) : '');
    if (value) setMonth(value);
  }, [value, calendar, lang]);

  const commit = (date: Date | undefined) => {
    setText(date ? displayDate(date, calendar, lang) : '');
    if (date) setMonth(date);
    if (date?.getTime() !== valueRef.current?.getTime()) {
      valueRef.current = date;
      onChange?.(date);
    }
  };
  const commitTyped = () => {
    const parsed = parseDateText(text, value ?? new Date(), calendar);
    if (parsed || !text.trim()) commit(parsed);
    else setText(value ? displayDate(value, calendar, lang) : '');
  };
  const close = () => { commitTyped(); setOpen(false); };

  return (
    <Popover open={open} onOpenChange={isOpen => { if (isOpen) { setMonth(value ?? new Date()); setOpen(true); } else close(); }}>
      <PopoverAnchor asChild>
        <div ref={wrapperRef} className={cn(
          'flex h-9 w-full items-center rounded-md border border-input bg-transparent shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring',
          disabled && 'cursor-not-allowed opacity-50', className,
        )}>
          <input ref={inputRef} value={text} placeholder={placeholder} disabled={disabled}
            role="combobox" aria-expanded={open} aria-haspopup="dialog" aria-label={placeholder}
            className="h-full w-full min-w-0 flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed md:text-sm"
            onFocus={() => { if (!open) setOpen(true); }}
            onChange={event => {
              setText(event.target.value);
              const parsed = parseDateText(event.target.value, value ?? new Date(), calendar);
              if (parsed) setMonth(parsed);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter') { event.preventDefault(); close(); }
              else if (event.key === 'Escape' && open) {
                event.preventDefault(); event.stopPropagation();
                setText(value ? displayDate(value, calendar, lang) : '');
                setOpen(false);
              }
            }}
          />
          {text && !disabled ? (
            <button type="button" aria-label="Clear date"
              className="flex h-full shrink-0 items-center px-3 text-muted-foreground hover:text-foreground"
              onClick={() => commit(undefined)}><X className="size-4" /></button>
          ) : (
            <button type="button" tabIndex={-1} aria-label="Open calendar" disabled={disabled}
              className="flex h-full shrink-0 items-center px-3 text-muted-foreground disabled:cursor-not-allowed"
              onMouseDown={event => { event.preventDefault(); setOpen(true); inputRef.current?.focus(); }}>
              <CalendarIcon className="size-4" />
            </button>
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent className="w-auto p-0" align="start"
        onOpenAutoFocus={event => event.preventDefault()}
        onCloseAutoFocus={event => event.preventDefault()}
        onInteractOutside={event => { if (wrapperRef.current?.contains(event.target as Node)) event.preventDefault(); }}
        onFocusOutside={event => { if (wrapperRef.current?.contains(event.target as Node)) event.preventDefault(); }}>
        {calendar === 'jalali' ? (
          <JalaliCalendar selected={value} month={month} onMonthChange={setMonth}
            onSelect={date => { commit(date); setOpen(false); }} lang={lang} />
        ) : (
          <Calendar mode="single" selected={value} month={month} onMonthChange={setMonth} captionLayout="dropdown" fromYear={1950} toYear={2100}
            onSelect={date => { commit(date ?? undefined); setOpen(false); }} />
        )}
      </PopoverContent>
    </Popover>
  );
}

function DateTimePicker({
  value, onChange, placeholder = 'Pick a date', disabled, className,
  calendar = 'gregorian', lang = 'en',
}: DatePickerProps) {
  const handleDateChange = (date: Date | undefined) => {
    if (!date) { onChange?.(undefined); return; }
    const next = new Date(date);
    if (value) next.setHours(value.getHours(), value.getMinutes(), 0, 0);
    onChange?.(next);
  };
  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = event.target.value.split(':').map(Number);
    if (Number.isNaN(hours)) return;
    const next = value ? new Date(value) : new Date();
    next.setHours(hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);
    onChange?.(next);
  };
  return (
    <div className={cn('flex gap-2', className)}>
      <DatePicker value={value} onChange={handleDateChange} placeholder={placeholder}
        disabled={disabled} calendar={calendar} lang={lang} className="min-w-0 flex-1" />
      <Input type="time" aria-label="Time" value={value ? format(value, 'HH:mm') : ''}
        onChange={handleTimeChange} disabled={disabled} className="w-auto shrink-0" />
    </div>
  );
}

export { DatePicker, DateTimePicker };
export type { DatePickerProps };
