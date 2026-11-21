import { ReactNode, useMemo, useState } from 'react';
import { DndContext, DragEndEvent, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@project/components/ui/input';
import { Button } from '@project/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@project/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@project/components/ui/alert-dialog';
import { ArrowUpDown, GripVertical, Pencil, Search, Trash2 } from 'lucide-react';
import { useStore, Entity, Rec } from '../lib/store';

export type Col = { key: string; label: string; render?: (r: Rec) => ReactNode; sortValue?: (r: Rec) => string | number };

type Props = { rows: Rec[]; cols: Col[]; entity: Entity; onEdit: (r: Rec) => void; onReorder?: (activeId: string, overId: string) => void | Promise<void>; searchKeys: string[]; toolbar?: ReactNode; pageSize?: number; hierarchical?: boolean };

function SortableDataRow({ row, cols, onEdit, onDelete, hierarchical, draggable }: { row: Rec; cols: Col[]; onEdit: (row: Rec) => void; onDelete: (row: Rec) => void; hierarchical: boolean; draggable: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id, disabled: !draggable });
  return (
    <TableRow ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.55 : 1 }} className={isDragging ? 'relative z-10 bg-primary/5' : undefined}>
      {cols.map((column, index) => <TableCell key={column.key}>
        {index === 0 && hierarchical && draggable && <button type="button" {...attributes} {...listeners} className="me-2 inline-flex h-7 w-6 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:bg-secondary active:cursor-grabbing" title="Drag to reorder subgoal" aria-label="Drag to reorder subgoal"><GripVertical className="h-4 w-4" /></button>}
        {column.render ? column.render(row) : row[column.key] ?? '—'}
      </TableCell>)}
      <TableCell><div className="flex gap-1 justify-end">
        <Button size="icon" variant="ghost" onClick={() => onEdit(row)}><Pencil className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" onClick={() => onDelete(row)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div></TableCell>
    </TableRow>
  );
}

export default function DataList({ rows, cols, entity, onEdit, onReorder, searchKeys, toolbar, pageSize = 15, hierarchical = false }: Props) {
  const { t, remove } = useStore();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);
  const [del, setDel] = useState<Rec | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && onReorder) void onReorder(String(active.id), String(over.id));
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLocaleLowerCase();
    if (hierarchical) {
      if (!query) return rows;
      // Keep matching nodes and their visible ancestors so search never detaches a child.
      const keep = new Set<string>();
      const ancestors: Rec[] = [];
      rows.forEach((row) => {
        const depth = Math.max(0, Number(row._depth) || 0);
        ancestors.length = depth;
        ancestors[depth] = row;
        const matches = searchKeys.some((key) => String(row[key] ?? '').toLocaleLowerCase().includes(query));
        if (matches) {
          keep.add(row.id);
          ancestors.slice(0, depth).forEach((parent) => parent && keep.add(parent.id));
        }
      });
      return rows.filter((row) => keep.has(row.id));
    }

    let result = rows.filter((row) => !query || searchKeys.some((key) => String(row[key] ?? '').toLocaleLowerCase().includes(query)));
    if (sort) {
      const column = cols.find((item) => item.key === sort.key);
      if (column) {
        const value = (row: Rec) => (column.sortValue ? column.sortValue(row) : row[column.key] ?? '');
        result = [...result].sort((a, b) => (value(a) > value(b) ? 1 : value(a) < value(b) ? -1 : 0) * sort.dir);
      }
    }
    return result;
  }, [rows, q, sort, cols, searchKeys, hierarchical]);

  const pages = hierarchical ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
  const view = hierarchical ? filtered : filtered.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="ps-9" placeholder={t('search')} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        </div>
        {toolbar}
      </div>
      <div className="rounded-xl border bg-card/60 overflow-x-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={view.map((row) => row.id)} strategy={verticalListSortingStrategy}>
        <Table>
          <TableHeader>
            <TableRow>
              {cols.map((c) => (
                <TableHead key={c.key} className="text-start">
                  <button disabled={hierarchical} className="inline-flex items-center gap-1 hover:text-foreground disabled:cursor-default" onClick={() => setSort((s) => ({ key: c.key, dir: s?.key === c.key && s.dir === 1 ? -1 : 1 }))}>
                    {c.label}{!hierarchical && <ArrowUpDown className="h-3 w-3 opacity-50" />}
                  </button>
                </TableHead>
              ))}
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.length === 0 && <TableRow><TableCell colSpan={cols.length + 1} className="text-center text-muted-foreground py-10">{t('empty')}</TableCell></TableRow>}
            {view.map((r) => (
              <SortableDataRow key={r.id} row={r} cols={cols} onEdit={onEdit} onDelete={setDel} hierarchical={hierarchical} draggable={Boolean(hierarchical && onReorder && r.parentGoalId)} />
            ))}
          </TableBody>
        </Table>
        </SortableContext>
        </DndContext>
      </div>
      {pages > 1 && (
        <div className="flex justify-center gap-2 items-center text-sm">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>‹</Button>
          <span className="text-muted-foreground">{page + 1} / {pages}</span>
          <Button size="sm" variant="outline" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>›</Button>
        </div>
      )}
      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmDeleteDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => del && remove(entity, del.id)}>{t('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
