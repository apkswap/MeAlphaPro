import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { toast } from 'sonner';
import { useStore } from '../lib/store';
import { fmtNum } from '../lib/i18n';
import { Panel, PageHeader } from '../components/ui-bits';

type Session = { date: string; minutes: number; seconds?: number; task?: string };
const KEY = 'mealpha-focus-sessions';
const load = (): Session[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

export default function Focus() {
  const { data, t, settings, save } = useStore();
  const L = settings.language;
  const [len, setLen] = useState(25);
  const [extraSeconds, setExtraSeconds] = useState(0);
  const duration = len * 60 + extraSeconds;
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [taskId, setTaskId] = useState<string>();
  const [hist, setHist] = useState<Session[]>(load);
  const ref = useRef<number>();

  useEffect(() => {
    if (!running) setLeft(duration);
  }, [duration]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!running) return;
    ref.current = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => { if (ref.current !== undefined) clearInterval(ref.current); };
  }, [running]);

  useEffect(() => { if (left <= 0 && running) void finish(); }, [left, running]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = async () => {
    setRunning(false);
    const actualSeconds = duration;
    const minutes = Math.ceil(actualSeconds / 60);
    const task = data!.tasks.find((x) => x.id === taskId);
    const next = [{ date: new Date().toISOString(), minutes, seconds: actualSeconds, task: task?.title }, ...hist].slice(0, 200);
    setHist(next);
    localStorage.setItem(KEY, JSON.stringify(next));
    if (task) await save('tasks', { actualMinutes: (Number(task.actualMinutes) || 0) + minutes }, task.id);
    toast.success(t('sessionDone'));
    setLeft(duration);
    if ('Notification' in window && Notification.permission === 'granted') new Notification('MeAlpha Pro', { body: t('sessionDone') });
  };

  const start = () => {
    if (duration <= 0) { toast.error(L === 'fa' ? 'مدت زمان معتبر وارد کنید' : 'Enter a valid duration'); return; }
    if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission();
    setRunning(true);
  };
  const setPreset = (minutes: number) => { setLen(minutes); setExtraSeconds(0); };
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const today = new Date().toDateString();
  const todayMin = hist.filter((h) => new Date(h.date).toDateString() === today).reduce((s, h) => s + (h.seconds !== undefined ? h.seconds : h.minutes * 60), 0) / 60;
  const weekMin = hist.filter((h) => Date.now() - new Date(h.date).getTime() < 7 * 86400000).reduce((s, h) => s + (h.seconds !== undefined ? h.seconds : h.minutes * 60), 0) / 60;
  const pct = duration > 0 ? 1 - left / duration : 0;

  return (
    <div>
      <PageHeader title={t('focus')} subtitle={`${t('today')}: ${fmtNum(L, Math.round(todayMin))} ${t('minutes')} · 7d: ${fmtNum(L, Math.round(weekMin))} ${t('minutes')}`} />
      <div className="grid lg:grid-cols-[1fr_340px] gap-4">
        <Panel className="flex flex-col items-center gap-6 py-10">
          <div className="relative h-64 w-64 rounded-full grid place-items-center" style={{ background: `conic-gradient(hsl(var(--primary)) ${pct * 360}deg, hsl(var(--muted)) 0)` }}>
            <div className="absolute inset-3 rounded-full bg-card grid place-items-center">
              <span className="font-mono text-6xl font-semibold tabular-nums" dir="ltr">{mm}:{ss}</span>
            </div>
          </div>
          <div className="w-full max-w-sm space-y-2">
            <p className="text-sm font-medium text-center">{L === 'fa' ? 'مدت تمرکز دلخواه' : 'Custom focus duration'}</p>
            <div className="grid grid-cols-2 gap-3" dir="ltr">
              <label className="space-y-1 text-center">
                <span className="block text-xs text-muted-foreground">{L === 'fa' ? 'دقیقه' : 'Minutes'}</span>
                <input aria-label={L === 'fa' ? 'دقیقه' : 'Minutes'} type="number" min="0" max="999" step="1" inputMode="numeric" disabled={running} value={len} onChange={(e) => setLen(Math.min(999, Math.max(0, Number.parseInt(e.target.value, 10) || 0)))} className="h-11 w-full rounded-md border border-input bg-background px-3 text-center text-lg tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" />
              </label>
              <label className="space-y-1 text-center">
                <span className="block text-xs text-muted-foreground">{L === 'fa' ? 'ثانیه' : 'Seconds'}</span>
                <input aria-label={L === 'fa' ? 'ثانیه' : 'Seconds'} type="number" min="0" max="59" step="1" inputMode="numeric" disabled={running} value={extraSeconds} onChange={(e) => setExtraSeconds(Math.min(59, Math.max(0, Number.parseInt(e.target.value, 10) || 0)))} className="h-11 w-full rounded-md border border-input bg-background px-3 text-center text-lg tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" />
              </label>
            </div>
            <p className="text-xs text-muted-foreground text-center">{L === 'fa' ? 'زمان را آزادانه تنظیم کن؛ گزینه‌های زیر فقط میانبر هستند.' : 'Set any duration you like. Presets below are optional shortcuts.'}</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {[15, 25, 50, 90].map((m) => <Button key={m} size="sm" variant={len === m && extraSeconds === 0 ? 'default' : 'outline'} disabled={running} onClick={() => setPreset(m)}>{fmtNum(L, m)}′</Button>)}
          </div>
          <div className="w-full max-w-xs">
            <Select value={taskId} onValueChange={setTaskId} disabled={running}>
              <SelectTrigger><SelectValue placeholder={t('linkTask')} /></SelectTrigger>
              <SelectContent>{data!.tasks.filter((x) => x.status !== 'Done').map((x) => <SelectItem key={x.id} value={x.id}>{x.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            {running ? <Button size="lg" variant="secondary" onClick={() => setRunning(false)}><Pause className="h-4 w-4 me-2" />{t('pause')}</Button>
              : <Button size="lg" onClick={start}><Play className="h-4 w-4 me-2" />{t('start')}</Button>}
            <Button size="lg" variant="outline" onClick={() => { setRunning(false); setLeft(duration); }}><RotateCcw className="h-4 w-4" /></Button>
          </div>
        </Panel>
        <Panel title={L === 'fa' ? 'تاریخچه' : 'History'}>
          {hist.length === 0 && <p className="text-sm text-muted-foreground">{t('empty')}</p>}
          <ul className="space-y-2 max-h-[420px] overflow-y-auto">
            {hist.slice(0, 30).map((h, i) => (
              <li key={i} className="flex justify-between text-sm border-b pb-2">
                <span className="truncate">{h.task || '—'}</span>
                <span className="text-muted-foreground tabular-nums">{fmtNum(L, h.seconds !== undefined ? h.seconds / 60 : h.minutes, 2)}′</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
