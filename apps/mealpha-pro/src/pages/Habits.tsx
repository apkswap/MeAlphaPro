import { useState } from 'react';
import { Check, Flame, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@project/components/ui/alert-dialog';
import { useStore, Rec } from '../lib/store';
import { fmtNum, opt } from '../lib/i18n';
import { habitStats, isoOf, todayISO } from '../lib/analytics';
import EntityForm, { Field } from '../components/EntityForm';
import { PageHeader } from '../components/ui-bits';
import { cn } from '@project/components/lib/utils';

const FIELDS: Field[] = [
  { key: 'name', label: 'name', type: 'text', required: true, full: true },
  { key: 'frequency', label: 'frequency', type: 'select', options: ['Daily', 'Weekly'] },
  { key: 'targetPerPeriod', label: 'perPeriod', type: 'number' },
  { key: 'archived', label: 'completed', type: 'checkbox' },
];

export function useHabitToggle() {
  const { data, save, remove } = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const toggle = async (h: Rec, date = todayISO()) => {
    if (h.archived || date > todayISO()) return;
    setBusy(h.id);
    try {
      const log = data!.habitLogs.find((l) => l.habitId === h.id && l.date === date);
      if (log) await remove('habitLogs', log.id); else await save('habitLogs', { habitId: h.id, date });
    } finally {
      setBusy(null);
    }
  };
  return { toggle, busy };
}

export default function Habits() {
  const { data, t, settings, remove } = useStore();
  const [edit, setEdit] = useState<Rec | null>(null);
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<Rec | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const { toggle, busy } = useHabitToggle();
  const L = settings.language;
  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const calendarStart = new Date(monthStart); calendarStart.setDate(1 - (L === 'fa' ? (calendarMonth.getDay() + 1) % 7 : calendarMonth.getDay()));
  const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(calendarStart); d.setDate(calendarStart.getDate() + i); return d; });
  const monthLabel = new Intl.DateTimeFormat(L === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', { month: 'long', year: 'numeric' }).format(calendarMonth);

  return (
    <div>
      <PageHeader title={t('habits')} action={<Button onClick={() => { setEdit(null); setOpen(true); }}><Plus className="h-4 w-4 me-1" />{t('add')}</Button>} />
      {data!.habits.length === 0 && <p className="text-muted-foreground text-center py-16">{t('empty')}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {data!.habits.map((h) => {
          const s = habitStats(h, data!.habitLogs);
          return (
            <div key={h.id} data-testid={`habit-card-${h.id}`} className={cn('min-w-0 rounded-xl border bg-card/70 p-2.5 sm:p-3 space-y-2', h.archived && 'opacity-50')}>
              <div className="flex items-start gap-3">
                <button type="button" data-testid="habit-toggle" aria-label={L === 'fa' ? 'ثبت انجام عادت' : 'Log habit'} disabled={busy === h.id || !!h.archived} onClick={() => toggle(h)}
                  className={cn('h-9 w-9 rounded-lg border-2 grid place-items-center transition-all shrink-0', s.doneToday ? 'bg-[hsl(var(--success))] border-transparent text-white' : 'border-border hover:border-primary')}>
                  <Check className="h-5 w-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{h.name}</div>
                  <div className="text-xs text-muted-foreground">{opt(L, h.frequency)} · {t('last30')}: {s.hasHistory ? `${fmtNum(L, s.rate30 * 100)}%` : t('noData')}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => { setEdit(h); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setDel(h)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="flex items-center gap-1"><Flame className="h-4 w-4 text-[hsl(var(--warning))]" />{t('streak')}: <b data-testid="habit-current-streak">{fmtNum(L, s.current)}</b></span>
                <span className="text-muted-foreground">{t('best')}: <b data-testid="habit-best-streak">{fmtNum(L, s.best)}</b></span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <button type="button" className="rounded-lg border px-2 py-1 text-xs" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>‹</button>
                <span className="text-xs font-semibold">{monthLabel}</span>
                <button type="button" className="rounded-lg border px-2 py-1 text-xs" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>›</button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[9px] text-muted-foreground">{(L === 'fa' ? ['ش','ی','د','س','چ','پ','ج'] : ['S','M','T','W','T','F','S']).map((x,i) => <span key={i}>{x}</span>)}</div>
              <div className="grid grid-cols-7 gap-1">{days.map((date) => { const key = isoOf(date); const done = s.dates.has(key); const inMonth = date.getMonth() === calendarMonth.getMonth(); const future = key > todayISO(); const dayLabel = new Intl.DateTimeFormat(L === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', { day: 'numeric' }).format(date); return <button type="button" key={key} title={key} aria-label={key + ': ' + (done ? (L === 'fa' ? 'انجام‌شده' : 'Completed') : (L === 'fa' ? 'انجام‌نشده' : 'Not completed'))} aria-pressed={done} disabled={future || busy === h.id || !!h.archived} onClick={() => toggle(h, key)} className={cn('aspect-square min-h-7 min-w-0 rounded-md grid place-items-center text-[9px] leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed', !inMonth && 'opacity-30', done ? 'bg-emerald-500 text-white hover:bg-emerald-600' : future ? 'bg-muted/50 text-muted-foreground' : 'bg-rose-500/80 text-white hover:bg-rose-600')}>{dayLabel}</button>; })}</div>
            </div>
          );
        })}
      </div>
      <EntityForm open={open} onOpenChange={setOpen} entity="habits" fields={FIELDS} initial={edit} defaults={{ frequency: 'Daily', targetPerPeriod: 1 }} title={t('habits')} />
      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => del && remove('habits', del.id)}>{t('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
