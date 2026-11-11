import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Check, Clock3, Plus, X } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { toast } from 'sonner';
import { useStore } from '../lib/store';
import { fmtNum } from '../lib/i18n';
import { Panel, PageHeader } from '../components/ui-bits';

type Session = {
  date: string;
  minutes: number;
  seconds?: number;
  task?: string;
  status?: 'completed' | 'interrupted';
};
const KEY = 'mealpha-focus-sessions';
const TIMER_KEY = 'mealpha-focus-timer';
type TimerState = { endAt: number | null; left: number; accumulatedMs: number; running: boolean; taskId?: string };
const loadTimer = (): TimerState => { try { return JSON.parse(localStorage.getItem(TIMER_KEY) || 'null') || { endAt: null, left: 1500, accumulatedMs: 0, running: false }; } catch { return { endAt: null, left: 1500, accumulatedMs: 0, running: false }; } };
const PRESETS = [15, 25, 45, 60];
const load = (): Session[] => {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};
const restoredSegmentStart = () => { const saved = loadTimer(); return saved.running && saved.endAt ? saved.endAt - saved.left * 1000 : null; };
const sessionSeconds = (session: Session) =>
  Number.isFinite(session.seconds) ? Math.max(0, Number(session.seconds)) : Math.max(0, Number(session.minutes) || 0) * 60;

