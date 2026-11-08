import { useState } from 'react';
import { CheckCircle2, TrendingDown, TrendingUp, X } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { toast } from 'sonner';
import { useStore } from '../lib/store';
import { fmtNum } from '../lib/i18n';
import { findings, scores, todayISO, Finding } from '../lib/analytics';
import { Bar, Panel, PageHeader } from '../components/ui-bits';
import { cn } from '@project/components/lib/utils';

const KEY = 'mealpha-dismissed';
export const getDismissed = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

export function FindingCard({ f, onDismiss, onAccept }: { f: Finding; onDismiss?: () => void; onAccept?: () => void }) {
  const { t, settings } = useStore();
  const fa = settings.language === 'fa';
  const sev = { high: 'border-s-destructive', medium: 'border-s-[hsl(var(--warning))]', low: 'border-s-[hsl(var(--success))]' }[f.severity];
  return (
    <div className={cn('rounded-xl border border-s-4 bg-card/70 p-4 space-y-2', sev)}>
      <div className="flex items-start gap-2">
        {f.kind === 'strength' ? <TrendingUp className="h-4 w-4 text-[hsl(var(--success))] mt-0.5" /> : <TrendingDown className="h-4 w-4 text-destructive mt-0.5" />}
        <div className="flex-1 font-semibold text-sm">{f.title}</div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{f.confidence === 'confirmed' ? (fa ? 'تأییدشده' : 'Confirmed') : (fa ? 'فرضیه' : 'Hypothesis')}</span>
      </div>
      <p className="text-xs text-muted-foreground"><b>{t('evidence')}:</b> {f.evidence}</p>
      <p className="text-xs"><b>{t('action')}:</b> {f.action}</p>
      {(onDismiss || onAccept) && (
        <div className="flex gap-2 pt-1">
          {onAccept && <Button size="sm" variant="secondary" onClick={onAccept}><CheckCircle2 className="h-3.5 w-3.5 me-1" />{t('accept')}</Button>}
          {onDismiss && <Button size="sm" variant="ghost" onClick={onDismiss}><X className="h-3.5 w-3.5 me-1" />{t('dismiss')}</Button>}
        </div>
      )}
    </div>
  );
}

export default function Insights() {
  const { data, t, settings, save } = useStore();
  const L = settings.language;
  const [dismissed, setDismissed] = useState(getDismissed);
  const sc = scores(data!, settings);
  const all = findings(data!, settings, L).filter((f) => !dismissed.includes(f.id));
  const dismiss = (id: string) => { const n = [...dismissed, id]; setDismissed(n); localStorage.setItem(KEY, JSON.stringify(n)); };
  const accept = async (f: Finding) => {
    if (await save('tasks', { title: f.action, notes: `${f.title}\n${f.evidence}`, status: 'Todo', priority: f.severity === 'high' ? 'High' : 'Medium', dueDate: todayISO() })) {
      toast.success(t('saved')); dismiss(f.id);
    }
  };
  const labels: Record<string, string> = L === 'fa'
    ? { finance: 'مدیریت مالی', goals: 'دستیابی به اهداف', tasks: 'اجرای کارها', habits: 'ثبات عادت‌ها' }
    : { finance: 'Financial management', goals: 'Goal achievement', tasks: 'Task execution', habits: 'Habit consistency' };
  const weak = all.filter((f) => f.kind === 'weakness'), strong = all.filter((f) => f.kind === 'strength');

  return (
    <div className="space-y-6">
      <PageHeader title={t('insights')} subtitle={t('scoreNote')} />
      <Panel title={t('overallScore')}>
        <div className="flex flex-col md:flex-row gap-6 md:items-center">
          <div className="text-center md:w-40">
            <div className="text-5xl font-black bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">{sc.overall == null ? '—' : fmtNum(L, sc.overall)}</div>
            <div className="text-xs text-muted-foreground mt-1">{L === 'fa' ? `پوشش داده: ${fmtNum(L, sc.coverage)} از ۴` : `Data coverage: ${sc.coverage} of 4`}</div>
          </div>
          <div className="flex-1 grid sm:grid-cols-2 gap-4">
            {Object.entries(sc.parts).map(([k, v]) => (
              <div key={k} className="space-y-1">
                <div className="flex justify-between text-sm"><span>{labels[k]}</span><span className="tabular-nums text-muted-foreground">{v == null ? t('noData') : fmtNum(L, v)}</span></div>
                <Bar value={v == null ? null : v / 100} />
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4">{L === 'fa'
          ? 'فرمول v1: میانگین برابر حوزه‌های دارای داده. مالی = ۵۰ + نرخ پس‌انداز×۱۶۶ (محدود به ۰ تا ۱۰۰)؛ اهداف = درصد اهداف در مسیر؛ کارها = نرخ تکمیل کارهای سررسید ۳۰ روز اخیر؛ عادت‌ها = میانگین نرخ ۳۰ روزه.'
          : 'Formula v1: equal-weighted mean of areas with data. Finance = 50 + savings rate×166 (clamped 0–100); Goals = % of dated goals on track; Tasks = completion of tasks due in last 30 days; Habits = mean 30-day completion.'}</p>
      </Panel>
      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title={t('weaknesses')}>
          <div className="space-y-3">{weak.length ? weak.map((f) => <FindingCard key={f.id} f={f} onDismiss={() => dismiss(f.id)} onAccept={() => accept(f)} />) : <p className="text-sm text-muted-foreground">{t('noRecs')}</p>}</div>
        </Panel>
        <Panel title={t('strengths')}>
          <div className="space-y-3">{strong.length ? strong.map((f) => <FindingCard key={f.id} f={f} onDismiss={() => dismiss(f.id)} />) : <p className="text-sm text-muted-foreground">{t('noRecs')}</p>}</div>
        </Panel>
      </div>
    </div>
  );
}
