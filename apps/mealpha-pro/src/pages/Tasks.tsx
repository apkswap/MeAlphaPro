import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Checkbox } from '@project/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { useStore, Rec } from '../lib/store';
import { fmtDate, fmtNum, opt } from '../lib/i18n';
import { todayISO } from '../lib/analytics';
import EntityForm, { Field } from '../components/EntityForm';
import DataList, { Col } from '../components/DataList';
import { PageHeader } from '../components/ui-bits';
import { cn } from '@project/components/lib/utils';

export const completeTx = (r: Rec, prev?: Rec | null) => ({
  ...r, completedAt: r.status === 'Done' ? prev?.completedAt ?? new Date().toISOString() : null,
});

export default function Tasks() {
  const { data, t, settings, save } = useStore();
  const [edit, setEdit] = useState<Rec | null>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('open');
  const L = settings.language;
  const today = todayISO();
  const goalOpts = data!.goals.map((g) => ({ value: g.id, label: g.title || '—' }));
  const fields: Field[] = [
    { key: 'title', label: 'title', type: 'text', required: true, full: true },
    { key: 'status', label: 'status', type: 'select', options: ['Todo', 'In Progress', 'Done'] },
    { key: 'priority', label: 'priority', type: 'select', options: ['Low', 'Medium', 'High'] },
    { key: 'dueDate', label: 'dueDate', type: 'date' },
    ...(goalOpts.length ? [{ key: 'goalId', label: 'linkedGoal', type: 'select', options: goalOpts } as Field] : []),
    { key: 'estimatedMinutes', label: 'estMin', type: 'number' },
    { key: 'actualMinutes', label: 'actMin', type: 'number' },
    { key: 'notes', label: 'notes', type: 'textarea' },
  ];

  const rows = data!.tasks.filter((x) =>
    filter === 'all' ? true : filter === 'open' ? x.status !== 'Done' : filter === 'overdue' ? x.status !== 'Done' && x.dueDate && x.dueDate < today : filter === 'today' ? x.dueDate === today : x.status === 'Done');

  const toggle = (r: Rec) => save('tasks', completeTx({ status: r.status === 'Done' ? 'Todo' : 'Done' }, r), r.id);

  const cols: Col[] = [
    { key: 'title', label: t('title'), render: (r) => (
      <div className="flex items-center gap-3">
        <Checkbox checked={r.status === 'Done'} onCheckedChange={() => toggle(r)} />
        <div className={cn(r.status === 'Done' && 'line-through text-muted-foreground')}>
          <div className="font-medium">{r.title}</div>
          {r.goalId && <div className="text-xs text-primary">{data!.goals.find((g) => g.id === r.goalId)?.title}</div>}
        </div>
      </div>) },
    { key: 'status', label: t('status'), render: (r) => opt(L, r.status) },
    { key: 'priority', label: t('priority'), sortValue: (r) => ({ High: 3, Medium: 2, Low: 1 } as Record<string, number>)[r.priority] ?? 0, render: (r) => opt(L, r.priority) },
    { key: 'dueDate', label: t('dueDate'), render: (r) => <span className={cn(r.status !== 'Done' && r.dueDate && r.dueDate < today && 'text-destructive font-semibold')}>{fmtDate(L, settings.calendar, r.dueDate)}</span> },
    { key: 'estimatedMinutes', label: `${t('estMin')}`, render: (r) => `${fmtNum(L, r.estimatedMinutes)} / ${fmtNum(L, r.actualMinutes)}` },
  ];

  const filterSel = (
    <Select value={filter} onValueChange={setFilter}>
      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="open">{opt(L, 'Todo')}</SelectItem>
        <SelectItem value="today">{t('today')}</SelectItem>
        <SelectItem value="overdue">{t('overdue')}</SelectItem>
        <SelectItem value="done">{opt(L, 'Done')}</SelectItem>
        <SelectItem value="all">{L === 'fa' ? 'همه' : 'All'}</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <div>
      <PageHeader title={t('tasks')} action={<Button onClick={() => { setEdit(null); setOpen(true); }}><Plus className="h-4 w-4 me-1" />{t('add')}</Button>} />
      <DataList rows={rows} cols={cols} entity="tasks" onEdit={(r) => { setEdit(r); setOpen(true); }} searchKeys={['title', 'notes']} toolbar={filterSel} />
      <EntityForm open={open} onOpenChange={setOpen} entity="tasks" fields={fields} initial={edit} defaults={{ status: 'Todo', priority: 'Medium', dueDate: today }} title={t('tasks')} transform={completeTx} />
    </div>
  );
}
