import type { MarketAsset } from '../../types';

export type BinanceQuotePoint = { observedAt: number; price: number; evidenceId: string };
export const BINANCE_HISTORY_LIMIT = 120;
export const BINANCE_HISTORY_WINDOW_MS = 30 * 60_000;

export function verifiedBinanceQuote(asset: MarketAsset | undefined, now: number) {
  return !!asset && asset.id === 'market:BINANCE:BTCUSDT' && asset.symbol === 'BTCUSDT' &&
    asset.provider === 'binance' && asset.quoteCurrency === 'USDT' && asset.timeSemantics === 'realtime' &&
    Number.isFinite(asset.price) && asset.price! > 0 && Number.isSafeInteger(asset.observedAt) &&
    asset.observedAt! <= now && now - asset.observedAt! < 30_000 &&
    /^CAPITAL_FACTS:[1-9][0-9]*:[a-f0-9]{64}$/.test(asset.evidenceId || '');
}

/** Session samples of replay-verified public values; no inferred candles or 24h returns. */
export function appendBinanceQuote(history: BinanceQuotePoint[], asset: MarketAsset | undefined, now: number) {
  if (!verifiedBinanceQuote(asset, now)) return [];
  const points = history.filter(point => point.observedAt >= now - BINANCE_HISTORY_WINDOW_MS);
  const last = points.at(-1);
  if (last && (last.observedAt >= asset!.observedAt! || last.evidenceId === asset!.evidenceId)) return points;
  return [...points, {observedAt: asset!.observedAt!, price: asset!.price!, evidenceId: asset!.evidenceId!}]
    .slice(-BINANCE_HISTORY_LIMIT);
}

export function binanceChart(history: BinanceQuotePoint[]) {
  if (history.length < 2) return null;
  const first = history[0], last = history.at(-1)!;
  if (last.observedAt <= first.observedAt) return null;
  const min = Math.min(...history.map(point => point.price));
  const max = Math.max(...history.map(point => point.price));
  const paths: string[] = [];
  let path = '';
  history.forEach((point, index) => {
    const x = 20 + 560 * (point.observedAt - first.observedAt) / (last.observedAt - first.observedAt);
    const y = max === min ? 100 : 180 - 160 * (point.price - min) / (max - min);
    // Don't join observations across an outage/missing polling interval.
    if (index && point.observedAt - history[index - 1].observedAt > 90_000) {
      paths.push(path); path = '';
    }
    path += `${path ? ' L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  });
  if (path) paths.push(path);
  return {paths, min, max, first, last, changePct: 100 * (last.price / first.price - 1)};
}
