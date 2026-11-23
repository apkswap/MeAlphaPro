import { ArrowLeft, ArrowUpRight, ArrowLeftRight, Landmark, ReceiptText, ShieldCheck, Sparkles, TrendingUp, WalletCards } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useStore } from '../lib/store';

function AssetArtwork() {
  return (
    <svg viewBox="0 0 360 220" role="img" aria-label="Assets illustration" className="h-full w-full">
      <defs>
        <linearGradient id="asset-vault" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#F6D77A"/><stop offset=".48" stopColor="#B97920"/><stop offset="1" stopColor="#6D3A16"/></linearGradient>
        <linearGradient id="asset-door" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#E9B85A"/><stop offset="1" stopColor="#75421E"/></linearGradient>
        <filter id="asset-shadow"><feGaussianBlur stdDeviation="9"/></filter>
      </defs>
      <ellipse cx="185" cy="188" rx="112" ry="15" fill="#F6C453" opacity=".22" filter="url(#asset-shadow)"/>
      <g transform="translate(110 22)">
        <path d="M18 24 133 0l69 30-113 29z" fill="#D6A44C" opacity=".9"/>
        <path d="M18 24v126l71 32V58z" fill="#6D3E23"/>
        <path d="M89 58 202 30v122L89 182z" fill="url(#asset-vault)" stroke="#F9D989" strokeWidth="2"/>
        <path d="M108 70 183 51v82l-75 19z" fill="url(#asset-door)" stroke="#FFE5A2" strokeWidth="3"/>
        <circle cx="145" cy="102" r="28" fill="#5C351F" stroke="#F8D77F" strokeWidth="5"/>
        <circle cx="145" cy="102" r="17" fill="none" stroke="#F8D77F" strokeWidth="3"/>
        <path d="M145 83v38M126 102h38M132 89l26 26M158 89l-26 26" stroke="#F8D77F" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="176" cy="102" r="5" fill="#FFF0B9"/>
      </g>
      <g fill="#F6C453" stroke="#FFE7A0" strokeWidth="2">
        <ellipse cx="74" cy="168" rx="28" ry="9"/><path d="M46 157v11c0 5 13 9 28 9s28-4 28-9v-11" fill="#C78A2E"/><ellipse cx="74" cy="157" rx="28" ry="9"/>
        <ellipse cx="283" cy="172" rx="24" ry="8"/><path d="M259 161v11c0 5 11 8 24 8s24-3 24-8v-11" fill="#C78A2E"/><ellipse cx="283" cy="161" rx="24" ry="8"/>
      </g>
      <g fill="#FFE7A0"><circle cx="53" cy="137" r="3"/><circle cx="300" cy="137" r="3"/><circle cx="88" cy="117" r="2"/></g>
    </svg>
  );
}

function TransactionArtwork() {
  return (
    <svg viewBox="0 0 360 220" role="img" aria-label="Transactions illustration" className="h-full w-full">
      <defs>
        <linearGradient id="tx-card" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#56C8FF"/><stop offset="1" stopColor="#1645B9"/></linearGradient>
        <linearGradient id="tx-paper" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#FFFFFF"/><stop offset="1" stopColor="#C7D7FF"/></linearGradient>
        <filter id="tx-shadow"><feGaussianBlur stdDeviation="10"/></filter>
      </defs>
      <ellipse cx="185" cy="187" rx="120" ry="14" fill="#38BDF8" opacity=".25" filter="url(#tx-shadow)"/>
      <g transform="translate(80 28) rotate(-8 105 80)">
        <rect x="18" y="22" width="192" height="118" rx="18" fill="#142D78" stroke="#6ABEFF" strokeWidth="2"/>
        <rect x="30" y="10" width="192" height="118" rx="18" fill="url(#tx-card)" stroke="#8AD8FF" strokeWidth="2"/>
        <rect x="48" y="32" width="37" height="23" rx="5" fill="#F7D88A"/>
        <path d="M48 84h110" stroke="#C6EDFF" strokeWidth="7" strokeLinecap="round" opacity=".8"/>
        <path d="M48 101h68" stroke="#C6EDFF" strokeWidth="5" strokeLinecap="round" opacity=".45"/>
        <circle cx="186" cy="93" r="12" fill="#F7D88A" opacity=".95"/>
      </g>
      <g transform="translate(205 48) rotate(8 50 65)">
        <path d="M8 4h91l20 20v112H8z" fill="url(#tx-paper)" stroke="#DCE8FF" strokeWidth="2"/>
        <path d="M99 4v22h20" fill="#AFC8FF"/>
        <path d="M25 48h72M25 66h72M25 84h52" stroke="#7292D6" strokeWidth="5" strokeLinecap="round" opacity=".7"/>
        <path d="m28 108 12 11 23-27" fill="none" stroke="#2563EB" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
      <circle cx="286" cy="151" r="25" fill="#2563EB" stroke="#A7E6FF" strokeWidth="3"/>
      <path d="m274 151 8 8 16-18" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
      <g fill="#8AD8FF"><circle cx="65" cy="54" r="3"/><circle cx="300" cy="47" r="2.5"/><circle cx="58" cy="151" r="2"/></g>
    </svg>
  );
}

