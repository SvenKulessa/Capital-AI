/**
 * CAPITAL AI — ENTERPRISE SCREENER TABLE (PART 3)
 * Full cross-sectional screener table with all 13 canonical columns, multi-parameter filters,
 * eligibility sorting discipline, and 1-click explainability drawer inspection.
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronDown,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  Layers,
  Sparkles,
  Info,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { FinalRankResult, AssetIdentity } from '../../contracts/canonicalContracts';
import { ScoreExplainabilityDrawer } from './ScoreExplainabilityDrawer';
import { useMarketAssets } from '../../services/marketDataStore';
import { PrivateMarketBatchQuotes } from './PrivateMarketBatchQuotes';
import { PrivateByokSpotQuotes } from './PrivateByokSpotQuotes';

export interface ScreenerRowItem {
  assetId: string;
  symbol: string;
  name: string;
  assetClass: 'equity_us' | 'equity_eu' | 'crypto' | 'forex' | 'commodities';
  sector: string;
  finalScore: number;
  eligibility: boolean;
  confidence: number;
  regime: string;
  subScores: {
    momentum: number;
    sentiment: number;
    catalyst: number;
    liquidity: number;
  };
  riskFlag: 'CLEAN' | 'WARNING' | 'VETO_BLOCKED';
  dataStatus: 'LIVE' | 'DELAYED' | 'DEMO';
  lastUpdated: string;
  evidenceId: string;
  rawResult: FinalRankResult;
}

const INITIAL_SCREENER_ITEMS: ScreenerRowItem[] = [];

export const ScreenerTable: React.FC = () => {
  const [items] = useState<ScreenerRowItem[]>(INITIAL_SCREENER_ITEMS);
  const referenceRates = useMarketAssets().filter(asset => asset.timeSemantics === 'reference' && asset.dataAvailability === 'reference');
  const [search, setSearch] = useState('');
  const [assetClassFilter, setAssetClassFilter] = useState<string>('ALL');
  const [minConfidence, setMinConfidence] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'finalScore' | 'momentum' | 'catalyst'>('finalScore');
  const [selectedResult, setSelectedResult] = useState<FinalRankResult | null>(null);

  // Filtered and sorted rows
  const filteredRows = useMemo(() => {
    return items
      .filter((it) => {
        if (search && !it.symbol.toLowerCase().includes(search.toLowerCase()) && !it.name.toLowerCase().includes(search.toLowerCase())) {
          return false;
        }
        if (assetClassFilter !== 'ALL' && it.assetClass !== assetClassFilter) return false;
        if (it.confidence * 100 < minConfidence) return false;
        if (statusFilter !== 'ALL' && it.dataStatus !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        // MANDATORY RULE: Ineligible assets sort to the bottom regardless of score
        if (!a.eligibility && b.eligibility) return 1;
        if (a.eligibility && !b.eligibility) return -1;

        if (sortBy === 'finalScore') return b.finalScore - a.finalScore;
        if (sortBy === 'momentum') return b.subScores.momentum - a.subScores.momentum;
        if (sortBy === 'catalyst') return b.subScores.catalyst - a.subScores.catalyst;
        return 0;
      });
  }, [items, search, assetClassFilter, minConfidence, statusFilter, sortBy]);

  return (
    <div className="space-y-4">
      <section aria-labelledby="reference-market-rates" className="rounded-2xl bg-[#090e21] border border-slate-800 p-4 text-white">
        <h2 id="reference-market-rates" className="font-bold text-base text-amber-300">Verifizierte Forex-Referenzkurse</h2>
        <p className="text-xs text-slate-400 mt-1">
          Quelle: Europäische Zentralbank. Tägliche EUR-Referenzkurse, keine Echtzeit- oder Ausführungskurse.
          Die Werte sind nicht für Ranking, Scoring oder Handelsentscheidungen freigegeben.
        </p>
        {referenceRates.length === 0 ? (
          <p role="status" className="mt-3 text-sm text-slate-400">Noch keine replay-verifizierten Referenzkurse verfügbar.</p>
        ) : (
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {referenceRates.map(asset => (
              <li key={asset.id} className="flex items-center justify-between gap-3 border border-slate-700 rounded-lg p-3 text-sm">
                <div>
                  <strong className="font-mono">{asset.symbol}</strong>
                  <p className="text-xs text-slate-400">Referenzdatum: {asset.referenceDate ?? 'Nicht verfügbar'}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-amber-200">{asset.value}</p>
                  {asset.evidenceId && (
                    <a href={`/api/market/evidence?id=${encodeURIComponent(asset.evidenceId)}`}
                      target="_blank" rel="noreferrer"
                      className="text-xs text-cyan-300 underline">Evidence</a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <PrivateByokSpotQuotes />
      <PrivateMarketBatchQuotes />
      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-[#090e21] border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Symbol oder Name suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Asset Class Filter */}
          <select
            value={assetClassFilter}
            onChange={(e) => setAssetClassFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-black/40 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="ALL">Alle Anlageklassen</option>
            <option value="equity_us">US Aktien</option>
            <option value="equity_eu">EU Aktien</option>
            <option value="crypto">Krypto</option>
            <option value="forex">Forex</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-black/40 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="ALL">Status: Alle</option>
            <option value="LIVE">Nur LIVE Feeds</option>
            <option value="DEMO">Daten nicht verfügbar</option>
          </select>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400">Sortierung:</span>
          <button
            type="button"
            onClick={() => setSortBy('finalScore')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              sortBy === 'finalScore' ? 'bg-amber-400 text-black font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Final Score
          </button>
          <button
            type="button"
            onClick={() => setSortBy('momentum')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              sortBy === 'momentum' ? 'bg-amber-400 text-black font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Momentum
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl bg-[#090e21] border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c1433] text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Rang</th>
                <th className="py-3 px-3">Asset</th>
                <th className="py-3 px-3">Klasse</th>
                <th className="py-3 px-3 text-right">Final Score</th>
                <th className="py-3 px-3">Gate</th>
                <th className="py-3 px-3">Konfidenz</th>
                <th className="py-3 px-3">Markt-Regime</th>
                <th className="py-3 px-3 text-center">Mom.</th>
                <th className="py-3 px-3 text-center">Sent.</th>
                <th className="py-3 px-3 text-center">Katalysator</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRows.length === 0 && (
                <tr><td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                  Keine für Score-Rankings zugelassenen Datensätze. Fehlende Fundamentaldaten und
                  Scoring-Evidence werden nicht durch Referenzkurse ersetzt.
                </td></tr>
              )}
              {filteredRows.map((row, idx) => (
                <tr
                  key={row.assetId}
                  onClick={() => setSelectedResult(row.rawResult)}
                  className={`hover:bg-slate-800/40 transition-colors cursor-pointer ${
                    !row.eligibility ? 'opacity-60 bg-rose-950/10' : ''
                  }`}
                >
                  <td className="py-3 px-3 font-mono font-bold text-slate-400">
                    {row.eligibility ? `#${idx + 1}` : '—'}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>{row.symbol}</span>
                      <span className="text-[10px] font-normal text-slate-400 hidden sm:inline">
                        {row.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-400 font-mono text-[11px] uppercase">
                    {row.assetClass}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-extrabold text-sm">
                    <span className={row.eligibility ? 'text-amber-400' : 'text-slate-500'}>
                      {row.finalScore}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {row.eligibility ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Bestanden
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        VETO
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-cyan-300">
                    {Math.round(row.confidence * 100)}%
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    {row.regime}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-300">
                    {row.subScores.momentum}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-300">
                    {row.subScores.sentiment}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-300">
                    {row.subScores.catalyst}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold ${
                        row.dataStatus === 'LIVE'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : row.dataStatus === 'DELAYED'
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'bg-purple-500/15 text-purple-300'
                      }`}
                    >
                      {row.dataStatus}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      className="p-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono flex items-center gap-1 ml-auto cursor-pointer"
                      title="Score detailliert herleiten"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Explainability Drawer */}
      <ScoreExplainabilityDrawer
        isOpen={selectedResult !== null}
        onClose={() => setSelectedResult(null)}
        result={selectedResult}
      />
    </div>
  );
};
