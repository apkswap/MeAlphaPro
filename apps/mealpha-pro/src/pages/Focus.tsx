import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { toast } from 'sonner';
import { useStore } from '../lib/store';
import { fmtNum } from '../lib/i18n';
import { Panel, PageHeader } from '../components/ui-bits';

type Session = { date: string; minutes: number; task?: string };
const KEY = 'mealpha-focus-sessions';
const load = (): Session[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

export default function Focus() {
  const { data, t, settings, save } = useStore();
  const L = settings.language;
  const [len, setLen] = useState(25);
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [taskId, setTaskId] = useState<string>();
  const [hist, setHist] = useState<Session[]>(load);
  const ref = useRef<number>();

  useEffect(() => { if (!running) setLeft(len * 60); }, [len]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!running) return;
    ref.current = window.setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(ref.current);
  }, [running]);
  useEffect(() => { if (left <= 0 && running) finish(); }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = async () => {
    setRunning(false);
    const minutes = len;
    const task = data!.tasks.find((x) => x.id === taskId);
    const next = [{ date: new Date().toISOString(), minutes, task: task?.title }, ...hist].slice(0, 200);
    setHist(next); localStorage.setItem(KEY, JSON.stringify(next));
    if (task) await save('tasks', { actualMinutes: (Number(task.actualMinutes) || 0) + minutes }, task.id);
    toast.success(t('sessionDone'));
    setLeft(len * 60);
    if ('Notification' in window && Notification.permission === 'granted') new Notification('MeAlpha Pro', { body: t('sessionDone') });
  };

  const start = () => { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); setRunning(true); };
  const mm = String(Math.floor(left / 60)).padStart(2, '0'), ss = String(left % 60).padStart(2, '0');
  const today = new Date().toDateString();
  const todayMin = hist.filter((h) => new Date(h.date).toDateString() === today).reduce((s, h) => s + h.minutes, 0);
  const weekMin = hist.filter((h) => Date.now() - new Date(h.date).getTime() < 7 * 86400000).reduce((s, h) => s + h.minutes, 0);
  const pct = 1 - left / (len * 60);

  return (
    <div>
      <PageHeader title={t('focus')} subtitle={`${t('today')}: ${fmtNum(L, todayMin)} ${t('minutes')} · 7d: ${fmtNum(L, weekMin)} ${t('minutes')}`} />
      <div className="grid lg:grid-cols-[1fr_340px] gap-4">
        <Panel className="flex flex-col items-center gap-6 py-10">
          <div className="relative h-64 w-64 rounded-full grid place-items-center" style={{ background: `conic-gradient(hsl(var(--primary)) ${pct * 360}deg, hsl(var(--muted)) 0)` }}>
            <div className="absolute inset-3 rounded-full bg-card grid place-items-center">
              <span className="font-mono text-6xl font-semibold tabular-nums" dir="ltr">{mm}:{ss}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {[15, 25, 50, 90].map((m) => <Button key={m} size="sm" variant={len === m ? 'default' : 'outline'} disabled={running} onClick={() => setLen(m)}>{fmtNum(L, m)}′</Button>)}
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
            <Button size="lg" variant="outline" onClick={() => { setRunning(false); setLeft(len * 60); }}><RotateCcw className="h-4 w-4" /></Button>
          </div>
        </Panel>
        <Panel title={L === 'fa' ? 'تاریخچه' : 'History'}>
          {hist.length === 0 && <p className="text-sm text-muted-foreground">{t('empty')}</p>}
          <ul className="space-y-2 max-h-[420px] overflow-y-auto">
            {hist.slice(0, 30).map((h, i) => (
              <li key={i} className="flex justify-between text-sm border-b pb-2">
                <span className="truncate">{h.task || '—'}</span>
                <span className="text-muted-foreground tabular-nums">{fmtNum(L, h.minutes)}′</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
