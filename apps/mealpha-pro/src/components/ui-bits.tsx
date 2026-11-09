import { ReactNode } from 'react';
import { cn } from '@project/components/lib/utils';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, children, className, action }: { title?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={cn('rounded-2xl border bg-card/70 backdrop-blur p-5 shadow-[0_8px_24px_-16px_hsl(152_58%_30%/0.24)]', className)}>
      {title && <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-sm tracking-wide text-muted-foreground uppercase">{title}</h2>{action}</div>}
      {children}
    </section>
  );
}

export function Kpi({ label, value, hint, tone = 'default', icon }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'default' | 'good' | 'bad' | 'accent'; icon?: ReactNode }) {
  const toneCls = { default: 'text-foreground', good: 'text-[hsl(var(--success))]', bad: 'text-destructive', accent: 'text-accent' }[tone];
  return (
    <div className="rounded-2xl border bg-card/70 p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">{label}{icon}</div>
      <div className={cn('text-2xl font-extrabold tabular-nums', toneCls)}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

const statusCls: Record<string, string> = {
  'On Track': 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]',
  'At Risk': 'bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]',
  Delayed: 'bg-destructive/15 text-destructive',
  Completed: 'bg-primary/15 text-primary',
  Unknown: 'bg-muted text-muted-foreground',
};
export function StatusPill({ status, label }: { status: string; label: string }) {
  return <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap', statusCls[status] ?? statusCls.Unknown)}>{label}</span>;
}

export function Bar({ value }: { value: number | null }) {
  return (
    <div className="h-2 rounded-full bg-muted overflow-hidden min-w-[80px]">
      <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${Math.round((value ?? 0) * 100)}%` }} />
    </div>
  );
}
