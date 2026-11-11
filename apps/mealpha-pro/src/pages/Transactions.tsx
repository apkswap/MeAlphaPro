import { useEffect, useMemo, useState } from 'react';
import { Plus, WalletCards, BellRing, CheckCircle2 } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { toast } from 'sonner';
import { useStore, Rec } from '../lib/store';
import { fmtDate, fmtMoney, opt } from '../lib/i18n';
import { monthFinance, todayISO, isoOf } from '../lib/analytics';
import EntityForm, { Field } from '../components/EntityForm';
import DataList, { Col } from '../components/DataList';
import { Kpi, PageHeader, Panel } from '../components/ui-bits';
import { cn } from '@project/components/lib/utils';

const BASE_FIELDS: Field[] = [
  { key: 'description', label: 'description', type: 'text', required: true, full: true },
  { key: 'kind', label: 'kind', type: 'select', options: ['Income', 'Expense'], required: true },
  { key: 'amount', label: 'amount', type: 'number', required: true },
  { key: 'currency', label: 'currency', type: 'text', required: true },
  { key: 'date', label: 'date', type: 'date', required: true },
  { key: 'category', label: 'category', type: 'text' },
  { key: 'nature', label: 'nature', type: 'select', options: ['Essential', 'Discretionary'] },
];
const ACCOUNT_FIELDS: Field[] = [
  { key: 'name', label: 'name', type: 'text', required: true },
  { key: 'bankName', label: 'bankName', type: 'text', required: true },
  { key: 'accountType', label: 'accountType', type: 'select', options: ['Current', 'Savings', 'Cash', 'Other'] },
  { key: 'accountNumber', label: 'accountNumber', type: 'text' },
  { key: 'currency', label: 'currency', type: 'text', required: true },
  { key: 'openingBalance', label: 'openingBalance', type: 'number', required: true },
];

