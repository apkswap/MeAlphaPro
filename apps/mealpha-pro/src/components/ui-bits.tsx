import { ReactNode } from 'react';
import { cn } from '@project/components/lib/utils';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex min-w-0 flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="mb-1 text-[9px] font-bold uppercase tracking-[.18em] text-primary">MEALPHA PRO / WORKSPACE</div>
        <h1 className="break-words text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, children, className, action }: { title?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={cn('group min-w-0 rounded-[22px] border border-border/80 bg-card/85 p-4 shadow-[0_12px_35px_-28px_hsl(var(--foreground)/0.32)] transition-shadow duration-200 hover:shadow-[0_16px_42px_-28px_hsl(var(--primary)/0.28)] sm:p-5', className)}>
      {title && <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-2"><h2 className="break-words text-[11px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">{title}</h2>{action}</div>}
      {children}
    </section>
  );
}

export function Kpi({ label, value, hint, tone = 'default', icon }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'default' | 'good' | 'bad' | 'accent'; icon?: ReactNode }) {
  const toneCls = { default: 'text-foreground', good: 'text-[hsl(var(--success))]', bad: 'text-destructive', accent: 'text-primary' }[tone];
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-border/80 bg-background/55 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md sm:p-4">
      <div className="flex min-w-0 items-center justify-between gap-1 text-[11px] font-medium text-muted-foreground"><span className="min-w-0 break-words">{label}</span>{icon && <span className="shrink-0 text-primary">{icon}</span>}</div>
      <div className={cn('min-w-0 break-words text-xl font-black leading-tight tabular-nums sm:text-2xl', toneCls)}>{value}</div>
      {hint && <div className="min-w-0 break-words text-[10px] leading-5 text-muted-foreground">{hint}</div>}
    </div>
  );
}

const statusCls: Record<string, string> = {
  'On Track': 'bg-[hsl(var(--success)/0.13)] text-[hsl(var(--success))]',
  'At Risk': 'bg-[hsl(var(--warning)/0.14)] text-[hsl(var(--warning))]',
  Delayed: 'bg-destructive/12 text-destructive',
  Completed: 'bg-primary/12 text-primary',
  Unknown: 'bg-muted text-muted-foreground',
};
export function StatusPill({ status, label }: { status: string; label: string }) {
  return <span className={cn('whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold', statusCls[status] ?? statusCls.Unknown)}>{label}</span>;
}

export function Bar({ value }: { value: number | null }) {
  return (
    <div className="h-2 min-w-[80px] overflow-hidden rounded-full bg-muted/90">
      <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, Math.round((value ?? 0) * 100)))}%` }} />
    </div>
  );
}
