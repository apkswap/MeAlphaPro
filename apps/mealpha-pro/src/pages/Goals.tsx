import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { useStore, Rec } from '../lib/store';
import { fmtDate, fmtNum, opt } from '../lib/i18n';
import { goalInfo } from '../lib/analytics';
import EntityForm, { Field } from '../components/EntityForm';
import DataList, { Col } from '../components/DataList';
import { Bar, PageHeader, StatusPill } from '../components/ui-bits';

const FIELDS: Field[] = [
  { key: 'title', label: 'title', type: 'text', required: true, full: true },
  { key: 'horizon', label: 'horizon', type: 'select', options: ['Lifetime', 'Annual', 'Quarterly', 'Monthly', 'Weekly'] },
  { key: 'priority', label: 'priority', type: 'select', options: ['Low', 'Medium', 'High'] },
  { key: 'category', label: 'category', type: 'text' },
  { key: 'completed', label: 'completed', type: 'checkbox' },
  { key: 'startDate', label: 'startDate', type: 'date' },
  { key: 'dueDate', label: 'dueDate', type: 'date' },
  { key: 'targetValue', label: 'target', type: 'number' },
  { key: 'currentValue', label: 'current', type: 'number' },
  { key: 'description', label: 'description', type: 'textarea' },
];

export const statusKey = { 'On Track': 'onTrack', 'At Risk': 'atRisk', Delayed: 'delayed', Completed: 'completed', Unknown: 'noData' } as const;

export default function Goals() {
  const { data, t, settings } = useStore();
  const [edit, setEdit] = useState<Rec | null>(null);
  const [open, setOpen] = useState(false);
  const L = settings.language;
  const openForm = (r: Rec | null) => { setEdit(r); setOpen(true); };

  const cols: Col[] = [
    { key: 'title', label: t('title'), render: (r) => <div><div className="font-semibold">{r.title}</div><div className="text-xs text-muted-foreground">{opt(L, r.horizon)} · {r.category || '—'}</div></div> },
    { key: 'progress', label: t('progress'), sortValue: (r) => goalInfo(r).progress ?? -1, render: (r) => {
      const g = goalInfo(r);
      return <div className="space-y-1 min-w-[120px]"><Bar value={g.progress} /><div className="text-xs text-muted-foreground tabular-nums">{g.progress == null ? t('noData') : `${fmtNum(L, g.progress * 100)}%`} {g.expected != null && `· ${t('estimate')} ${fmtNum(L, g.expected * 100)}%`}</div></div>;
    } },
    { key: 'status', label: t('status'), sortValue: (r) => goalInfo(r).status, render: (r) => { const s = goalInfo(r).status; return <StatusPill status={s} label={t(statusKey[s])} />; } },
    { key: 'dueDate', label: t('dueDate'), render: (r) => {
      const p = goalInfo(r).predicted;
      return <div><div>{fmtDate(L, settings.calendar, r.dueDate)}</div>{p && <div className="text-xs text-muted-foreground">≈ {fmtDate(L, settings.calendar, p)} ({t('estimate')})</div>}</div>;
    } },
    { key: 'priority', label: t('priority'), render: (r) => opt(L, r.priority) },
  ];

  return (
    <div>
      <PageHeader title={t('goals')} action={<Button onClick={() => openForm(null)}><Plus className="h-4 w-4 me-1" />{t('add')}</Button>} />
      <DataList rows={data!.goals} cols={cols} entity="goals" onEdit={openForm} searchKeys={['title', 'category', 'description']} />
      <EntityForm open={open} onOpenChange={setOpen} entity="goals" fields={FIELDS} initial={edit} defaults={{ horizon: 'Quarterly', priority: 'Medium' }} title={t('goals')} />
    </div>
  );
}
