import React, { useEffect, useState } from 'react';
import { useMarketAssets } from '../../services/marketDataStore';
import type { MarketAsset } from '../../types';
import { appendBinanceQuote, binanceChart, verifiedBinanceQuote, type BinanceQuotePoint } from './binanceQuoteHistory';

const price = (value: number) => value.toLocaleString('de-DE', {maximumFractionDigits: 8});
const time = (value: number) => new Date(value).toLocaleTimeString('de-DE', {timeZone: 'UTC'}) + ' UTC';

export function BinanceMarketView({ asset, history, now }: {
  asset?: MarketAsset; history: BinanceQuotePoint[]; now: number;
}) {
  const available = verifiedBinanceQuote(asset, now);
  const chart = available ? binanceChart(history) : null;
  return <section aria-labelledby="binance-market-heading" className="rounded-2xl border border-slate-700 bg-slate-950 p-5 space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs text-amber-300">Krypto · Spotmarkt</p>
        <h2 id="binance-market-heading" className="text-xl font-semibold text-white">Bitcoin / Tether</h2>
        <p className="text-sm text-slate-300">BTCUSDT · Handelsplatz Binance · Kurswährung USDT</p></div>
      <p role="status" className="text-sm text-slate-300">{available ? 'Bestätigter Kurs' : 'Kurs nicht verfügbar'}</p>
    </div>
    <p className="text-sm text-slate-300">Kursbewegungen nachvollziehen und die Datenbasis vor einer Analyse prüfen.</p>
    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div><dt className="text-sm text-slate-400">Letzter bestätigter Kurs</dt><dd className="text-xl text-white font-mono">{available ? `${price(asset!.price!)} USDT` : '—'}</dd></div>
      <div><dt className="text-sm text-slate-400">Änderung im dargestellten Zeitraum</dt><dd className="text-xl text-white font-mono">{chart ? `${chart.changePct.toFixed(2)} %` : '—'}</dd></div>
      <div><dt className="text-sm text-slate-400">Modell-Score</dt><dd className="text-xl text-white">Nicht verfügbar</dd></div>
    </dl>
    {chart ? <figure className="space-y-2">
      <svg viewBox="0 0 600 200" role="img" aria-labelledby="binance-chart-title binance-chart-description" className="w-full max-h-64">
        <title id="binance-chart-title">BTCUSDT Kursverlauf in USDT</title>
        <desc id="binance-chart-description">{history.length} beobachtete Kurse von {time(chart.first.observedAt)} bis {time(chart.last.observedAt)}. Minimum {price(chart.min)}, Maximum {price(chart.max)} USDT. Datenlücken werden nicht verbunden.</desc>
        <path d="M 20 180 L 580 180" stroke="#64748b" />
        {chart.paths.map((path, index) => <path key={index} d={path} fill="none" stroke="#fbbf24" strokeWidth="2" />)}
      </svg>
      <figcaption className="text-sm text-slate-300">{time(chart.first.observedAt)} – {time(chart.last.observedAt)} · {history.length} Sitzungsbeobachtungen · {price(chart.min)} bis {price(chart.max)} USDT</figcaption>
      <p className="text-xs text-slate-400">Stichproben aus der Kursanzeige, keine vollständige Tick-Historie und keine 24-Stunden-Rendite.</p>
    </figure> : <p className="border border-dashed border-slate-700 rounded-xl p-6 text-sm text-slate-300">{available ? 'Der Verlauf erscheint ab zwei bestätigten Beobachtungen.' : 'Dieser Feed ist noch nicht für die öffentliche Anzeige verfügbar. Es werden keine Ersatzkurse dargestellt.'}</p>}
    <p className="text-sm text-slate-300">Ein Kurs allein reicht für einen Score nicht aus. Modellversion, geprüfte Features und Ergebnisbelege müssen ebenfalls vorliegen. Ein Score ist keine Renditegarantie.</p>
    {available && <details className="text-sm text-slate-300"><summary className="cursor-pointer">Quellenbeleg ansehen</summary>
      <p className="mt-2">Beobachtet: {time(asset!.observedAt!)} · Binance Spot · USDT ist nicht USD.</p>
      <code className="block break-all mt-2 text-xs">{asset!.evidenceId}</code>
    </details>}
  </section>;
}

export function BinanceMarketPanel() {
  const assets = useMarketAssets();
  const asset = assets.find(item => item.provider === 'binance' && item.symbol === 'BTCUSDT');
  const [now, setNow] = useState(Date.now);
  const [history, setHistory] = useState<BinanceQuotePoint[]>([]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setHistory(points => appendBinanceQuote(points, asset, Date.now()));
  }, [asset]);
  return <BinanceMarketView asset={asset} history={history} now={now} />;
}
