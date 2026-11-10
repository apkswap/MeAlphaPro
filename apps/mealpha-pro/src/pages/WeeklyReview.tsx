import { useMemo, useState } from 'react';
import { Bar as RBar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BrainCircuit, CheckCircle2, Target, Download } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { useStore } from '../lib/store';
import { fmtMoney, fmtNum, fmtDate } from '../lib/i18n';
import { makeConverter } from '../lib/analytics';
import { Kpi, Panel, PageHeader } from '../components/ui-bits';
import { toast } from 'sonner';
type Session={date:string;seconds?:number;minutes?:number};
type Saved={id:string;from:string;to:string;score:number|null;tasks:number|null;habits:number|null;focus:number};
const DAY=86400000, FOCUS_KEY='mealpha-focus-sessions', HISTORY_KEY='mealpha-weekly-review-history-v1';
const iso=(d:Date)=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const readFocus=():Session[]=>{try{const x=JSON.parse(localStorage.getItem(FOCUS_KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
const readHistory=():Saved[]=>{try{const x=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
const seconds=(s:Session)=>Number.isFinite(s.seconds)?Math.max(0,Number(s.seconds)):Math.max(0,Number(s.minutes)||0)*60;
export default function WeeklyReview(){
 const {data,settings,save}=useStore(), fa=settings.language==='fa';
 const [history,setHistory]=useState<Saved[]>(readHistory);
 const focus=useMemo(readFocus,[]), today=new Date(), end=new Date(today.getFullYear(),today.getMonth(),today.getDate()), start=new Date(end.getTime()-6*DAY), prev=new Date(start.getTime()-7*DAY);
 const from=iso(start),to=iso(end),prevFrom=iso(prev), inside=(v:string,a:string,b:string)=>!!v&&v>=a&&v<=b;
 const r=useMemo(()=>{
  const due=data!.tasks.filter(x=>inside(String(x.dueDate||''),from,to));
  const completed=data!.tasks.filter(x=>x.status==='Done'&&inside(String(x.completedAt||'' ).slice(0,10),from,to));
  const oldDue=data!.tasks.filter(x=>inside(String(x.dueDate||''),prevFrom,from));
  const oldDone=data!.tasks.filter(x=>x.status==='Done'&&inside(String(x.completedAt||'').slice(0,10),prevFrom,from));
  const taskRate=due.length?completed.length/due.length:null, oldTask=oldDue.length?oldDone.length/oldDue.length:null;
  const logs=data!.habitLogs.filter(x=>inside(String(x.date||''),from,to));
  const habits=data!.habits.filter(x=>!x.archived), expected=habits.reduce((n,h)=>n+(h.frequency==='Weekly'?Math.max(1,Number(h.targetPerPeriod)||1):7),0);
  const habitRate=expected?Math.min(1,logs.length/expected):null;
  const sessions=focus.filter(s=>inside(iso(new Date(s.date)),from,to)), oldSessions=focus.filter(s=>inside(iso(new Date(s.date)),prevFrom,from));
  const focusSec=sessions.reduce((n,s)=>n+seconds(s),0),oldSec=oldSessions.reduce((n,s)=>n+seconds(s),0);
  const conv=makeConverter(settings).conv, tx=data!.transactions.filter(x=>inside(String(x.date||''),from,to));
  const income=tx.filter(x=>x.kind==='Income').reduce((n,x)=>n+conv(Number(x.amount)||0,x.currency)/100,0), expense=tx.filter(x=>x.kind!=='Income').reduce((n,x)=>n+conv(Number(x.amount)||0,x.currency)/100,0);
  const overdue=data!.tasks.filter(x=>x.status!=='Done'&&x.dueDate&&x.dueDate<to).length;
  const parts=[taskRate,habitRate].filter((x):x is number=>x!==null), score=parts.length?parts.reduce((a,b)=>a+b,0)/parts.length*100:null;
  const strengths:string[]=[],weaknesses:string[]=[],actions:string[]=[];
  if(taskRate!==null&&due.length>=3&&taskRate>=.75)strengths.push(fa?'نرخ تکمیل کارهای موعددار خوب بوده است.':'Strong completion of due tasks.');
  if(habitRate!==null&&logs.length>=3&&habitRate>=.8)strengths.push(fa?'استمرار عادت‌ها در سطح خوبی است.':'Habit consistency is strong.');
  if(focusSec>0&&oldSec>0&&focusSec>=oldSec*1.15)strengths.push(fa?'زمان تمرکز نسبت به هفته قبل رشد کرده است.':'Focus time increased versus last week.');
  if(income>expense&&tx.length>=2)strengths.push(fa?'جریان نقدی ثبت‌شده مثبت است.':'Recorded cash flow is positive.');
  if(overdue>=3){weaknesses.push(fa?overdue+' کار معوق وجود دارد.':overdue+' tasks are overdue.');actions.push(fa?'سه کار معوق مهم را انتخاب و برایشان موعد تازه تعیین کن.':'Reschedule the three most important overdue tasks.');}
  if(habitRate!==null&&logs.length>=3&&habitRate<.5){weaknesses.push(fa?'ثبت عادت‌ها کمتر از نصف هدف هفتگی است.':'Habit completion is below half of the weekly target.');actions.push(fa?'هفته بعد فقط روی یک یا دو عادت کلیدی تمرکز کن.':'Focus on one or two keystone habits next week.');}
  if(expense>income&&tx.length>=2){weaknesses.push(fa?'هزینه‌های ثبت‌شده از درآمد بیشتر است.':'Recorded expenses exceed income.');actions.push(fa?'هزینه‌های اختیاری را بازبینی کن.':'Review discretionary spending.');}
  if(taskRate!==null&&oldTask!==null&&taskRate<oldTask-.15){weaknesses.push(fa?'نرخ تکمیل کارها نسبت به هفته قبل افت کرده است.':'Task completion declined versus last week.');actions.push(fa?'حجم کارهای هفته بعد را واقع‌بینانه‌تر کن.':'Set a more realistic workload next week.');}
  if(!actions.length)actions.push(fa?'یک هدف اصلی و سه کار مهم برای هفته آینده انتخاب کن.':'Choose one primary goal and three important tasks for next week.');
  const chart=Array.from({length:7},(_,i)=>{const d=new Date(start.getTime()+i*DAY),key=iso(d);return{day:new Intl.DateTimeFormat(fa?'fa-IR':'en-US',{weekday:'short'}).format(d),tasks:completed.filter(x=>String(x.completedAt||'').slice(0,10)===key).length,focus:Math.round(sessions.filter(s=>iso(new Date(s.date))===key).reduce((n,s)=>n+seconds(s),0)/60)}});
  return{due:due.length,done:completed.length,taskRate,habitRate,logs:logs.length,expected,focus:Math.round(focusSec/60),oldFocus:Math.round(oldSec/60),income,expense,txCount:tx.length,overdue,score,chart,strengths,weaknesses,actions};
 },[data,settings,focus,from,to,prevFrom,fa]);
 const saveReview=()=>{const item={id:from+'-'+Date.now(),from,to,score:r.score,tasks:r.taskRate,habits:r.habitRate,focus:r.focus};const next=[item,...history.filter(x=>x.from!==from)].slice(0,52);localStorage.setItem(HISTORY_KEY,JSON.stringify(next));setHistory(next);toast.success(fa?'گزارش روی همین دستگاه ذخیره شد.':'Review saved on this device.');};
 const addTask=async(action:string,i:number)=>{const ok=await save('tasks',{title:action,notes:fa?'پیشنهاد مرور هفتگی MeAlpha':'Suggested by MeAlpha Weekly Review',status:'Todo',priority:i===0?'High':'Medium',dueDate:to});if(ok)toast.success(fa?'به کارها اضافه شد.':'Added to tasks.');};
 const exportJson=()=>{const blob=new Blob([JSON.stringify({type:'mealpha-weekly-review',period:{from,to},metrics:r},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mealpha-weekly-review-'+to+'.json';a.click();URL.revokeObjectURL(url);};
 return <div className='space-y-5 pb-24 md:pb-0'><PageHeader title={fa?'مرور هوشمند هفتگی':'AI Weekly Review'} subtitle={fa?'تحلیل محلی داده‌های ثبت‌شده؛ بدون ارسال اطلاعات به سرویس خارجی.':'Local analysis of recorded data. No data is sent to an external service.'} action={<div className='flex gap-2'><Button variant='outline' onClick={exportJson}><Download className='h-4 w-4 me-1'/>{fa?'خروجی':'Export'}</Button><Button onClick={saveReview}>{fa?'ذخیره گزارش':'Save review'}</Button></div>}/>
 <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'><span className='flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary'><BrainCircuit className='h-3.5 w-3.5'/>{fa?'هوشمندی محلی':'Local intelligence'}</span><span>{fmtDate(settings.language,settings.calendar,from)} — {fmtDate(settings.language,settings.calendar,to)}</span></div>
 <div className='grid grid-cols-2 xl:grid-cols-4 gap-3'><Kpi label={fa?'امتیاز عملکرد':'Performance score'} value={r.score===null?'—':fmtNum(settings.language,r.score)+'٪'} tone='accent'/><Kpi label={fa?'تکمیل کارها':'Task completion'} value={r.taskRate===null?'—':fmtNum(settings.language,r.taskRate*100)+'٪'} hint={r.done+' / '+r.due}/><Kpi label={fa?'استمرار عادت‌ها':'Habit consistency'} value={r.habitRate===null?'—':fmtNum(settings.language,r.habitRate*100)+'٪'} hint={r.logs+' / '+r.expected}/><Kpi label={fa?'زمان تمرکز':'Focus time'} value={fmtNum(settings.language,r.focus)+' '+(fa?'دقیقه':'min')} hint={(fa?'هفته قبل: ':'Previous: ')+r.oldFocus}/></div>
 <Panel title={fa?'روند روزانه':'Daily activity'}><div className='h-64' dir='ltr'><ResponsiveContainer width='100%' height='100%'><BarChart data={r.chart}><CartesianGrid strokeDasharray='3 3' stroke='hsl(var(--border))'/><XAxis dataKey='day' fontSize={11}/><YAxis fontSize={11}/><Tooltip/><RBar dataKey='tasks' name={fa?'کار تکمیل‌شده':'Tasks completed'} fill='hsl(var(--chart-1))' radius={[5,5,0,0]}/><RBar dataKey='focus' name={fa?'دقیقه تمرکز':'Focus minutes'} fill='hsl(var(--chart-2))' radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div><p className='text-xs text-muted-foreground'>{fa?'فقط فعالیت‌های ثبت‌شده در برنامه نمایش داده می‌شوند.':'Only activity recorded in the app is shown.'}</p></Panel>
 <div className='grid lg:grid-cols-2 gap-4'><Panel title={fa?'نقاط قوت':'Strengths'}>{r.strengths.length?r.strengths.map((x,i)=><p key={i} className='mb-3 flex gap-2 text-sm'><CheckCircle2 className='h-4 w-4 shrink-0 text-emerald-500'/>{x}</p>):<p className='text-sm text-muted-foreground'>{fa?'شواهد کافی برای تأیید نقطه قوت وجود ندارد.':'Not enough evidence to confirm a strength yet.'}</p>}</Panel><Panel title={fa?'نقاط قابل بهبود':'Areas to improve'}>{r.weaknesses.length?r.weaknesses.map((x,i)=><p key={i} className='mb-3 text-sm'>• {x}</p>):<p className='text-sm text-muted-foreground'>{fa?'مسئله مشخصی شناسایی نشد.':'No clear issue was identified.'}</p>}</Panel></div>
 <Panel title={fa?'برنامه پیشنهادی هفته آینده':'Next week action plan'}>{r.actions.map((x,i)=><div key={i} className='mb-3 flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center'><span className='flex-1 text-sm'><Target className='me-2 inline h-4 w-4 text-primary'/>{x}</span><Button size='sm' variant='outline' onClick={()=>void addTask(x,i)}>{fa?'افزودن به کارها':'Add as task'}</Button></div>)}</Panel>
 <Panel title={fa?'مرور مالی هفته':'Weekly finance'}><div className='grid grid-cols-2 gap-3'><Kpi label={fa?'درآمد ثبت‌شده':'Recorded income'} value={fmtMoney(settings.language,r.income,settings.currency)} tone='good'/><Kpi label={fa?'هزینه ثبت‌شده':'Recorded expenses'} value={fmtMoney(settings.language,r.expense,settings.currency)} tone={r.expense>r.income?'bad':'default'}/></div><p className='mt-3 text-xs text-muted-foreground'>{r.txCount} {fa?'تراکنش ثبت شده؛ در نبود داده مالی نتیجه‌گیری نمی‌شود.':'transactions recorded; no conclusion is made when data is missing.'}</p></Panel>
 <Panel title={fa?'گزارش‌های ذخیره‌شده':'Saved reviews'}>{history.length?history.slice(0,6).map(x=><div key={x.id} className='flex justify-between border-b py-2 text-sm'><span>{fmtDate(settings.language,settings.calendar,x.from)} — {fmtDate(settings.language,settings.calendar,x.to)}</span><b>{x.score===null?'—':fmtNum(settings.language,x.score)+'٪'}</b></div>):<p className='text-sm text-muted-foreground'>{fa?'هنوز گزارشی ذخیره نشده است.':'No saved reviews yet.'}</p>}</Panel>
 <p className='text-xs leading-6 text-muted-foreground'>{fa?'شفافیت: داده ناقص صفر فرض نمی‌شود. این نسخه از قوانین تحلیلی محلی استفاده می‌کند و هنوز به مدل زبانی خارجی متصل نیست؛ اتصال AI واقعی به انتخاب جداگانه حریم خصوصی و سطح دسترسی داده نیاز دارد.':'Transparency: missing data is not treated as zero. This version uses deterministic local rules, not a remote language model. A real AI model requires a separate privacy and data-access choice.'}</p></div>;
}