export default function FinancialHub() {
  const { data, settings } = useStore();
  const fa = settings.language === 'fa';
  const cards = [
    {
      to: '/wealth',
      title: fa ? 'دارایی‌ها و بدهی‌ها' : 'Assets & Liabilities',
      subtitle: fa ? 'مدیریت دارایی‌ها، ارزش‌گذاری، بدهی‌ها و ارزش خالص' : 'Manage assets, valuations, liabilities and net worth.',
      detail: fa ? 'دارایی ثبت‌شده' : 'Recorded assets',
      count: data!.assets.length,
      accent: 'from-violet-600/35 via-purple-900/15 to-amber-500/10',
      border: 'hover:border-amber-400/50',
      icon: Landmark,
      Artwork: AssetArtwork,
      tag: fa ? 'مدیریت ثروت' : 'WEALTH MANAGEMENT',
    },
    {
      to: '/transactions',
      title: fa ? 'تراکنش‌ها و جریان نقدی' : 'Transactions & Cash Flow',
      subtitle: fa ? 'ثبت درآمد و هزینه، حساب‌ها و یادآوری پرداخت‌ها' : 'Track income, expenses, accounts and payment reminders.',
      detail: fa ? 'تراکنش ثبت‌شده' : 'Recorded transactions',
      count: data!.transactions.length,
      accent: 'from-blue-600/35 via-indigo-900/20 to-cyan-400/10',
      border: 'hover:border-cyan-400/50',
      icon: ReceiptText,
      Artwork: TransactionArtwork,
      tag: fa ? 'مدیریت جریان نقدی' : 'CASH FLOW MANAGEMENT',
    },
  ];
  return (
    <div dir={fa ? 'rtl' : 'ltr'} className="space-y-6">
      <section className="relative isolate overflow-hidden rounded-[28px] border border-violet-400/20 bg-[#10091f] px-5 py-7 text-white shadow-2xl shadow-violet-950/20 sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_82%_18%,rgba(139,92,246,.38),transparent_38%),radial-gradient(ellipse_at_8%_100%,rgba(245,183,67,.13),transparent_36%),linear-gradient(120deg,#10091f,#1b0c35_55%,#0b1026)]" />
        <div className="pointer-events-none absolute -end-10 -top-24 h-64 w-64 rounded-full border border-violet-300/10" />
        <div className="pointer-events-none absolute -end-2 -top-16 h-48 w-48 rounded-full border border-violet-300/10" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-[10px] font-bold tracking-[.16em] text-amber-200">
              <Sparkles className="h-3.5 w-3.5" />{fa ? 'مرکز مدیریت مالی' : 'FINANCIAL COMMAND CENTER'}
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{fa ? 'مدیریت مالی' : 'Financial Management'}</h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/65">{fa ? 'دارایی‌ها، بدهی‌ها و جریان نقدی را از یک نقطه مدیریت کن.' : 'Your assets, liabilities and cash flow — organized in one place.'}</p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3 text-xs text-white/75 backdrop-blur">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
            <span>{fa ? 'اطلاعات مالی تحت کنترل توست' : 'Your financial data stays in your control'}</span>
          </div>
        </div>
        <div className="relative mt-7 grid grid-cols-2 gap-3 sm:max-w-xl">
          <div className="rounded-2xl border border-white/10 bg-white/[.06] p-3 backdrop-blur"><div className="text-[10px] text-white/55">{fa ? 'دارایی ثبت‌شده' : 'Recorded assets'}</div><div className="mt-1 text-2xl font-black tabular-nums">{data!.assets.length.toLocaleString(fa ? 'fa-IR' : 'en-US')}</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[.06] p-3 backdrop-blur"><div className="text-[10px] text-white/55">{fa ? 'تراکنش ثبت‌شده' : 'Recorded transactions'}</div><div className="mt-1 text-2xl font-black tabular-nums">{data!.transactions.length.toLocaleString(fa ? 'fa-IR' : 'en-US')}</div></div>
        </div>
        <div className="pointer-events-none absolute bottom-0 end-8 hidden h-28 w-28 opacity-20 sm:block"><TrendingUp className="h-full w-full text-violet-200" /></div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-black">{fa ? 'انتخاب بخش مالی' : 'Choose a financial area'}</h2><p className="mt-1 text-xs text-muted-foreground">{fa ? 'برای ورود، یکی از بخش‌های زیر را انتخاب کن.' : 'Choose where you want to work.'}</p></div>
        <div className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-2 text-[11px] text-muted-foreground"><WalletCards className="h-4 w-4 text-primary" />{fa ? 'نمای کلی مالی' : 'Financial overview'}</div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {cards.map(({ to, title, subtitle, detail, count, accent, border, icon: Icon, Artwork, tag }) => (
          <NavLink key={to} to={to} className={`group relative isolate overflow-hidden rounded-[28px] border border-border/80 bg-card shadow-lg shadow-black/[.04] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-950/10 ${border}`}>
            <div className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br ${accent} opacity-80`} />
            <div className="flex min-h-[350px] flex-col p-5 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border bg-background/65 px-3 py-1.5 text-[9px] font-extrabold tracking-[.14em] text-muted-foreground backdrop-blur"><Icon className="h-3.5 w-3.5 text-primary" />{tag}</div>
                <span className="grid h-10 w-10 place-items-center rounded-2xl border bg-background/70 text-muted-foreground transition group-hover:border-primary/40 group-hover:text-primary"><ArrowUpRight className="h-4 w-4 rtl:rotate-[-90deg]" /></span>
              </div>
              <div className="mx-auto mt-2 h-44 w-full max-w-[330px] transition-transform duration-500 group-hover:scale-[1.04]"><Artwork /></div>
              <div className="mt-auto flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0 flex-1"><h3 className="text-xl font-black tracking-tight">{title}</h3><p className="mt-2 max-w-md text-xs leading-6 text-muted-foreground">{subtitle}</p></div>
                <div className="shrink-0 rounded-xl border bg-background/65 px-3 py-2 text-end"><div className="text-[9px] text-muted-foreground">{detail}</div><div className="mt-0.5 text-lg font-black tabular-nums">{count.toLocaleString(fa ? 'fa-IR' : 'en-US')}</div></div>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-4 text-xs font-bold"><span className="text-primary">{fa ? 'ورود به بخش' : 'Open section'}</span><span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground transition group-hover:translate-x-[-3px]"><ArrowLeft className="h-4 w-4 rtl:rotate-180" /></span></div>
            </div>
          </NavLink>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 py-1 text-[10px] text-muted-foreground"><ArrowLeftRight className="h-3.5 w-3.5" />{fa ? 'می‌توانی هر زمان بین دو بخش جابه‌جا شوی؛ اطلاعات قبلی حفظ می‌شوند.' : 'Switch between these areas at any time. Your existing records stay intact.'}</div>
    </div>
  );
}
