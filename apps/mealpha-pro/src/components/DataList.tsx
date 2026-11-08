import { ReactNode, useMemo, useState } from 'react';
import { Input } from '@project/components/ui/input';
import { Button } from '@project/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@project/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@project/components/ui/alert-dialog';
import { ArrowUpDown, Pencil, Search, Trash2 } from 'lucide-react';
import { useStore, Entity, Rec } from '../lib/store';

export type Col = { key: string; label: string; render?: (r: Rec) => ReactNode; sortValue?: (r: Rec) => string | number };

type Props = { rows: Rec[]; cols: Col[]; entity: Entity; onEdit: (r: Rec) => void; searchKeys: string[]; toolbar?: ReactNode; pageSize?: number };

export default function DataList({ rows, cols, entity, onEdit, searchKeys, toolbar, pageSize = 15 }: Props) {
  const { t, remove } = useStore();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);
  const [del, setDel] = useState<Rec | null>(null);

  const filtered = useMemo(() => {
    let r = rows.filter((x) => !q || searchKeys.some((k) => String(x[k] ?? '').toLowerCase().includes(q.toLowerCase())));
    if (sort) {
      const c = cols.find((c) => c.key === sort.key)!;
      const val = (x: Rec) => (c.sortValue ? c.sortValue(x) : x[c.key] ?? '');
      r = [...r].sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir);
    }
    return r;
  }, [rows, q, sort, cols, searchKeys]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const view = filtered.slice(page * pageSize, page * pageSize + pageSize);

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
        <Table>
          <TableHeader>
            <TableRow>
              {cols.map((c) => (
                <TableHead key={c.key} className="text-start">
                  <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setSort((s) => ({ key: c.key, dir: s?.key === c.key && s.dir === 1 ? -1 : 1 }))}>
                    {c.label}<ArrowUpDown className="h-3 w-3 opacity-50" />
                  </button>
                </TableHead>
              ))}
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.length === 0 && <TableRow><TableCell colSpan={cols.length + 1} className="text-center text-muted-foreground py-10">{t('empty')}</TableCell></TableRow>}
            {view.map((r) => (
              <TableRow key={r.id}>
                {cols.map((c) => <TableCell key={c.key}>{c.render ? c.render(r) : r[c.key] ?? '—'}</TableCell>)}
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" onClick={() => onEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setDel(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
