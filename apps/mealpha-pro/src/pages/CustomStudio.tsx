import { useMemo, useState } from 'react';
import { Plus, Trash2, Boxes, Save, X } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Textarea } from '@project/components/ui/textarea';
import { useStore } from '../lib/store';
import { CustomField, CustomSpace } from '../lib/localDb';
import { PageHeader, Panel } from '../components/ui-bits';
import { toast } from 'sonner';

const makeId = () => crypto.randomUUID();
const palette = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

export default function CustomStudio() {
  const { settings, setLocalSettings } = useStore();
  const fa = settings.language === 'fa';
  const spaces = settings.customSpaces ?? [];
  const [activeId, setActiveId] = useState(spaces[0]?.id ?? '');
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('✦');
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<CustomField['type']>('text');
  const [fieldOptions, setFieldOptions] = useState('');
  const [draft, setDraft] = useState<Record<string, string | number | boolean>>({});
  const active = useMemo(() => spaces.find(s => s.id === activeId) ?? spaces[0], [spaces, activeId]);
  const persist = async (next: CustomSpace[]) => {
    try { await setLocalSettings({ ...settings, customSpaces: next }); }
    catch { toast.error(fa ? 'ذخیره‌سازی انجام نشد' : 'Could not save changes'); }
  };
  const addSpace = async () => {
    const name = newName.trim();
    if (!name) return;
    const item: CustomSpace = { id: makeId(), name, icon: newIcon.trim() || '✦', color: palette[spaces.length % palette.length], fields: [], records: [] };
    await persist([...spaces, item]); setActiveId(item.id); setNewName('');
  };
  const updateSpace = (id: string, update: (space: CustomSpace) => CustomSpace) => persist(spaces.map(s => s.id === id ? update(s) : s));
  const addField = async () => {
    if (!active || !fieldName.trim()) return;
    const field: CustomField = { id: makeId(), name: fieldName.trim(), type: fieldType, ...(fieldType === 'select' ? { options: [...new Set(fieldOptions.split(/[\n,،]/).map(x => x.trim()).filter(Boolean))] } : {}) };
    if (field.type === 'select' && !field.options?.length) return toast.error(fa ? 'برای فهرست انتخاب، گزینه تعریف کن' : 'Add at least one select option');
    await updateSpace(active.id, s => ({ ...s, fields: [...s.fields, field] }));
    setFieldName(''); setFieldOptions('');
  };
  const addRecord = async () => {
    if (!active || !active.fields.length) return;
    const values: Record<string, string | number | boolean> = {};
    for (const field of active.fields) {
      const value = draft[field.id];
      if (field.type === 'checkbox') values[field.id] = Boolean(value);
      else if (field.type === 'number') values[field.id] = value === '' || value === undefined ? 0 : Number(value);
      else values[field.id] = String(value ?? '');
    }
    await updateSpace(active.id, s => ({ ...s, records: [{ id: makeId(), createdAt: Date.now(), values }, ...s.records] }));
    setDraft({});
  };
  const removeSpace = async (id: string) => {
    const next = spaces.filter(s => s.id !== id);
    await persist(next); setActiveId(next[0]?.id ?? '');
  };
  return <div className="max-w-6xl space-y-5">
    <PageHeader title={fa ? 'استودیوی فضای کاری' : 'Workspace Studio'} />
    <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Panel title={fa ? 'فضاهای سفارشی' : 'Custom spaces'}>
        <div className="space-y-2">
          {spaces.map(space => <button key={space.id} onClick={() => { setActiveId(space.id); setDraft({}); }} className={active?.id === space.id ? 'flex w-full items-center gap-3 rounded-xl border border-violet-400/50 bg-violet-500/10 p-3 text-start' : 'flex w-full items-center gap-3 rounded-xl border border-white/10 p-3 text-start hover:bg-white/5'}>
            <span className="grid h-9 w-9 place-items-center rounded-xl text-xl" style={{ backgroundColor: space.color + '22' }}>{space.icon}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{space.name}</span>
            <span className="text-xs text-slate-500">{space.records.length}</span>
          </button>)}
          {!spaces.length && <p className="py-4 text-sm text-muted-foreground">{fa ? 'هنوز فضای سفارشی نساخته‌ای.' : 'No custom spaces yet.'}</p>}
        </div>
        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
          <Label>{fa ? 'نام فضای جدید' : 'New space name'}</Label>
          <div className="flex gap-2"><Input value={newIcon} onChange={e => setNewIcon(e.target.value)} className="w-14 text-center" aria-label="Space icon"/><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder={fa ? 'مثلاً کتابخانه من' : 'e.g. My reading list'} onKeyDown={e => e.key === 'Enter' && void addSpace()}/></div>
          <Button className="w-full" onClick={() => void addSpace()} disabled={!newName.trim()}><Plus className="me-2 h-4 w-4"/>{fa ? 'ساخت فضای سفارشی' : 'Create custom space'}</Button>
        </div>
      </Panel>
      <div className="space-y-5">
        {active ? <>
          <Panel>
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl text-2xl" style={{ backgroundColor: active.color + '22' }}>{active.icon}</span>
              <div className="min-w-0 flex-1"><h2 className="text-lg font-bold">{active.name}</h2><p className="text-xs text-muted-foreground">{fa ? 'فیلدها و ساختار داده اختصاصی این فضا را تعریف کن.' : 'Define this space’s data structure and fields.'}</p></div>
              <Button variant="ghost" size="sm" className="text-rose-300" onClick={() => void removeSpace(active.id)}><Trash2 className="me-2 h-4 w-4"/>{fa ? 'حذف فضا' : 'Delete space'}</Button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_150px]">
              <div className="space-y-1"><Label>{fa ? 'نام فیلد' : 'Field name'}</Label><Input value={fieldName} onChange={e => setFieldName(e.target.value)} placeholder={fa ? 'مثلاً نویسنده، وضعیت، امتیاز…' : 'e.g. Author, status, rating…'}/></div>
              <div className="space-y-1"><Label>{fa ? 'نوع داده' : 'Field type'}</Label><Select value={fieldType} onValueChange={v => setFieldType(v as CustomField['type'])}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="text">Text</SelectItem><SelectItem value="number">Number</SelectItem><SelectItem value="date">Date</SelectItem><SelectItem value="checkbox">Checkbox</SelectItem><SelectItem value="select">Select</SelectItem></SelectContent></Select></div>
            </div>
            {fieldType === 'select' && <div className="mt-3 space-y-1"><Label>{fa ? 'گزینه‌ها (هر خط یک گزینه)' : 'Options (one per line)'}</Label><Textarea rows={2} value={fieldOptions} onChange={e => setFieldOptions(e.target.value)}/></div>}
            <Button className="mt-3" variant="outline" onClick={() => void addField()} disabled={!fieldName.trim()}><Plus className="me-2 h-4 w-4"/>{fa ? 'افزودن فیلد' : 'Add field'}</Button>
            <div className="mt-4 flex flex-wrap gap-2">{active.fields.map(field => <span key={field.id} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs"><span>{field.name}</span><span className="text-slate-500">{field.type}</span><button aria-label="Remove field" onClick={() => void updateSpace(active.id, s => ({ ...s, fields: s.fields.filter(f => f.id !== field.id), records: s.records.map(r => { const values = { ...r.values }; delete values[field.id]; return { ...r, values }; }) }))}><X className="h-3 w-3"/></button></span>)}</div>
          </Panel>
          <Panel title={fa ? 'ثبت داده جدید' : 'Add a record'}>
            {!active.fields.length ? <p className="text-sm text-muted-foreground">{fa ? 'ابتدا حداقل یک فیلد تعریف کن.' : 'Define at least one field first.'}</p> : <>
              <div className="grid gap-3 sm:grid-cols-2">{active.fields.map(field => <div key={field.id} className="space-y-1"><Label>{field.name}</Label>{field.type === 'checkbox' ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(draft[field.id])} onChange={e => setDraft(p => ({ ...p, [field.id]: e.target.checked }))}/>{fa ? 'فعال' : 'Enabled'}</label> : field.type === 'select' ? <Select value={String(draft[field.id] ?? '')} onValueChange={v => setDraft(p => ({ ...p, [field.id]: v }))}><SelectTrigger><SelectValue placeholder={fa ? 'انتخاب کن' : 'Choose'}/></SelectTrigger><SelectContent>{(field.options ?? []).map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select> : <Input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} value={String(draft[field.id] ?? '')} onChange={e => setDraft(p => ({ ...p, [field.id]: e.target.value }))}/>}</div>)}</div>
              <Button className="mt-4" onClick={() => void addRecord()}><Save className="me-2 h-4 w-4"/>{fa ? 'ذخیره رکورد' : 'Save record'}</Button>
            </>}
          </Panel>
          <Panel title={fa ? 'داده‌های ثبت‌شده' : 'Records'}>
            {!active.records.length ? <p className="text-sm text-muted-foreground">{fa ? 'هنوز داده‌ای ثبت نشده.' : 'No records yet.'}</p> : <div className="space-y-2">{active.records.map(record => <div key={record.id} className="flex items-start gap-3 rounded-xl border border-white/10 p-3"><div className="grid flex-1 gap-2 sm:grid-cols-2">{active.fields.map(field => <div key={field.id} className="min-w-0"><div className="text-[10px] text-slate-500">{field.name}</div><div className="break-words text-sm">{field.type === 'checkbox' ? (record.values[field.id] ? '✓' : '—') : String(record.values[field.id] ?? '—')}</div></div>)}</div><button aria-label="Delete record" className="rounded-lg p-2 text-rose-300 hover:bg-rose-500/10" onClick={() => void updateSpace(active.id, s => ({ ...s, records: s.records.filter(r => r.id !== record.id) }))}><Trash2 className="h-4 w-4"/></button></div>)}</div>}
          </Panel>
        </> : <Panel><div className="grid place-items-center py-16 text-center"><Boxes className="mb-3 h-10 w-10 text-violet-300"/><h2 className="font-bold">{fa ? 'فضای کاری خودت را بساز' : 'Build your own workspace'}</h2><p className="mt-2 max-w-sm text-sm text-muted-foreground">{fa ? 'برای هر موضوعی فضای اختصاصی با فیلدها و داده‌های دلخواه بساز.' : 'Create a dedicated space for anything, with your own fields and records.'}</p></div></Panel>}
      </div>
    </div>
  </div>;
}