export default function Focus() {
  const { data, t, settings, save } = useStore();
  const L = settings.language;
  const [minutesInput, setMinutesInput] = useState('25');
  const [secondsInput, setSecondsInput] = useState('00');
  const [left, setLeft] = useState(() => { const saved = loadTimer(); return saved.running && saved.endAt ? Math.max(0, Math.ceil((saved.endAt - Date.now()) / 1000)) : saved.left; });
  const [running, setRunning] = useState(() => { const saved = loadTimer(); return !!saved.running && !!saved.endAt; });
  const [taskId, setTaskId] = useState<string | undefined>(() => loadTimer().taskId);
  const [hist, setHist] = useState<Session[]>(load);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('25');
  const [manualSeconds, setManualSeconds] = useState('00');
  const [manualTaskId, setManualTaskId] = useState<string>('none');
  const intervalRef = useRef<number | undefined>(undefined);
  const endAtRef = useRef<number | null>(loadTimer().endAt);
  const segmentStartedAtRef = useRef<number | null>(restoredSegmentStart());
  const accumulatedMsRef = useRef(loadTimer().accumulatedMs || 0);
  const finishingRef = useRef(false);

  const configuredSeconds = Math.max(0, Math.min(999, Number.parseInt(minutesInput || '0', 10) || 0)) * 60
    + Math.max(0, Math.min(59, Number.parseInt(secondsInput || '0', 10) || 0));
  const elapsedSeconds = () => Math.max(0, Math.floor((accumulatedMsRef.current
    + (segmentStartedAtRef.current === null ? 0 : Date.now() - segmentStartedAtRef.current)) / 1000));

  useEffect(() => {
    const saved = loadTimer();
    localStorage.setItem(TIMER_KEY, JSON.stringify({ endAt: running ? endAtRef.current : null, left, accumulatedMs: accumulatedMsRef.current, running, taskId } satisfies TimerState));
  }, [left, running, taskId]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil(((endAtRef.current || Date.now()) - Date.now()) / 1000));
      setLeft(remaining);
    }, 250);
    return () => {
      if (intervalRef.current !== undefined) window.clearInterval(intervalRef.current);
    };
  }, [running]);

  const persistSession = async (seconds: number, status: 'completed' | 'interrupted') => {
    if (seconds <= 0) return;
    const task = data!.tasks.find((item) => item.id === taskId);
    const session: Session = {
      date: new Date().toISOString(),
      seconds,
      minutes: Math.round((seconds / 60) * 100) / 100,
      task: task?.title,
      status
    };
    const next = [session, ...hist].slice(0, 500);
    setHist(next);
    localStorage.setItem(KEY, JSON.stringify(next));
    if (task) {
      const previous = Number(task.actualMinutes) || 0;
      await save('tasks', { actualMinutes: Math.round((previous + seconds / 60) * 100) / 100 }, task.id);
    }
  };

  const finish = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    const actual = elapsedSeconds();
    setRunning(false);
    endAtRef.current = null;
    segmentStartedAtRef.current = null;
    accumulatedMsRef.current = 0;
    await persistSession(actual, 'completed');
    toast.success(t('sessionDone'));
    localStorage.removeItem(TIMER_KEY);
    setLeft(configuredSeconds || 1);
    finishingRef.current = false;
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('MeAlpha Pro', { body: t('sessionDone'), tag: 'mealpha-focus-finished' });
    }
    try { const AudioCtx = window.AudioContext || (window as any).webkitAudioContext; if (AudioCtx) { const ctx = new AudioCtx(); const oscillator = ctx.createOscillator(); const gain = ctx.createGain(); oscillator.connect(gain); gain.connect(ctx.destination); oscillator.frequency.value = 880; gain.gain.setValueAtTime(0.0001, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.03); gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55); oscillator.start(); oscillator.stop(ctx.currentTime + 0.6); oscillator.onended = () => void ctx.close(); } } catch (error) { console.warn('Focus alarm audio unavailable', error); }
  };

  useEffect(() => {
    if (left === 0 && running) void finish();
  }, [left, running]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    const duration = running ? left : (accumulatedMsRef.current > 0 ? left : configuredSeconds);
    if (duration <= 0) {
      toast.error(L === 'fa' ? 'یک زمان معتبر وارد کن.' : 'Enter a valid duration.');
      return;
    }
    if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission();
    const now = Date.now();
    segmentStartedAtRef.current = now;
    endAtRef.current = now + duration * 1000;
    localStorage.setItem(TIMER_KEY, JSON.stringify({ endAt: endAtRef.current, left: duration, accumulatedMs: accumulatedMsRef.current, running: true, taskId } satisfies TimerState));
    setLeft(duration);
    setRunning(true);
  };

  const pause = () => {
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil(((endAtRef.current || now) - now) / 1000));
    if (segmentStartedAtRef.current !== null) {
      accumulatedMsRef.current += now - segmentStartedAtRef.current;
    }
    segmentStartedAtRef.current = null;
    endAtRef.current = null;
    localStorage.setItem(TIMER_KEY, JSON.stringify({ endAt: null, left: remaining, accumulatedMs: accumulatedMsRef.current, running: false, taskId } satisfies TimerState));
    setLeft(remaining);
    setRunning(false);
  };

  const reset = async () => {
    const actual = elapsedSeconds();
    setRunning(false);
    endAtRef.current = null;
    segmentStartedAtRef.current = null;
    accumulatedMsRef.current = 0;
    if (actual >= 60) {
      await persistSession(actual, 'interrupted');
      toast.message(L === 'fa' ? 'زمان تمرکز ثبت شد.' : 'Focus time saved.');
    }
    setLeft(configuredSeconds);
  };

  const addManualSession = async () => {
    const minutes = Math.max(0, Math.min(999, Number.parseInt(manualMinutes || '0', 10) || 0));
    const seconds = Math.max(0, Math.min(59, Number.parseInt(manualSeconds || '0', 10) || 0));
    const totalSeconds = minutes * 60 + seconds;
    if (totalSeconds <= 0) {
      toast.error(L === 'fa' ? 'مدت جلسه باید بیشتر از صفر باشد.' : 'Session duration must be greater than zero.');
      return;
    }
    const task = manualTaskId === 'none' ? undefined : data!.tasks.find((item) => item.id === manualTaskId);
    const session: Session = {
      date: new Date().toISOString(),
      seconds: totalSeconds,
      minutes: Math.round((totalSeconds / 60) * 100) / 100,
      task: task?.title,
      status: 'completed'
    };
    const next = [session, ...hist].slice(0, 500);
    setHist(next);
    localStorage.setItem(KEY, JSON.stringify(next));
    if (task) {
      const previous = Number(task.actualMinutes) || 0;
      await save('tasks', { actualMinutes: Math.round((previous + totalSeconds / 60) * 100) / 100 }, task.id);
    }
    setManualOpen(false);
    setManualMinutes('25');
    setManualSeconds('00');
    setManualTaskId('none');
    toast.success(L === 'fa' ? 'جلسه به تاریخچه تمرکز اضافه شد.' : 'Session added to focus history.');
  };

  const changeDuration = (minutes: string, seconds: string) => {
    setMinutesInput(minutes);
    setSecondsInput(seconds);
    const total = Math.max(0, Math.min(999, Number.parseInt(minutes || '0', 10) || 0)) * 60
      + Math.max(0, Math.min(59, Number.parseInt(seconds || '0', 10) || 0));
    setLeft(total);
    accumulatedMsRef.current = 0;
    segmentStartedAtRef.current = null;
    endAtRef.current = null;
  };

  const choosePreset = (minutes: number) => changeDuration(String(minutes), '00');
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const today = new Date().toDateString();
  const todaySeconds = hist.filter((item) => new Date(item.date).toDateString() === today)
    .reduce((sum, item) => sum + sessionSeconds(item), 0);
  const weekSeconds = hist.filter((item) => {
    const age = Date.now() - new Date(item.date).getTime();
    return age >= 0 && age < 7 * 86400000;
  }).reduce((sum, item) => sum + sessionSeconds(item), 0);
  const totalSeconds = hist.reduce((sum, item) => sum + sessionSeconds(item), 0);
  const pct = configuredSeconds > 0 ? Math.min(1, Math.max(0, 1 - left / configuredSeconds)) : 0;
  const formatDuration = (total: number) => {
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return secs ? (L === 'fa' ? `${fmtNum(L, mins)} دقیقه و ${fmtNum(L, secs)} ثانیه` : `${mins}m ${secs}s`)
      : `${fmtNum(L, mins)} ${t('minutes')}`;
  };

  return (
    <div className="space-y-5">
      <PageHeader title={t('focus')} subtitle={`${t('today')}: ${formatDuration(todaySeconds)} · 7d: ${formatDuration(weekSeconds)}`} />
      <div className="grid lg:grid-cols-[1fr_340px] gap-4">
        <Panel className="flex flex-col items-center gap-6 py-10">
          <div className="relative h-64 w-64 rounded-full grid place-items-center" style={{ background: `conic-gradient(hsl(var(--primary)) ${pct * 360}deg, hsl(var(--muted)) 0)` }}>
            <div className="absolute inset-3 rounded-full bg-card grid place-items-center">
              <span className="font-mono text-6xl font-semibold tabular-nums" dir="ltr">{mm}:{ss}</span>
              <span className="text-xs text-muted-foreground -mt-14">{running ? (L === 'fa' ? 'در حال تمرکز' : 'Focusing') : (L === 'fa' ? 'زمان باقی‌مانده' : 'Time remaining')}</span>
            </div>
          </div>

          <div className="w-full max-w-sm space-y-3">
            <div className="text-center text-sm font-medium">{L === 'fa' ? 'مدت دلخواه تمرکز' : 'Custom focus duration'}</div>
            <div className="flex items-center justify-center gap-3" dir="ltr">
              <label className="space-y-1 text-center">
                <span className="block text-xs text-muted-foreground">{L === 'fa' ? 'دقیقه' : 'Minutes'}</span>
                <input
                  aria-label={L === 'fa' ? 'دقیقه' : 'Minutes'}
                  type="number" min="0" max="999" step="1" inputMode="numeric"
                  value={minutesInput} disabled={running}
                  onChange={(event) => changeDuration(event.target.value, secondsInput)}
                  className="h-11 w-24 rounded-lg border bg-background px-3 text-center text-lg tabular-nums outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <span className="pt-5 text-2xl text-muted-foreground">:</span>
              <label className="space-y-1 text-center">
                <span className="block text-xs text-muted-foreground">{L === 'fa' ? 'ثانیه' : 'Seconds'}</span>
                <input
                  aria-label={L === 'fa' ? 'ثانیه' : 'Seconds'}
                  type="number" min="0" max="59" step="1" inputMode="numeric"
                  value={secondsInput} disabled={running}
                  onChange={(event) => changeDuration(minutesInput, event.target.value)}
                  className="h-11 w-24 rounded-lg border bg-background px-3 text-center text-lg tabular-nums outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {PRESETS.map((minutes) => (
                <Button key={minutes} size="sm" variant={configuredSeconds === minutes * 60 ? 'default' : 'outline'} disabled={running} onClick={() => choosePreset(minutes)}>
                  {fmtNum(L, minutes)}′
                </Button>
              ))}
            </div>
          </div>

          <div className="w-full max-w-xs">
            <Select value={taskId} onValueChange={setTaskId} disabled={running}>
              <SelectTrigger><SelectValue placeholder={t('linkTask')} /></SelectTrigger>
              <SelectContent>{data!.tasks.filter((item) => item.status !== 'Done').map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            {running
              ? <Button size="lg" variant="secondary" onClick={pause}><Pause className="h-4 w-4 me-2" />{t('pause')}</Button>
              : <Button size="lg" onClick={start}><Play className="h-4 w-4 me-2" />{accumulatedMsRef.current > 0 ? (L === 'fa' ? 'ادامه' : 'Resume') : t('start')}</Button>}
            <Button size="lg" variant="outline" onClick={() => void reset()}><RotateCcw className="h-4 w-4 me-2" />{L === 'fa' ? 'شروع مجدد' : 'Reset'}</Button>
          </div>
          <p className="text-xs text-muted-foreground">{L === 'fa'
            ? 'زمان واقعی تمرکز ثبت می‌شود؛ حتی اگر جلسه را زودتر متوقف کنی.'
            : 'Actual focused time is recorded, even when you stop a session early.'}</p>
        </Panel>

        <Panel title={L === 'fa' ? 'گزارش تمرکز' : 'Focus report'}>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-xl bg-muted/60 p-3">
              <Clock3 className="h-4 w-4 text-primary mb-2" />
              <div className="text-lg font-bold tabular-nums">{formatDuration(todaySeconds)}</div>
              <div className="text-xs text-muted-foreground">{L === 'fa' ? 'امروز' : 'Today'}</div>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <Check className="h-4 w-4 text-primary mb-2" />
              <div className="text-lg font-bold tabular-nums">{fmtNum(L, hist.length)}</div>
              <div className="text-xs text-muted-foreground">{L === 'fa' ? 'جلسات ثبت‌شده' : 'Sessions'}</div>
            </div>
          </div>
          <div className="mb-4 text-sm">
            <div className="flex justify-between mb-1"><span>{L === 'fa' ? 'مجموع تمرکز' : 'Total focus time'}</span><span className="font-semibold">{formatDuration(totalSeconds)}</span></div>
            <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${totalSeconds ? Math.min(100, todaySeconds / Math.max(todaySeconds, weekSeconds) * 100) : 0}%` }} /></div>
          </div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="text-sm font-semibold">{L === 'fa' ? 'تاریخچه جلسات' : 'Session history'}</div>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setManualOpen((value) => !value)}>
              {manualOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {manualOpen ? (L === 'fa' ? 'بستن' : 'Close') : (L === 'fa' ? 'افزودن جلسه' : 'Add session')}
            </Button>
          </div>
          {manualOpen && (
            <div className="mb-4 rounded-xl border border-primary/20 bg-primary/[0.04] p-3 space-y-3">
              <div className="text-xs font-medium text-muted-foreground">{L === 'fa' ? 'ثبت دستی جلسه تمرکز' : 'Manually log a focus session'}</div>
              <div className="flex items-end gap-2" dir="ltr">
                <label className="flex-1 space-y-1">
                  <span className="block text-[11px] text-muted-foreground">{L === 'fa' ? 'دقیقه' : 'Minutes'}</span>
                  <input aria-label={L === 'fa' ? 'دقیقه جلسه' : 'Session minutes'} type="number" min="0" max="999" value={manualMinutes} onChange={(event) => setManualMinutes(event.target.value)} className="h-9 w-full rounded-lg border bg-background px-2 text-center text-sm tabular-nums" />
                </label>
                <span className="pb-2 text-muted-foreground">:</span>
                <label className="flex-1 space-y-1">
                  <span className="block text-[11px] text-muted-foreground">{L === 'fa' ? 'ثانیه' : 'Seconds'}</span>
                  <input aria-label={L === 'fa' ? 'ثانیه جلسه' : 'Session seconds'} type="number" min="0" max="59" value={manualSeconds} onChange={(event) => setManualSeconds(event.target.value)} className="h-9 w-full rounded-lg border bg-background px-2 text-center text-sm tabular-nums" />
                </label>
              </div>
              <Select value={manualTaskId} onValueChange={setManualTaskId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder={t('linkTask')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{L === 'fa' ? 'بدون اتصال به تسک' : 'No linked task'}</SelectItem>
                  {data!.tasks.map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" className="w-full" onClick={() => void addManualSession()}>
                <Plus className="h-3.5 w-3.5 me-1.5" />{L === 'fa' ? 'ثبت جلسه' : 'Save session'}
              </Button>
            </div>
          )}
          {hist.length === 0 && <p className="text-sm text-muted-foreground">{t('empty')}</p>}
          <ul className="space-y-2 max-h-[330px] overflow-y-auto">
            {hist.slice(0, 40).map((item, index) => (
              <li key={`${item.date}-${index}`} className="flex justify-between gap-2 text-sm border-b pb-2">
                <span className="min-w-0 truncate">
                  {item.task || '—'}
                  <span className="block text-[10px] text-muted-foreground">{new Date(item.date).toLocaleDateString(L === 'fa' ? 'fa-IR' : undefined)} · {item.status === 'interrupted' ? (L === 'fa' ? 'ناتمام' : 'Interrupted') : (L === 'fa' ? 'تکمیل‌شده' : 'Completed')}</span>
                </span>
                <span className="shrink-0 text-muted-foreground tabular-nums">{formatDuration(sessionSeconds(item))}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
