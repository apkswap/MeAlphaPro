import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { assertValidSnapshot, mergeSnapshot } from './lib/localDb';
import DropboxOAuthHandler from './components/DropboxOAuthHandler';
import { Toaster } from '@project/components/ui/sonner';
import { StoreProvider, useStore } from './lib/store';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import Tasks from './pages/Tasks';
import Habits from './pages/Habits';
import Focus from './pages/Focus';
import Transactions from './pages/Transactions';
import Wealth from './pages/Wealth';
import Insights from './pages/Insights';
import SettingsPage from './pages/Settings';
import Workspace from './pages/Workspace';

function Splash() {
  return <div className="min-h-screen grid place-items-center"><div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center font-black text-white text-xl animate-pulse">α</div></div>;
}
function Shell() {
  const { data, storageError, reload } = useStore();
  if (storageError) return (
    <main className="min-h-screen grid place-items-center bg-background p-5" dir="rtl">
      <section className="w-full max-w-xl space-y-4 rounded-3xl border bg-card p-6 shadow-xl">
        <div className="text-xs font-bold tracking-widest text-primary">MEALPHA PRO · DATA RECOVERY</div>
        <h1 className="text-2xl font-black">دسترسی به اطلاعات محلی با مشکل مواجه شد</h1>
        <p className="text-sm leading-7 text-muted-foreground">برنامه به‌جای نمایش اطلاعات خالی، در حالت محافظت‌شده متوقف شده است. این خطا به‌تنهایی به معنی حذف اطلاعات نیست. حافظه برنامه را پاک نکنید و برنامه را حذف نکنید.</p>
        <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-xl bg-muted p-3 text-xs" dir="ltr">{storageError}</pre>
        <div className="grid gap-2 sm:grid-cols-2">
          <button className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground" onClick={() => void reload()}>تلاش مجدد برای خواندن اطلاعات</button>
          <label className="cursor-pointer rounded-xl border px-4 py-3 text-center text-sm font-bold">بازیابی فایل پشتیبان JSON
            <input className="hidden" type="file" accept="application/json,.json" onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                if (file.size > 50 * 1024 * 1024) throw new Error('حجم فایل پشتیبان بیشتر از ۵۰ مگابایت است.');
                const snapshot: unknown = JSON.parse(await file.text());
                assertValidSnapshot(snapshot);
                await mergeSnapshot(snapshot);
                await reload();
                window.location.reload();
              } catch (error) {
                window.alert(error instanceof Error ? error.message : 'بازیابی فایل پشتیبان ناموفق بود.');
              } finally {
                event.target.value = '';
              }
            }} />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">اگر نسخه پشتیبان ندارید، ابتدا باید مسیر دیتابیس و بکاپ Dropbox را بررسی کنیم. هیچ Sync جدیدی انجام ندهید.</p>
      </section>
    </main>
  );
  if (!data) return <Splash />;
  return <BrowserRouter basename={window.location.pathname.startsWith("/MeAlphaPro/preview") ? "/MeAlphaPro/preview" : undefined}><Routes><Route element={<Layout />}>
    <Route path="/" element={<Dashboard />} /><Route path="/goals" element={<Goals />} />
    <Route path="/tasks" element={<Tasks />} /><Route path="/habits" element={<Habits />} />
    <Route path="/focus" element={<Focus />} /><Route path="/transactions" element={<Transactions />} />
    <Route path="/wealth" element={<Wealth />} /><Route path="/insights" element={<Insights />} />
    <Route path="/settings" element={<SettingsPage />} /><Route path="/workspace" element={<Workspace />} /><Route path="*" element={<Dashboard />} />
  </Route></Routes></BrowserRouter>;
}
export default function App() {
  return <StoreProvider><DropboxOAuthHandler /><Shell /><Toaster /></StoreProvider>;
}
