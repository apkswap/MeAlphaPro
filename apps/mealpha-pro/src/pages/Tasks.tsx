import { useState } from 'react';
import { AlarmClock, Bell, BellOff, Plus, Trash2 } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Checkbox } from '@project/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { toast } from 'sonner';
import { useStore, Rec } from '../lib/store';
import { fmtDate, fmtNum, opt } from '../lib/i18n';
import { todayISO } from '../lib/analytics';
import { nextTaskReminderDate, requestTaskReminderPermission } from '../lib/taskNotifications';
import EntityForm, { Field } from '../components/EntityForm';
import DataList, { Col } from '../components/DataList';
import { PageHeader } from '../components/ui-bits';
import { cn } from '@project/components/lib/utils';

export const completeTx = (r: Rec, prev?: Rec | null) => ({
  ...r, completedAt: r.status === 'Done' ? prev?.completedAt ?? new Date().toISOString() : null,
});
function localDateTimeValue(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}
function TaskReminders({ task, language, onSave }: { task: Rec; language: 'fa' | 'en'; onSave: (next: Rec) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(() => localDateTimeValue(new Date(Date.now() + 60 * 60000)));
  const [repeat, setRepeat] = useState('none');
  const reminders: Rec[] = Array.isArray(task.reminders) ? task.reminders : [];
  const fa = language === 'fa';
  const update = async (next: Rec[]) => onSave({ ...task, reminders: next });
  const add = async () => {
    if (!at || !Number.isFinite(new Date(at).getTime()) || new Date(at).getTime() <= Date.now()) {
      toast.error(fa ? 'زمان یادآور باید در آینده باشد.' : 'Choose a reminder time in the future.');
      return;
    }
    const permission = await requestTaskReminderPermission();
    if (!permission) toast.error(fa ? 'اجازه اعلان داده نشد؛ یادآور در برنامه ذخیره می‌شود.' : 'Notification permission was not granted; the reminder will remain in the app.');
    const reminder = { id: crypto.randomUUID(), at: new Date(at).toISOString(), repeat, enabled: true, createdAt: new Date().toISOString() };
    if (await update([...reminders, reminder])) {
      setAt(localDateTimeValue(new Date(Date.now() + 60 * 60000))); setRepeat('none');
    }
  };
  const patch = (id: string, changes: Rec) => update(reminders.map((item) => item.id === id ? { ...item, ...changes } : item));
  const remove = (id: string) => update(reminders.filter((item) => item.id !== id));
  const snooze = (item: Rec) => patch(item.id, { at: new Date(Date.now() + 10 * 60000).toISOString(), enabled: true, lastFiredAt: null });
  return <>
    <Button type="button" size="icon" variant="ghost" className="relative shrink-0" title={fa ? 'مدیریت یادآورها' : 'Manage reminders'} aria-label={fa ? 'مدیریت یادآورها' : 'Manage reminders'} onClick={() => setOpen(true)}>
      {reminders.some((item) => item.enabled) ? <Bell className="h-4 w-4 text-primary" /> : <AlarmClock className="h-4 w-4 text-muted-foreground" />}
      {reminders.length > 0 && <span className="absolute -end-0.5 -top-0.5 min-w-4 rounded-full bg-primary px-1 text-[9px] leading-4 text-primary-foreground">{reminders.length}</span>}
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg" dir={fa ? 'rtl' : 'ltr'}>
        <DialogHeader><DialogTitle>{fa ? 'یادآورهای «' + task.title + '»' : 'Reminders for “' + task.title + '”'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 rounded-xl border bg-card/50 p-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
            <div className="space-y-1.5"><Label>{fa ? 'تاریخ و ساعت' : 'Date and time'}</Label><Input type="datetime-local" value={at} min={localDateTimeValue(new Date())} onChange={(event) => setAt(event.target.value)} /></div>
            <div className="space-y-1.5"><Label>{fa ? 'تکرار' : 'Repeat'}</Label><Select value={repeat} onValueChange={setRepeat}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">{fa ? 'بدون تکرار' : 'Never'}</SelectItem><SelectItem value="daily">{fa ? 'روزانه' : 'Daily'}</SelectItem><SelectItem value="weekly">{fa ? 'هفتگی' : 'Weekly'}</SelectItem><SelectItem value="monthly">{fa ? 'ماهانه' : 'Monthly'}</SelectItem></SelectContent></Select></div>
            <Button type="button" onClick={add}><Plus className="me-1 h-4 w-4" />{fa ? 'افزودن' : 'Add'}</Button>
          </div>
          <div className="max-h-[42vh] space-y-2 overflow-y-auto">
            {reminders.length === 0 && <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{fa ? 'هنوز یادآوری برای این تسک ثبت نشده است.' : 'No reminders have been added to this task yet.'}</div>}
            {reminders.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-xl border p-3">
              <div className="min-w-0 flex-1"><div className="text-sm font-semibold">{(nextTaskReminderDate(item) || new Date(item.at)).toLocaleString(fa ? 'fa-IR' : 'en-US')}</div><div className="mt-1 text-xs text-muted-foreground">{item.repeat === 'none' ? (fa ? 'بدون تکرار' : 'One time') : opt(language, item.repeat === 'daily' ? 'Daily' : item.repeat === 'weekly' ? 'Weekly' : 'Monthly')} · {item.enabled ? (fa ? 'فعال' : 'Enabled') : (fa ? 'غیرفعال' : 'Disabled')}</div></div>
              <Button type="button" size="sm" variant="outline" onClick={() => snooze(item)}>{fa ? 'تعویق ۱۰ دقیقه' : 'Snooze 10m'}</Button>
              <Button type="button" size="icon" variant="ghost" aria-label={item.enabled ? (fa ? 'غیرفعال‌سازی یادآور' : 'Disable reminder') : (fa ? 'فعال‌سازی یادآور' : 'Enable reminder')} onClick={() => patch(item.id, { enabled: !item.enabled, lastFiredAt: null })}>{item.enabled ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}</Button>
              <Button type="button" size="icon" variant="ghost" aria-label={fa ? 'حذف یادآور' : 'Delete reminder'} onClick={() => remove(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>)}
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>{fa ? 'بستن' : 'Close'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

export default function Tasks() {
  const { data, t, settings, save } = useStore();
  const [edit, setEdit] = useState<Rec | null>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('open');
  const L = settings.language; const today = todayISO();
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
  const rows = data!.tasks.filter((x) => filter === 'all' ? true : filter === 'open' ? x.status !== 'Done' : filter === 'overdue' ? x.status !== 'Done' && x.dueDate && x.dueDate < today : filter === 'today' ? x.dueDate === today : x.status === 'Done');
  const toggle = (r: Rec) => save('tasks', completeTx({ ...r, status: r.status === 'Done' ? 'Todo' : 'Done' }, r), r.id);
  const saveTask = (task: Rec) => save('tasks', task, task.id);
  const cols: Col[] = [
    { key: 'title', label: t('title'), render: (r) => (
      <div className="flex w-full min-w-0 items-start gap-2">
        <Checkbox checked={r.status === 'Done'} onCheckedChange={() => toggle(r)} />
        <div className={cn('min-w-0 flex-1', r.status === 'Done' && 'line-through text-muted-foreground')}><div className="whitespace-normal break-words [overflow-wrap:anywhere] text-start text-sm font-medium leading-5">{r.title}</div>{r.dailyEntryType === 'journal' && <div className="text-[10px] font-semibold text-primary">{L === 'fa' ? 'روزنوشت همان روز' : 'Daily journal'}</div>}{r.goalId && <div className="text-xs text-primary">{data!.goals.find((g) => g.id === r.goalId)?.title}</div>}</div>
        <TaskReminders task={r} language={L} onSave={saveTask} />
      </div>) },
    { key: 'status', label: t('status'), render: (r) => opt(L, r.status) },
    { key: 'priority', label: t('priority'), sortValue: (r) => ({ High: 3, Medium: 2, Low: 1 } as Record<string, number>)[r.priority] ?? 0, render: (r) => opt(L, r.priority) },
    { key: 'dueDate', label: t('dueDate'), render: (r) => <span className={cn(r.status !== 'Done' && r.dueDate && r.dueDate < today && 'font-semibold text-destructive')}>{fmtDate(L, settings.calendar, r.dueDate)}</span> },
    { key: 'estimatedMinutes', label: t('estMin'), render: (r) => fmtNum(L, r.estimatedMinutes) + ' / ' + fmtNum(L, r.actualMinutes) },
  ];
  const filterSel = <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>
    <SelectItem value="open">{opt(L, 'Todo')}</SelectItem><SelectItem value="today">{t('today')}</SelectItem><SelectItem value="overdue">{t('overdue')}</SelectItem><SelectItem value="done">{opt(L, 'Done')}</SelectItem><SelectItem value="all">{L === 'fa' ? 'همه' : 'All'}</SelectItem>
  </SelectContent></Select>;
  return <div className="space-y-3">
    <PageHeader title={t('tasks')} action={<Button onClick={() => { setEdit(null); setOpen(true); }}><Plus className="me-1 h-4 w-4" />{t('add')}</Button>} />
    <div className="rounded-xl border bg-card/50 px-4 py-3 text-xs text-muted-foreground">{t('taskReminderHelp')}</div>
    <DataList rows={rows} cols={cols} entity="tasks" onEdit={(r) => { setEdit(r); setOpen(true); }} searchKeys={['title', 'notes']} toolbar={filterSel} />
    <EntityForm open={open} onOpenChange={setOpen} entity="tasks" fields={fields} initial={edit} defaults={{ status: 'Todo', priority: 'Medium', dueDate: today }} title={t('tasks')} transform={completeTx} />
  </div>;
}
