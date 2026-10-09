import React, { useEffect, useState } from 'react';
import { ScoreExplainabilityDrawer } from './ScoreExplainabilityDrawer';
import { type FinalRankResult } from '../../contracts/canonicalContracts';
import { useMarketAssets } from '../../services/marketDataStore';
import { PrivateMarketBatchQuotes } from './PrivateMarketBatchQuotes';
import { PrivateByokSpotQuotes } from './PrivateByokSpotQuotes';
import { useAnalysisQuery } from '../analysis/useAnalysisQuery';
import {
  ASSET_LABELS,
  PRODUCT_CLASSES,
  DATA_LABELS,
} from '../analysis/analysisPresentation';
import {
  type ScreenerRowItem,
  projectScreenerRows,
  numericFilter,
} from '../analysis/screenerProjection';
import {
  DataStatusBadge,
  panelClass,
  inputClass,
  buttonClass,
} from '../analysis/AnalysisUi';
export type { ScreenerRowItem } from '../analysis/screenerProjection';
// No endpoint serving an admitted multi-asset FinalRankResult cohort exists yet.
// Server-owned validated results may be passed here; quotes alone never become scores.
export const ScreenerTable: React.FC<{
  items?: readonly ScreenerRowItem[];
}> = ({ items = [] }) => {
  const referenceRates = useMarketAssets().filter(
    (a) =>
      a.timeSemantics === 'reference' && a.dataAvailability === 'reference',
  );
  const [search, setSearch] = useAnalysisQuery('q');
  const [assetClass, setAssetClass] = useAnalysisQuery('assetClass', 'all');
  const [market, setMarket] = useAnalysisQuery('market');
  const [sector, setSector] = useAnalysisQuery('sector');
  const [minScore, setMinScore] = useAnalysisQuery('minScore', '0');
  const [maxScore, setMaxScore] = useAnalysisQuery('maxScore', '100');
  const [minConfidence, setMinConfidence] = useAnalysisQuery(
    'minConfidence',
    '0',
  );
  const [minLiquidity, setMinLiquidity] = useAnalysisQuery('minLiquidity', '0');
  const [status, setStatus] = useAnalysisQuery('dataStatus', 'all');
  const [regime, setRegime] = useAnalysisQuery('regime');
  const [sentiment, setSentiment] = useAnalysisQuery('sentiment', 'all');
  const [risk, setRisk] = useAnalysisQuery('risk', 'all');
  const [sort, setSort] = useAnalysisQuery('sort', 'finalScore');
  const [selectedResult, setSelectedResult] = useState<FinalRankResult | null>(
    null,
  );
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const filtered = projectScreenerRows(
    items,
    {
      search,
      assetClass,
      market,
      sector,
      minScore: numericFilter(minScore, 0),
      maxScore: numericFilter(maxScore, 100),
      minConfidence: numericFilter(minConfidence, 0),
      minLiquidity: numericFilter(minLiquidity, 0),
      status,
      regime,
      sentiment,
      risk,
      sort,
    },
    now,
  );
  const hasDemo = filtered.some((r) => r.presentation.data === 'simulated');
  const hasReal = filtered.some((r) =>
    ['live', 'cached', 'delayed'].includes(r.presentation.data),
  );
  const scalar = (value: number | null) =>
    value === null || !Number.isFinite(value) ? '—' : value;
  return (
    <div className="space-y-4">
      <section className={panelClass} aria-labelledby="reference-market-rates">
        <h2
          id="reference-market-rates"
          className="text-base font-bold text-amber-300"
        >
          Verifizierte Forex-Referenzkurse
        </h2>
        <p className="mt-2 text-xs text-slate-400">
          Quelle: Europäische Zentralbank. Tägliche EUR-Referenzkurse, keine
          Echtzeit- oder Ausführungskurse. Nicht für Scoring oder Rankings
          freigegeben.
        </p>
        {!referenceRates.length ? (
          <p role="status" className="mt-3 text-sm text-slate-400">
            Noch keine replay-verifizierten Referenzkurse verfügbar.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {referenceRates.map((a) => (
              <li
                key={a.id}
                className="flex justify-between gap-3 rounded-lg border border-slate-700 p-3 text-sm"
              >
                <div>
                  <strong>{a.symbol}</strong>
                  <p className="text-xs text-slate-400">
                    Referenzdatum: {a.referenceDate ?? 'Nicht verfügbar'}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-amber-200">{a.value}</p>
                  {a.evidenceId && (
                    <a
                      href={`/api/market/evidence?id=${encodeURIComponent(a.evidenceId)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-cyan-200 underline"
                    >
                      Evidence
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <PrivateByokSpotQuotes />
      <PrivateMarketBatchQuotes />
      <section className={panelClass} aria-label="Screener-Filter">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Screener · Ergebnisse nach Datenqualität prüfen
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(
            [
              ['Symbol oder Name', search, setSearch],
              ['Markt / Handelsplatz', market, setMarket],
              ['Sektor / Kategorie', sector, setSector],
              ['Marktregime', regime, setRegime],
            ] as const
          ).map(([label, value, update]) => (
            <label key={label} className="text-xs text-slate-300">
              {label}
              <input
                className={inputClass + ' mt-1'}
                type="search"
                value={value}
                onChange={(e) => update(e.target.value)}
              />
            </label>
          ))}
          <label className="text-xs text-slate-300">
            Anlageklasse
            <select
              className={inputClass + ' mt-1'}
              value={assetClass}
              onChange={(e) => setAssetClass(e.target.value)}
            >
              <option value="all">Alle neun Klassen</option>
              {PRODUCT_CLASSES.map((id) => (
                <option key={id} value={id}>
                  {ASSET_LABELS[id]}
                </option>
              ))}
            </select>
          </label>
          {(
            [
              ['Score von (0–100)', minScore, setMinScore],
              ['Score bis (0–100)', maxScore, setMaxScore],
              ['Mindestkonfidenz (%)', minConfidence, setMinConfidence],
              [
                'Mindestliquidität (Index 0–100)',
                minLiquidity,
                setMinLiquidity,
              ],
            ] as const
          ).map(([label, value, update]) => (
            <label key={label} className="text-xs text-slate-300">
              {label}
              <input
                type="number"
                min={0}
                max={100}
                className={inputClass + ' mt-1'}
                value={value}
                onChange={(e) => update(e.target.value)}
              />
            </label>
          ))}
          <label className="text-xs text-slate-300">
            Datenstatus
            <select
              className={inputClass + ' mt-1'}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">Alle Zustände</option>
              {Object.entries(DATA_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-300">
            Sentiment-Richtung
            <select
              className={inputClass + ' mt-1'}
              value={sentiment}
              onChange={(e) => setSentiment(e.target.value)}
            >
              <option value="all">Alle Richtungen</option>
              <option value="positive">Positiv</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negativ</option>
              <option value="unavailable">Nicht verfügbar</option>
            </select>
          </label>
          <label className="text-xs text-slate-300">
            Risiko-Flags
            <select
              className={inputClass + ' mt-1'}
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
            >
              <option value="all">Alle</option>
              <option value="flagged">Mit Flags</option>
              <option value="unflagged">Keine Flags im Datensatz</option>
            </select>
          </label>
          <label className="text-xs text-slate-300">
            Sortieren
            <select
              className={inputClass + ' mt-1'}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              {[
                ['finalScore', 'Finaler Score'],
                ['scoreChange', 'Score-Veränderung'],
                ['momentum', 'Momentum'],
                ['sentimentVelocity', 'Sentiment-Geschwindigkeit'],
                ['catalyst', 'Katalysator-Stärke'],
              ].map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p role="status" className="mt-4 text-xs text-slate-400">
          {filtered.length} Ergebnisse · Filter sind über die URL teilbar. Keine
          Speicherung von Nutzerpräferenzen.
        </p>
        {hasDemo && hasReal && (
          <p role="alert" className="mt-3 text-sm text-amber-200">
            DEMO und reale Datensätze sind in dieser Ansicht enthalten.
            Demo-Daten werden nicht gerankt. Nutzen Sie den Datenstatus-Filter.
          </p>
        )}
      </section>
      <div className="overflow-x-auto rounded-2xl border border-slate-700 bg-[#090e21]">
        <table className="w-full min-w-[80rem] text-left text-xs">
          <caption className="p-3 text-left text-sm text-slate-300">
            Multi-Asset-Screener · Scores nur bei erfüllten Eligibility- und
            Evidence-Grenzen
          </caption>
          <thead className="border-b border-slate-600 bg-slate-950 text-slate-300">
            <tr>
              {[
                'Rang',
                'Asset',
                'Anlageklasse',
                'Finaler Score',
                'Konfidenz',
                'Marktregime',
                'Momentum',
                'Sentiment',
                'Katalysator',
                'Liquidität',
                'Risiko-Flags',
                'Datenstatus',
                'Aktualisiert',
                'Details',
              ].map((label) => (
                <th scope="col" className="p-3" key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!filtered.length && (
              <tr>
                <td colSpan={14} className="p-6 text-center text-slate-400">
                  Keine für Score-Rankings zugelassenen Datensätze. Pflichtdaten
                  und Evidence werden nicht durch Referenzkurse oder private
                  Quotes ersetzt.
                </td>
              </tr>
            )}
            {filtered.map(({ item: row, presentation: p }) => (
              <tr key={row.assetId} className="border-b border-slate-800">
                <td className="p-3 font-mono">
                  {p.ranked ? row.rawResult.rank : '—'}
                </td>
                <th scope="row" className="p-3 font-semibold">
                  <span>{row.symbol}</span>
                  <p className="mt-1 font-normal text-slate-400">{row.name}</p>
                </th>
                <td className="p-3">{ASSET_LABELS[row.assetClass]}</td>
                <td className="p-3 text-amber-200">
                  {p.score ?? 'Nicht verfügbar'}
                </td>
                <td className="p-3">
                  {p.score !== null
                    ? `${Math.round(row.rawResult.confidence * 100)}%`
                    : '—'}
                </td>
                <td className="p-3">{row.regime || '—'}</td>
                <td className="p-3">
                  {scalar(row.rawResult.subScores.momentumScore)}
                </td>
                <td className="p-3">
                  {scalar(row.rawResult.subScores.sentimentScore)}
                </td>
                <td className="p-3">
                  {scalar(row.rawResult.subScores.eventScore)}
                </td>
                <td className="p-3">{scalar(row.liquidity)}</td>
                <td className="p-3 text-rose-200">
                  {row.riskFlags.join(', ') || 'Keine Flags übergeben'}
                </td>
                <td className="p-3">
                  <DataStatusBadge mode={p.data} />
                </td>
                <td className="p-3">
                  {new Date(row.rawResult.computedAt).toLocaleString('de-DE')}
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    className={buttonClass}
                    onClick={() => setSelectedResult(row.rawResult)}
                    aria-label={`${row.symbol} Score herleiten`}
                  >
                    Herleitung
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">
        Ein hoher Score beschreibt Modellausrichtung, keine garantierte Rendite.
        Keine Anlageberatung.
      </p>
      <ScoreExplainabilityDrawer
        isOpen={selectedResult !== null}
        onClose={() => setSelectedResult(null)}
        result={selectedResult}
      />
    </div>
  );
};
