import { useMemo } from 'react';
import { fmtMoney } from '../lib/i18n';
import { makeConverter, parseRates } from '../lib/analytics';
import { Settings } from '../lib/store';

export default function MoneyEquivalents({ amount, settings }: { amount: number; settings: Settings }) {
  const values = useMemo(() => {
    const base = (settings.currency || '').toUpperCase();
    const { fromBase } = makeConverter(settings);
    const currencies = [...new Set(parseRates(settings.exchangeRates, base).flatMap((pair) => [pair.from, pair.to]))]
      .filter((currency) => currency !== base);
    return currencies.map((currency) => ({ currency, value: fromBase(amount, currency) }))
      .filter((item): item is { currency: string; value: number } => item.value != null);
  }, [amount, settings.currency, settings.exchangeRates]);
  if (!values.length) return null;
  return <div className="mt-1 space-y-0.5 text-[11px] leading-5 text-muted-foreground tabular-nums">
    {values.map((item) => <div key={item.currency}>≈ {fmtMoney(settings.language, item.value / 100, item.currency)}</div>)}
  </div>;
}
