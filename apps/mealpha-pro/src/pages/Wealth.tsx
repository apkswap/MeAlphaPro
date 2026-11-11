import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { useStore, Rec } from '../lib/store';
import { fmtDate, fmtMoney, fmtNum } from '../lib/i18n';
import { netWorth, todayISO } from '../lib/analytics';
import EntityForm, { Field } from '../components/EntityForm';
import DataList, { Col } from '../components/DataList';
import { Kpi, PageHeader } from '../components/ui-bits';

const A_FIELDS: Field[] = [
  { key: 'name', label: 'name', type: 'text', required: true, full: true },
  { key: 'assetType', label: 'assetType', type: 'select', options: ['Cash', 'Deposit', 'Gold', 'Foreign currency', 'Stocks', 'Funds', 'Real estate', 'Vehicle', 'Other'] },
  { key: 'currency', label: 'currency', type: 'text', required: true },
  { key: 'acquisitionCost', label: 'acqCost', type: 'number' },
  { key: 'currentValue', label: 'curValue', type: 'number', required: true },
  { key: 'valuationDate', label: 'valDate', type: 'date' },
];
const L_FIELDS: Field[] = [
  { key: 'name', label: 'name', type: 'text', required: true, full: true },
  { key: 'creditor', label: 'creditor', type: 'text' },
  { key: 'currency', label: 'currency', type: 'text', required: true },
  { key: 'originalAmount', label: 'original', type: 'number' },
  { key: 'outstandingAmount', label: 'outstanding', type: 'number', required: true },
  { key: 'interestRate', label: 'interest', type: 'number' },
  { key: 'dueDate', label: 'dueDate', type: 'date' },
];

// Preserve valuation history: append previous value when it changes
const keepHistory = (r: Rec, prev?: Rec | null) => {
  let hist: unknown[] = [];
  try { hist = JSON.parse(prev?.valuationHistory || '[]'); } catch { /* ignore */ }
  if (prev && Number(prev.currentValue) !== Number(r.currentValue))
    hist.push({ date: prev.valuationDate || todayISO(), value: prev.currentValue });
  return { ...r, valuationHistory: JSON.stringify(hist) };
};

export default function Wealth() {
  const { data, t, settings } = useStore();
  const [form, setForm] = useState<{ kind: 'assets' | 'liabilities'; rec: Rec | null } | null>(null);
  const L = settings.language, cal = settings.calendar, cur = settings.currency;
  const assetValue = (asset: Rec) => Number(asset.currentValue || 0) + data!.transactions.filter((tx: Rec) => tx.assetId === asset.id && tx.currency === asset.currency).reduce((sum: number, tx: Rec) => sum + (tx.kind === 'Income' ? 1 : -1) * Number(tx.amount || 0), 0);

  const nw = netWorth(data!.assets, data!.liabilities, settings, data!.transactions);

  const aCols: Col[] = [
    { key: 'name', label: t('name'), render: (r) => <div><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.assetType}</div></div> },
    { key: 'currentValue', label: t('curValue'), sortValue: (r) => assetValue(r), render: (r) => {
      const current = assetValue(r);
      const gain = r.acquisitionCost ? (current - Number(r.acquisitionCost)) / Number(r.acquisitionCost) : null;
      return <div className="tabular-nums"><div className="font-semibold">{fmtMoney(L, current, r.currency)}</div>{gain != null && <div className={gain >= 0 ? 'text-xs text-[hsl(var(--success))]' : 'text-xs text-destructive'}>{gain >= 0 ? '+' : ''}{fmtNum(L, gain * 100, 1)}%</div>}</div>;
    } },
    { key: 'valuationDate', label: t('valDate'), render: (r) => fmtDate(L, cal, r.valuationDate) },
  ];
  const lCols: Col[] = [
    { key: 'name', label: t('name'), render: (r) => <div><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.creditor}</div></div> },
    { key: 'outstandingAmount', label: t('outstanding'), sortValue: (r) => Number(r.outstandingAmount), render: (r) => <span className="font-semibold tabular-nums text-destructive">{fmtMoney(L, Number(r.outstandingAmount), r.currency)}</span> },
    { key: 'interestRate', label: t('interest'), render: (r) => fmtNum(L, r.interestRate, 2) },
    { key: 'dueDate', label: t('dueDate'), render: (r) => fmtDate(L, cal, r.dueDate) },
  ];

  return (
    <div>
      <PageHeader title={t('wealth')} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Kpi label={t('assets')} value={fmtMoney(L, nw.assets, cur)} tone="good" />
        <Kpi label={t('liabilities')} value={fmtMoney(L, nw.liabilities, cur)} tone="bad" />
        <Kpi label={t('netWorth')} value={fmtMoney(L, nw.net, cur)} tone="accent" />
      </div>
      {nw.missing.length > 0 && <p className="text-xs text-[hsl(var(--warning))] mb-3">{t('missingRate')}: {nw.missing.join(', ')}</p>}
      <Tabs defaultValue="assets">
        <TabsList><TabsTrigger value="assets">{t('assets')}</TabsTrigger><TabsTrigger value="liabilities">{t('liabilities')}</TabsTrigger></TabsList>
        <TabsContent value="assets">
          <DataList rows={data!.assets} cols={aCols} entity="assets" onEdit={(r) => setForm({ kind: 'assets', rec: r })} searchKeys={['name', 'assetType']}
            toolbar={<Button onClick={() => setForm({ kind: 'assets', rec: null })}><Plus className="h-4 w-4 me-1" />{t('add')}</Button>} />
        </TabsContent>
        <TabsContent value="liabilities">
          <DataList rows={data!.liabilities} cols={lCols} entity="liabilities" onEdit={(r) => setForm({ kind: 'liabilities', rec: r })} searchKeys={['name', 'creditor']}
            toolbar={<Button onClick={() => setForm({ kind: 'liabilities', rec: null })}><Plus className="h-4 w-4 me-1" />{t('add')}</Button>} />
        </TabsContent>
      </Tabs>
      <EntityForm open={!!form} onOpenChange={(o) => !o && setForm(null)} entity={form?.kind ?? 'assets'}
        fields={form?.kind === 'liabilities' ? L_FIELDS : A_FIELDS} initial={form?.rec} transform={form?.kind === 'assets' ? keepHistory : undefined}
        defaults={{ currency: cur, valuationDate: todayISO() }} title={form?.kind === 'liabilities' ? t('liabilities') : t('assets')} />
    </div>
  );
}
