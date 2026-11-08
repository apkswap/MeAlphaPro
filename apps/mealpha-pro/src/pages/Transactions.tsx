import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { useStore, Rec } from '../lib/store';
import { fmtDate, fmtMoney, opt } from '../lib/i18n';
import { monthFinance, todayISO } from '../lib/analytics';
import EntityForm, { Field } from '../components/EntityForm';
import DataList, { Col } from '../components/DataList';
import { Kpi, PageHeader } from '../components/ui-bits';
import { cn } from '@project/components/lib/utils';

const FIELDS: Field[] = [
  { key: 'description', label: 'description', type: 'text', required: true, full: true },
  { key: 'kind', label: 'kind', type: 'select', options: ['Income', 'Expense'], required: true },
  { key: 'amount', label: 'amount', type: 'number', required: true },
  { key: 'currency', label: 'currency', type: 'text', required: true },
  { key: 'date', label: 'date', type: 'date', required: true },
  { key: 'category', label: 'category', type: 'text' },
  { key: 'nature', label: 'nature', type: 'select', options: ['Essential', 'Discretionary'] },
];

export default function Transactions() {
  const { data, t, settings } = useStore();
  const [edit, setEdit] = useState<Rec | null>(null);
  const [open, setOpen] = useState(false);
  const L = settings.language;
  const m = monthFinance(data!.transactions, settings);
  const cur = settings.currency;

  const cols: Col[] = [
    { key: 'date', label: t('date'), render: (r) => fmtDate(L, settings.calendar, r.date) },
    { key: 'description', label: t('description'), render: (r) => <div><div className="font-medium">{r.description}</div><div className="text-xs text-muted-foreground">{r.category || '—'} · {opt(L, r.nature)}</div></div> },
    { key: 'kind', label: t('kind'), render: (r) => opt(L, r.kind) },
    { key: 'amount', label: t('amount'), sortValue: (r) => Number(r.amount), render: (r) => (
      <span className={cn('font-semibold tabular-nums', r.kind === 'Income' ? 'text-[hsl(var(--success))]' : 'text-destructive')}>
        {r.kind === 'Income' ? '+' : '−'}{fmtMoney(L, Number(r.amount), r.currency)}
      </span>) },
  ];

  return (
    <div>
      <PageHeader title={t('finance')} action={<Button onClick={() => { setEdit(null); setOpen(true); }}><Plus className="h-4 w-4 me-1" />{t('add')}</Button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi label={`${t('income')} · ${t('thisMonth')}`} value={fmtMoney(L, m.income, cur)} tone="good" />
        <Kpi label={`${t('expense')} · ${t('thisMonth')}`} value={fmtMoney(L, m.expense, cur)} tone="bad" />
        <Kpi label={t('cashFlow')} value={fmtMoney(L, m.net, cur)} tone={m.net >= 0 ? 'good' : 'bad'} />
        <Kpi label={t('savingsRate')} value={m.savingsRate == null ? t('noData') : `${Math.round(m.savingsRate * 100)}%`} tone="accent" />
      </div>
      {m.missing.length > 0 && <p className="text-xs text-[hsl(var(--warning))] mb-3">{t('missingRate')}: {m.missing.join(', ')}</p>}
      <DataList rows={data!.transactions} cols={cols} entity="transactions" onEdit={(r) => { setEdit(r); setOpen(true); }} searchKeys={['description', 'category']} />
      <EntityForm open={open} onOpenChange={setOpen} entity="transactions" fields={FIELDS} initial={edit} defaults={{ kind: 'Expense', currency: cur, date: todayISO(), nature: 'Essential' }} title={t('finance')} />
    </div>
  );
}
