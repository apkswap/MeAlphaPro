import { useState } from 'react';
import { Plus, Layers3 } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { useStore, Rec } from '../lib/store';
import EntityForm, { Field } from '../components/EntityForm';
import DataList, { Col } from '../components/DataList';
import { Panel, PageHeader } from '../components/ui-bits';
import { fmtDate } from '../lib/i18n';

const FIELDS: Field[] = [
  { key: 'title', label: 'itemTitle', type: 'text', required: true, full: true },
  { key: 'category', label: 'itemType', type: 'text', required: true },
  { key: 'status', label: 'itemStatus', type: 'select', options: ['Idea', 'Active', 'Waiting', 'Done'] },
  { key: 'dueDate', label: 'itemDueDate', type: 'date' },
  { key: 'details', label: 'itemDetails', type: 'textarea', full: true },
];

export default function Workspace() {
  const { data, t, settings } = useStore();
  const [edit, setEdit] = useState<Rec | null>(null);
  const [open, setOpen] = useState(false);
  const fa = settings.language === 'fa';
  const cols: Col[] = [
    { key: 'title', label: t('itemTitle'), render: (r) => <div><div className="font-semibold">{r.title}</div><div className="text-xs text-muted-foreground">{r.category || '—'}</div></div> },
    { key: 'status', label: t('itemStatus'), render: (r) => r.status || (fa ? 'بدون وضعیت' : 'No status') },
    { key: 'dueDate', label: t('itemDueDate'), render: (r) => fmtDate(settings.language, settings.calendar, r.dueDate) },
  ];
  return (
    <div className="space-y-5">
      <PageHeader title={t('workspace')} action={<Button onClick={() => { setEdit(null); setOpen(true); }}><Plus className="h-4 w-4 me-1" />{t('add')}</Button>} />
      <Panel>
        <div className="flex items-start gap-3"><div className="rounded-xl bg-primary/15 p-3 text-primary"><Layers3 className="h-5 w-5" /></div><div><h2 className="font-semibold">{fa ? 'فضای آزاد برای مدیریت شخصی' : 'A flexible personal space'}</h2><p className="mt-1 text-sm leading-7 text-muted-foreground">{t('customSpaceHelp')}</p></div></div>
      </Panel>
      <DataList rows={data!.customItems} cols={cols} entity="customItems" onEdit={(r) => { setEdit(r); setOpen(true); }} searchKeys={['title', 'category', 'details']} />
      <EntityForm open={open} onOpenChange={setOpen} entity="customItems" fields={FIELDS} initial={edit} defaults={{ status: 'Idea' }} title={t('workspace')} />
    </div>
  );
}