export default function Transactions() {
  const { data, t, settings, save } = useStore();
  const [edit, setEdit] = useState<Rec | null>(null);
  const [open, setOpen] = useState(false);
  const [accountEdit, setAccountEdit] = useState<Rec | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [reminderEdit, setReminderEdit] = useState<Rec | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const L = settings.language;
  const m = monthFinance(data!.transactions, settings);
  const cur = settings.currency;
  const fields = useMemo<Field[]>(() => [
    ...BASE_FIELDS,
    { key: 'assetId', label: 'asset', type: 'select', options: data!.assets.map((a: Rec) => ({ value: a.id, label: `${a.name} (${a.currency})` })) },
    { key: 'accountId', label: 'account', type: 'select', options: data!.accounts.map((a: Rec) => ({ value: a.id, label: `${a.bankName} · ${a.name} (${a.currency})` })) },
  ], [data!.accounts]);
  const reminderFields = useMemo<Field[]>(() => [
    { key: 'description', label: 'description', type: 'text', required: true, full: true },
    { key: 'amount', label: 'amount', type: 'number', required: true },
    { key: 'currency', label: 'currency', type: 'text', required: true },
    { key: 'dueDate', label: 'dueDate', type: 'date', required: true },
    { key: 'remindDaysBefore', label: 'reminderDays', type: 'number' },
    { key: 'status', label: 'status', type: 'select', options: ['Pending', 'Paid'] },
  ], []);

  useEffect(() => {
    setNotificationsEnabled(typeof Notification !== 'undefined' && Notification.permission === 'granted');
  }, []);

  useEffect(() => {
    if (!notificationsEnabled || typeof Notification === 'undefined') return;
    const notifyDue = () => {
      const today = todayISO();
      data!.paymentReminders.filter((r: Rec) => r.status !== 'Paid' && r.dueDate).forEach((r: Rec) => {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() + Math.max(0, Number(r.remindDaysBefore) || 0));
        if (r.dueDate > isoOf(thresholdDate)) return;
        const key = `mealpha-payment-reminder:${r.id}:${today}`;
        if (localStorage.getItem(key)) return;
        new Notification(L === 'fa' ? 'یادآوری پرداخت' : 'Payment reminder', {
          body: `${r.description} · ${fmtMoney(L, Number(r.amount), r.currency)} · ${fmtDate(L, settings.calendar, r.dueDate)}`,
        });
        localStorage.setItem(key, '1');
      });
    };
    notifyDue();
    const timer = window.setInterval(notifyDue, 60000);
    return () => window.clearInterval(timer);
  }, [data!.paymentReminders, notificationsEnabled, L, settings.calendar]);

  const accountBalance = (account: Rec) => Number(account.openingBalance || 0) + data!.transactions
    .filter((tx: Rec) => tx.accountId === account.id && tx.currency === account.currency)
    .reduce((sum: number, tx: Rec) => sum + (tx.kind === 'Income' ? 1 : -1) * Number(tx.amount || 0), 0);

  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') {
      toast.error(L === 'fa' ? 'این محیط از اعلان سیستم پشتیبانی نمی‌کند.' : 'System notifications are not supported here.');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === 'granted');
    if (permission !== 'granted') toast.error(t('notificationsBlocked'));
    else toast.success(L === 'fa' ? 'اعلان یادآوری پرداخت فعال شد.' : 'Payment reminder notifications enabled.');
  };

  const markPaid = (r: Rec) => save('paymentReminders', { ...r, status: 'Paid', paidAt: new Date().toISOString() }, r.id);

  const cols: Col[] = [
    { key: 'date', label: t('date'), render: (r) => fmtDate(L, settings.calendar, r.date) },
    { key: 'description', label: t('description'), render: (r) => {
      const account = data!.accounts.find((a: Rec) => a.id === r.accountId);
      const asset = data!.assets.find((a: Rec) => a.id === r.assetId);
      return <div><div className="font-medium">{r.description}</div><div className="text-xs text-muted-foreground">{r.category || '—'} · {opt(L, r.nature)}{account ? ` · ${account.bankName} / ${account.name}` : ''}{asset ? ` · ${asset.name}` : ''}</div></div>;
    } },
    { key: 'kind', label: t('kind'), render: (r) => opt(L, r.kind) },
    { key: 'amount', label: t('amount'), sortValue: (r) => Number(r.amount), render: (r) => <span className={cn('font-semibold tabular-nums', r.kind === 'Income' ? 'text-[hsl(var(--success))]' : 'text-destructive')}>{r.kind === 'Income' ? '+' : '−'}{fmtMoney(L, Number(r.amount), r.currency)}</span> },
  ];
  const accountCols: Col[] = [
    { key: 'bankName', label: t('bankName'), render: (r) => <div><div className="font-medium">{r.bankName}</div><div className="text-xs text-muted-foreground">{r.name} · {r.accountNumber || '—'}</div></div> },
    { key: 'currency', label: t('currency'), render: (r) => r.currency },
    { key: 'balance', label: t('accountBalance'), render: (r) => <span className="font-semibold tabular-nums">{fmtMoney(L, accountBalance(r), r.currency)}</span> },
  ];
  const reminderCols: Col[] = [
    { key: 'description', label: t('description') },
    { key: 'amount', label: t('amount'), render: (r) => fmtMoney(L, Number(r.amount), r.currency) },
    { key: 'dueDate', label: t('dueDate'), render: (r) => fmtDate(L, settings.calendar, r.dueDate) },
    { key: 'status', label: t('status'), render: (r) => r.status === 'Paid'
      ? <span className="text-xs text-[hsl(var(--success))]">{t('paid')}</span>
      : <Button size="sm" variant="outline" onClick={() => void markPaid(r)}><CheckCircle2 className="h-3.5 w-3.5 me-1" />{t('markPaid')}</Button> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={t('finance')} action={<Button onClick={() => { setEdit(null); setOpen(true); }}><Plus className="h-4 w-4 me-1" />{t('add')}</Button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label={`${t('income')} · ${t('thisMonth')}`} value={fmtMoney(L, m.income, cur)} tone="good" />
        <Kpi label={`${t('expense')} · ${t('thisMonth')}`} value={fmtMoney(L, m.expense, cur)} tone="bad" />
        <Kpi label={t('cashFlow')} value={fmtMoney(L, m.net, cur)} tone={m.net >= 0 ? 'good' : 'bad'} />
        <Kpi label={t('savingsRate')} value={m.savingsRate == null ? t('noData') : `${Math.round(m.savingsRate * 100)}%`} tone="accent" />
      </div>
      {m.missing.length > 0 && <p className="text-xs text-[hsl(var(--warning))]">{t('missingRate')}: {m.missing.join(', ')}</p>}
      <Panel title={t('paymentReminders')} action={<div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={enableNotifications} disabled={notificationsEnabled}><BellRing className="h-4 w-4 me-1" />{notificationsEnabled ? (L === 'fa' ? 'اعلان فعال است' : 'Notifications on') : t('enableNotifications')}</Button>
        <Button size="sm" onClick={() => { setReminderEdit(null); setReminderOpen(true); }}><Plus className="h-4 w-4 me-1" />{t('add')}</Button>
      </div>}>
        <DataList rows={data!.paymentReminders} cols={reminderCols} entity="paymentReminders" onEdit={(r) => { setReminderEdit(r); setReminderOpen(true); }} searchKeys={['description', 'status']} />
      </Panel>
      <Panel title={t('bankAccounts')} action={<Button size="sm" onClick={() => { setAccountEdit(null); setAccountOpen(true); }}><Plus className="h-4 w-4 me-1" />{t('add')}</Button>}>
        {data!.accounts.length === 0 && <div className="flex items-center gap-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground"><WalletCards className="h-5 w-5" />{L === 'fa' ? 'برای تفکیک موجودی بانک‌ها، ابتدا حساب بانکی اضافه کن.' : 'Add bank accounts to track each balance separately.'}</div>}
        <DataList rows={data!.accounts} cols={accountCols} entity="accounts" onEdit={(r) => { setAccountEdit(r); setAccountOpen(true); }} searchKeys={['name', 'bankName', 'accountNumber']} />
      </Panel>
      <Panel title={t('finance')}>
        <DataList rows={data!.transactions} cols={cols} entity="transactions" onEdit={(r) => { setEdit(r); setOpen(true); }} searchKeys={['description', 'category']} />
      </Panel>
      <EntityForm open={open} onOpenChange={setOpen} entity="transactions" fields={fields} initial={edit} defaults={{ kind: 'Expense', currency: cur, date: todayISO(), nature: 'Essential' }} title={t('finance')} />
      <EntityForm open={accountOpen} onOpenChange={setAccountOpen} entity="accounts" fields={ACCOUNT_FIELDS} initial={accountEdit} defaults={{ currency: cur, openingBalance: 0, accountType: 'Current' }} title={t('bankAccounts')} />
      <EntityForm open={reminderOpen} onOpenChange={setReminderOpen} entity="paymentReminders" fields={reminderFields} initial={reminderEdit} defaults={{ currency: cur, dueDate: todayISO(), remindDaysBefore: 1, status: 'Pending' }} title={t('paymentReminders')} />
    </div>
  );
}
