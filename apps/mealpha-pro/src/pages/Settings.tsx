import { useEffect, useState } from 'react';
import { Download, Upload, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Textarea } from '@project/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { useStore, Settings } from '../lib/store';
import { Panel, PageHeader } from '../components/ui-bits';
import { getSnapshot, mergeSnapshot } from '../lib/localDb';

export default function SettingsPage(){
 const {t,settings,setLocalSettings}=useStore();
 const [s,setS]=useState<Settings>(settings),[busy,setBusy]=useState(false);
 useEffect(()=>setS(settings),[settings]);
 const set=<K extends keyof Settings>(k:K,v:Settings[K])=>setS(p=>({...p,[k]:v}));
 const categoryText=(key:'goals'|'tasks'|'transactions')=>(s.customCategories?.[key]??[]).join('\n');
 const updateCategories=(key:'goals'|'tasks'|'transactions',value:string)=>set('customCategories',{...(s.customCategories??{}),[key]:[...new Set(value.split(/[\n,،]/).map(x=>x.trim()).filter(Boolean))]});
 const submit=async()=>{if(!s.currency.trim())return toast.error(t('currency'));setBusy(true);try{await setLocalSettings({...s,currency:s.currency.trim().toUpperCase()});toast.success(t('saved'));}catch{toast.error(t('error'));}finally{setBusy(false);}};
 const exportBackup=async()=>{const snapshot=await getSnapshot();const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`mealpha-pro-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);};
 const importBackup=async(file?:File)=>{if(!file)return;try{const parsed=JSON.parse(await file.text());if(parsed.version!==1||!parsed.data)throw new Error('Invalid backup file');await mergeSnapshot(parsed);toast.success(settings.language==='fa'?'نسخه پشتیبان بازیابی شد.':'Backup restored.');window.location.reload();}catch(e){toast.error(e instanceof Error?e.message:t('error'));}};
 const fa=settings.language==='fa';
 return <div className="max-w-4xl space-y-5"><PageHeader title={t('settings')} />
 <Panel><div className="grid gap-5 sm:grid-cols-2">
 <div className="space-y-1.5"><Label>{t('language')}</Label><Select value={s.language} onValueChange={v=>set('language',v as Settings['language'])}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="fa">فارسی</SelectItem><SelectItem value="en">English</SelectItem></SelectContent></Select></div>
 <div className="space-y-1.5"><Label>{t('calendar')}</Label><Select value={s.calendar} onValueChange={v=>set('calendar',v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="jalali">{t('jalali')}</SelectItem><SelectItem value="gregorian">{t('gregorian')}</SelectItem></SelectContent></Select></div>
 <div className="space-y-1.5"><Label>{t('reportCurrency')}</Label><Input value={s.currency} onChange={e=>set('currency',e.target.value)} placeholder="IRT, IRR, USD, EUR…"/></div>
 <div className="space-y-1.5"><Label>{t('monthlyBudget')}</Label><Input type="number" value={s.monthlyBudget??''} onChange={e=>set('monthlyBudget',e.target.value===''?null:Number(e.target.value))}/></div>
 <div className="space-y-1.5 sm:col-span-2"><Label>{t('rates')}</Label><Textarea dir="ltr" rows={4} value={s.exchangeRates} onChange={e=>set('exchangeRates',e.target.value)} placeholder={'USD=600000\nEUR=650000'} className="font-mono"/><p className="text-xs text-muted-foreground">{t('ratesHelp')}</p></div>
 </div>
 <div className="mt-6 space-y-4 border-t pt-5"><div><h3 className="text-sm font-bold">{fa?'شخصی‌سازی دسته‌بندی‌ها':'Custom categories'}</h3><p className="mt-1 text-xs text-muted-foreground">{fa?'هر دسته را در یک خط بنویسید؛ این گزینه‌ها در فرم‌های ثبت اطلاعات قابل انتخاب خواهند بود.':'Enter one category per line. These options appear in record forms.'}</p></div>
 <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label>{fa?'دسته‌بندی اهداف':'Goal categories'}</Label><Textarea rows={4} value={categoryText('goals')} onChange={e=>updateCategories('goals',e.target.value)} placeholder={fa?'تحصیلی\nشغلی\nشخصی':'Education\nCareer\nPersonal'}/></div><div className="space-y-1.5"><Label>{fa?'دسته‌بندی کارها':'Task categories'}</Label><Textarea rows={4} value={categoryText('tasks')} onChange={e=>updateCategories('tasks',e.target.value)} placeholder={fa?'پروژه\nجلسه\nیادگیری':'Project\nMeeting\nLearning'}/></div><div className="space-y-1.5 sm:col-span-2"><Label>{fa?'دسته‌بندی تراکنش‌های مالی':'Transaction categories'}</Label><Textarea rows={4} value={categoryText('transactions')} onChange={e=>updateCategories('transactions',e.target.value)} placeholder={fa?'حقوق\nخوراک\nحمل‌ونقل':'Salary\nFood\nTransport'}/></div></div></div>
 <Button className="mt-6" onClick={submit} disabled={busy}>{t('save')}</Button></Panel>
 <Panel title={fa?'حریم خصوصی و نگهداری داده':'Privacy & data control'}>
 <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[.04] p-4"><ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-300"/><div><div className="font-semibold text-emerald-200">{fa?'ذخیره‌سازی محلی؛ بدون Google Cloud':'Local-first. No Google Cloud.'}</div><p className="mt-1 text-sm leading-6 text-slate-400">{fa?'اطلاعات برنامه روی همین دستگاه ذخیره می‌شوند. برای ثبت، ویرایش و مشاهده نیازی به اینترنت یا حساب ابری ندارید. همگام‌سازی ابری گوگل در این نسخه غیرفعال است.':'Your records stay on this device. No internet or cloud account is needed to use the app. Google Cloud sync is not part of this edition.'}</p></div></div>
 <div className="mt-5 flex flex-wrap gap-2 border-t pt-4"><Button variant="outline" onClick={()=>void exportBackup()}><Download className="me-2 h-4 w-4"/>{fa?'خروجی فایل پشتیبان':'Export backup'}</Button><label className="inline-flex cursor-pointer items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"><Upload className="me-2 h-4 w-4"/>{fa?'بازیابی پشتیبان':'Import backup'}<input type="file" accept="application/json,.json" className="hidden" onChange={e=>void importBackup(e.target.files?.[0])}/></label></div>
 <p className="mt-3 text-xs text-slate-500">{fa?'برای انتقال اطلاعات بین دستگاه‌ها، فایل پشتیبان رمزگذاری‌نشده است؛ آن را در محل امن نگهداری کن.':'Backups are currently unencrypted JSON. Store exported files securely.'}</p>
 </Panel></div>;
}