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
  const toggle = async (h: Rec) => {
    setBusy(h.id);
    const log = data!.habitLogs.find((l) => l.habitId === h.id && l.date === todayISO());
    if (log) await remove('habitLogs', log.id); else await save('habitLogs', { habitId: h.id, date: todayISO() });
    setBusy(null);
  };
  return { toggle, busy };
}

export default function Habits() {
  const { data, t, settings, remove } = useStore();
  const [edit, setEdit] = useState<Rec | null>(null);
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<Rec | null>(null);
  const { toggle, busy } = useHabitToggle();
  const L = settings.language;
  const days = Array.from({ length: 30 }, (_, i) => isoOf(new Date(Date.now() - (29 - i) * 86400000)));

  return (
    <div>
      <PageHeader title={t('habits')} action={<Button onClick={() => { setEdit(null); setOpen(true); }}><Plus className="h-4 w-4 me-1" />{t('add')}</Button>} />
      {data!.habits.length === 0 && <p className="text-muted-foreground text-center py-16">{t('empty')}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {data!.habits.map((h) => {
          const s = habitStats(h, data!.habitLogs);
          return (
            <div key={h.id} className={cn('rounded-2xl border bg-card/70 p-5 space-y-4', h.archived && 'opacity-50')}>
              <div className="flex items-start gap-3">
                <button disabled={busy === h.id} onClick={() => toggle(h)}
                  className={cn('h-11 w-11 rounded-xl border-2 grid place-items-center transition-all shrink-0', s.doneToday ? 'bg-[hsl(var(--success))] border-transparent text-white' : 'border-border hover:border-primary')}>
                  <Check className="h-5 w-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{h.name}</div>
                  <div className="text-xs text-muted-foreground">{opt(L, h.frequency)} · {t('last30')}: {s.hasHistory ? `${fmtNum(L, s.rate30 * 100)}%` : t('noData')}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => { setEdit(h); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setDel(h)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1"><Flame className="h-4 w-4 text-[hsl(var(--warning))]" />{t('streak')}: <b>{fmtNum(L, s.current)}</b></span>
                <span className="text-muted-foreground">{t('best')}: {fmtNum(L, s.best)}</span>
              </div>
              <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-1">
                {days.map((d) => <div key={d} title={d} className={cn('aspect-square rounded-[3px]', s.dates.has(d) ? 'bg-emerald-500' : 'bg-rose-500/80')} />)}
              </div>
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
