import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Textarea } from '@project/components/ui/textarea';
import { Label } from '@project/components/ui/label';
import { Switch } from '@project/components/ui/switch';
import { DatePicker } from '@project/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, Entity, Rec } from '../lib/store';
import { Key, opt } from '../lib/i18n';
import { isoOf, makeConverter } from '../lib/analytics';
import { fmtMoney } from '../lib/i18n';

export type Field = {
  key: string; label: Key; type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'checklist' | 'conversion';
  options?: (string | { value: string; label: string })[]; required?: boolean; full?: boolean; help?: string;
  onChange?: (value: unknown, current: Rec) => Partial<Rec>; visibleWhen?: (current: Rec) => boolean;
  conversionAmountKey?: string; conversionCurrencyKey?: string;
};

type Props = { open: boolean; onOpenChange: (o: boolean) => void; entity: Entity; fields: Field[]; initial?: Rec | null; defaults?: Rec; title: string; transform?: (r: Rec, prev?: Rec | null) => Rec };

export default function EntityForm({ open, onOpenChange, entity, fields, initial, defaults, title, transform }: Props) {
  const { t, save, settings } = useStore();
  const [v, setV] = useState<Rec>({});
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const { factorToBase } = makeConverter(settings);

  const defaultsKey = JSON.stringify(defaults ?? {});
  useEffect(() => { if (open) { setV({ ...defaults, ...(initial ?? {}) }); setErr({}); } }, [open, initial, defaultsKey]);

  const set = (k: string, val: unknown) => setV((p) => {
    const field = fields.find((item) => item.key === k);
    return { ...p, [k]: val, ...(field?.onChange?.(val, p) ?? {}) };
  });

  const visibleFields = fields.filter((field) => !field.visibleWhen || field.visibleWhen(v));

  const submit = async () => {
    const e: Record<string, string> = {};
    visibleFields.filter((f) => f.type !== 'conversion').forEach((f) => {
      const val = v[f.key];
      if (f.required && (val == null || val === '')) e[f.key] = '*';
      if (f.type === 'number' && val !== '' && val != null && isNaN(Number(val))) e[f.key] = '#';
    });
    setErr(e);
    if (Object.keys(e).length) return;
    const rec: Rec = { ...(initial ?? {}) };
    visibleFields.filter((f) => f.type !== 'conversion').forEach((f) => {
      const val = v[f.key];
      rec[f.key] = f.type === 'number' ? (val === '' || val == null ? null : Number(val)) : f.type === 'checkbox' ? !!val : f.type === 'checklist' ? (Array.isArray(val) ? val : []) : val ?? null;
    });
    setBusy(true);
    const ok = await save(entity, transform ? transform(rec, initial) : rec, initial?.id);
    setBusy(false);
    if (ok) { toast.success(t('saved')); onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl" dir={settings.language === 'fa' ? 'rtl' : 'ltr'}>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto p-1">
          {visibleFields.map((f) => (
            <div key={f.key} className={f.full || f.type === 'textarea' ? 'sm:col-span-2 space-y-1.5' : 'space-y-1.5'}>
              <Label className="text-xs text-muted-foreground">{t(f.label)}{f.required && ' *'}</Label>
              {f.type === 'conversion' ? (() => {
                const amount = Number(v[f.conversionAmountKey || 'amount']);
                const currency = String(v[f.conversionCurrencyKey || 'currency'] || settings.currency).trim().toUpperCase();
                const rate = factorToBase(currency);
                return <div className="rounded-xl border bg-muted/40 px-3 py-2 text-xs leading-6">
                  {rate == null
                    ? <span className="text-[hsl(var(--warning))]">{settings.language === 'fa' ? 'نرخ تبدیل ' + currency + ' به ' + settings.currency + ' در تنظیمات ثبت نشده است.' : 'No exchange rate from ' + currency + ' to ' + settings.currency + ' is configured.'}</span>
                    : <><div className="font-semibold tabular-nums">{Number.isFinite(amount) ? fmtMoney(settings.language, amount * rate, settings.currency) : '—'}</div><div className="text-muted-foreground tabular-nums">1 {currency} = {new Intl.NumberFormat(settings.language === 'fa' ? 'fa-IR' : 'en-US', { maximumFractionDigits: 8 }).format(rate)} {settings.currency}</div></>}
                </div>;
              })() : <FieldInput f={f} value={v[f.key]} onChange={(x) => set(f.key, x)}
                lang={settings.language} calendar={settings.calendar} />}
              {f.help && <p className="text-xs leading-5 text-muted-foreground">{f.help}</p>}
              {err[f.key] && <p className="text-xs text-destructive">{settings.language === 'fa' ? (err[f.key] === '#' ? 'عدد معتبر وارد کنید' : 'الزامی است') : (err[f.key] === '#' ? 'Enter a valid number' : 'Required')}</p>}
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
          <Button onClick={submit} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin me-2" />}{t('save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldInput({ f, value, onChange, lang, calendar }: {
  f: Field; value: any; onChange: (v: any) => void; lang: 'fa' | 'en'; calendar: string;
}) {
  if (f.type === 'checklist') {
    const items = Array.isArray(value) ? value : [];
    const update = (index: number, patch: Record<string, unknown>) =>
      onChange(items.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, ...patch } : item));
    return <div className="space-y-2">
      {items.map((item: any, index: number) => (
        <div key={item.id || index} className="flex items-center gap-2 rounded-xl border bg-background/60 p-2">
          <input type="checkbox" checked={!!item.done} onChange={(event) => update(index, { done: event.target.checked })} className="h-4 w-4 shrink-0 accent-primary" aria-label={lang === 'fa' ? 'انجام شد' : 'Completed'} />
          <Input value={item.text ?? ''} onChange={(event) => update(index, { text: event.target.value })} placeholder={lang === 'fa' ? 'موردی که باید انجام شود' : 'Checklist item'} className="min-w-0 flex-1" />
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(items.filter((_: any, itemIndex: number) => itemIndex !== index))} aria-label={lang === 'fa' ? 'حذف مورد' : 'Remove item'}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'item-' + Date.now() + '-' + items.length, text: '', done: false }])}>
        <Plus className="me-1 h-4 w-4" />{lang === 'fa' ? 'افزودن مورد به چک‌لیست' : 'Add checklist item'}
      </Button>
    </div>;
  }
  if (f.type === 'textarea') return <Textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} rows={3} />;
  if (f.type === 'checkbox') return <div className="pt-1"><Switch checked={!!value} onCheckedChange={onChange} /></div>;
  if (f.type === 'date')
    return <DatePicker value={value ? new Date(value + 'T12:00:00') : undefined}
      onChange={(d) => onChange(d ? isoOf(d) : null)}
      calendar={calendar === 'jalali' ? 'jalali' : 'gregorian'} lang={lang} />;
  if (f.type === 'select')
    return (
      <Select value={value ?? undefined} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>
          {f.options!.map((o) => typeof o === 'string'
            ? <SelectItem key={o} value={o}>{opt(lang, o)}</SelectItem>
            : <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  return <Input type={f.type === 'number' ? 'number' : 'text'} step="any" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
}
