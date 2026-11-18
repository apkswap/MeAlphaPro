import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { useStore, Rec } from '../lib/store';
import { fmtDate, fmtNum, opt } from '../lib/i18n';
import { goalInfo } from '../lib/analytics';
import EntityForm, { Field } from '../components/EntityForm';
import DataList, { Col } from '../components/DataList';
import { Bar, PageHeader, StatusPill } from '../components/ui-bits';

export const statusKey = { 'On Track': 'onTrack', 'At Risk': 'atRisk', Delayed: 'delayed', Completed: 'completed', Unknown: 'noData' } as const;

export default function Goals() {
  const { data, t, settings } = useStore();
  const goals = data!.goals;
  const [edit, setEdit] = useState<Rec | null>(null);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const L = settings.language;
  const childrenById = useMemo(() => {
    const map: Record<string, Rec[]> = {};
    const ids = new Set(goals.map((goal) => goal.id));
    goals.forEach((goal) => {
      if (goal.parentGoalId && ids.has(goal.parentGoalId)) (map[goal.parentGoalId] ||= []).push(goal);
    });
    return map;
  }, [goals]);
  const blockedParents = useMemo(() => {
    const blocked = new Set<string>();
    if (!edit?.id) return blocked;
    const visit = (id: string) => (childrenById[id] || []).forEach((child) => {
      if (!blocked.has(child.id)) { blocked.add(child.id); visit(child.id); }
    });
    blocked.add(edit.id);
    visit(edit.id);
    return blocked;
  }, [edit, childrenById]);
  const fields: Field[] = [
    { key: 'title', label: 'title', type: 'text', required: true, full: true },
    { key: 'parentGoalId', label: 'parentGoal', type: 'select', options: [
      { value: 'none', label: L === 'fa' ? 'بدون هدف والد (هدف اصلی)' : 'No parent (top-level goal)' },
      ...goals.filter((goal) => !blockedParents.has(goal.id)).map((goal) => ({ value: goal.id, label: goal.title || '—' })),
    ] },
    { key: 'horizon', label: 'horizon', type: 'select', options: ['Lifetime', 'Annual', 'Quarterly', 'Monthly', 'Weekly'] },
    { key: 'priority', label: 'priority', type: 'select', options: ['Low', 'Medium', 'High'] },
    { key: 'category', label: 'category', type: 'text' },
    { key: 'trackingType', label: 'trackingType', type: 'select', options: [{ value: 'measurable', label: L === 'fa' ? 'قابل اندازه‌گیری' : 'Measurable' }, { value: 'qualitative', label: L === 'fa' ? 'یادگیری / کیفی' : 'Learning / qualitative' }] },
    { key: 'completed', label: 'completed', type: 'checkbox' },
    { key: 'startDate', label: 'startDate', type: 'date' },
    { key: 'dueDate', label: 'dueDate', type: 'date' },
    { key: 'targetValue', label: 'target', type: 'number' },
    { key: 'currentValue', label: 'current', type: 'number' },
    { key: 'description', label: 'description', type: 'textarea' },
  ];
  const progressFor = (goal: Rec, seen = new Set<string>()): number | null => {
    if (seen.has(goal.id)) return null;
    const nextSeen = new Set(seen).add(goal.id);
    const children = childrenById[goal.id] || [];
    if (!children.length) return goalInfo(goal).progress;
    const values = children.map((child) => progressFor(child, nextSeen)).filter((value): value is number => value != null);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : goalInfo(goal).progress;
  };
  const flattened = useMemo(() => {
    const ids = new Set(goals.map((goal) => goal.id));
    const roots = goals.filter((goal) => !goal.parentGoalId || !ids.has(goal.parentGoalId));
    const rows: Rec[] = [];
    const visited = new Set<string>();
    const visit = (goal: Rec, depth: number, ancestors: Set<string>) => {
      if (ancestors.has(goal.id) || visited.has(goal.id)) return;
      visited.add(goal.id);
      const children = childrenById[goal.id] || [];
      rows.push({ ...goal, _depth: depth, _hasChildren: children.length > 0, _childCount: children.length, _progress: progressFor(goal) });
      if (children.length && expanded[goal.id] !== false) {
        const next = new Set(ancestors).add(goal.id);
        children.forEach((child) => visit(child, depth + 1, next));
      }
    };
    roots.forEach((goal) => visit(goal, 0, new Set()));
    // Recover orphaned/cyclic records instead of silently dropping them.
    goals.forEach((goal) => { if (!visited.has(goal.id)) visit(goal, 0, new Set()); });
    return rows;
  }, [goals, childrenById, expanded]);
  const openForm = (record: Rec | null) => { setEdit(record); setOpen(true); };
  const saveGoal = (record: Rec) => ({ ...record, parentGoalId: record.parentGoalId === 'none' ? null : record.parentGoalId || null });
  const cols: Col[] = [
    { key: 'title', label: t('title'), render: (row) => (
      <div className="flex min-w-[190px] items-center gap-2" style={{ paddingInlineStart: (Math.min(Number(row._depth) || 0, 8) * 18) + 'px' }}>
        {row._hasChildren ? <button type="button" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label={expanded[row.id] === false ? (L === 'fa' ? 'بازکردن زیرهدف‌ها' : 'Expand subgoals') : (L === 'fa' ? 'بستن زیرهدف‌ها' : 'Collapse subgoals')} aria-expanded={expanded[row.id] !== false} onClick={() => setExpanded((current) => ({ ...current, [row.id]: current[row.id] === false }))}>{expanded[row.id] === false ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button> : <span className="w-7 shrink-0" />}
        <div className="min-w-0"><div className="font-semibold">{row.title}</div><div className="text-xs text-muted-foreground">{opt(L, row.horizon)} · {row.category || '—'}{row._hasChildren ? ' · ' + fmtNum(L, row._childCount) + ' ' + t('subGoals') : ''}</div></div>
      </div>) },
    { key: 'progress', label: t('progress'), sortValue: (row) => row._progress ?? -1, render: (row) => {
      const own = goalInfo(row); const progress = row._progress as number | null;
      return <div className="min-w-[120px] space-y-1">{progress == null ? <span className="text-xs font-semibold text-primary">{row.completed ? t('completed') : (L === 'fa' ? 'در حال یادگیری' : 'In progress')}</span> : <><Bar value={progress} /><div className="text-xs text-muted-foreground tabular-nums">{fmtNum(L, progress * 100)}% {own.expected != null && '· ' + t('estimate') + ' ' + fmtNum(L, own.expected * 100) + '%'}</div></>}</div>;
    } },
    { key: 'status', label: t('status'), sortValue: (row) => (row._progress as number | null) === 1 ? 'Completed' : goalInfo(row).status, render: (row) => { const status = row._progress === 1 ? 'Completed' : goalInfo(row).status; return <StatusPill status={status} label={t(statusKey[status])} />; } },
    { key: 'dueDate', label: t('dueDate'), render: (row) => { const predicted = goalInfo(row).predicted; return <div><div>{fmtDate(L, settings.calendar, row.dueDate)}</div>{predicted && <div className="text-xs text-muted-foreground">≈ {fmtDate(L, settings.calendar, predicted)} ({t('estimate')})</div>}</div>; } },
    { key: 'priority', label: t('priority'), render: (row) => opt(L, row.priority) },
  ];
  return <div className="space-y-3">
    <PageHeader title={t('goals')} action={<Button onClick={() => openForm(null)}><Plus className="me-1 h-4 w-4" />{t('add')}</Button>} />
    <div className="rounded-xl border bg-card/50 px-4 py-3 text-xs text-muted-foreground">{t('goalHierarchyHelp')}</div>
    <DataList rows={flattened} cols={cols} entity="goals" onEdit={openForm} searchKeys={['title', 'category', 'description']} hierarchical />
    <EntityForm open={open} onOpenChange={setOpen} entity="goals" fields={fields} initial={edit} defaults={{ horizon: 'Quarterly', priority: 'Medium', trackingType: 'measurable', parentGoalId: 'none' }} title={t('goals')} transform={saveGoal} />
  </div>;
}
