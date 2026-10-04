/**
 * CAPITAL AI — ENTERPRISE SCORER DASHBOARD (PART 3)
 * Interactive multi-asset scorer presenting the 50 Market Intelligence components
 * with verifiable confidence, eligibility hard gates, and 1-click explainability.
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Zap,
  Cpu,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Info,
  Clock,
  Layers,
  Sparkles,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import { motion } from 'motion/react';
import { FinalRankResult, AssetIdentity } from '../contracts/canonicalContracts';
import { ScoringEngineService } from '../services/scoringEngine';
import { FeatureStoreService } from '../services/featureStore';
import { ProviderAdapterRegistry } from '../services/providerAdapters';
import { ScoreExplainabilityDrawer } from './ScoreExplainabilityDrawer';

export interface EnterpriseScorerDashboardProps {
  onSelectAsset?: (symbol: string) => void;
}

interface PrivatePortfolioHolding {
  asset: string;
  balance: string;
}

interface PrivatePortfolioContext {
  provider: 'kraken';
  dataScope: 'USER_PRIVATE_ACCOUNT_DATA';
  holdings: PrivatePortfolioHolding[];
}

const PRESET_ASSETS: AssetIdentity[] = [
  { assetId: 'ast_aapl', symbol: 'AAPL', name: 'Apple Inc.', assetClass: 'equity_us', venue: 'NASDAQ', currency: 'USD', status: 'active' },
  { assetId: 'ast_btc', symbol: 'BTCUSDT', name: 'Bitcoin / Tether', assetClass: 'crypto', venue: 'BINANCE', currency: 'USDT', status: 'active' },
  { assetId: 'ast_eth', symbol: 'ETH', name: 'Ethereum', assetClass: 'crypto', venue: 'BINANCE', currency: 'USDT', status: 'active' },
  { assetId: 'ast_sap', symbol: 'SAP', name: 'SAP SE', assetClass: 'equity_eu', venue: 'XETRA', currency: 'EUR', status: 'active' },
  { assetId: 'ast_nvda', symbol: 'NVDA', name: 'NVIDIA Corp.', assetClass: 'equity_us', venue: 'NASDAQ', currency: 'USD', status: 'active' },
  { assetId: 'ast_gold', symbol: 'GOLD', name: 'Gold Spot', assetClass: 'commodities', venue: 'LBMA', currency: 'USD', status: 'active' },
];

export const EnterpriseScorerDashboard: React.FC<EnterpriseScorerDashboardProps> = ({ onSelectAsset }) => {
  const [selectedAsset, setSelectedAsset] = useState<AssetIdentity>(PRESET_ASSETS[0]);
  const [activeResult, setActiveResult] = useState<FinalRankResult | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const requestId = React.useRef(0);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [privatePortfolioContext, setPrivatePortfolioContext] = useState<PrivatePortfolioContext | null>(null);
  const [privateContextStatus, setPrivateContextStatus] = useState<'LOADING' | 'VERIFIED' | 'UNAVAILABLE'>('LOADING');
  const dataMode: 'LIVE' | 'DEMO' = 'LIVE';

  const featureStore = new FeatureStoreService();
  const providerRegistry = React.useMemo(() => new ProviderAdapterRegistry(), []);

  const computeAssetScore = async (asset: AssetIdentity, isDemo: boolean) => {
    const currentRequest = ++requestId.current;
    setActiveResult(null);
    setIsDrawerOpen(false);
    setScoreError(null);
    setIsLoading(true);
    try {
      const adapter = providerRegistry.getAdapterForAsset(asset.assetClass);
      const rawObs = await adapter.fetchObservation(asset);
      const features = featureStore.extractFeatures({ asset, observation: rawObs });
      const res = await ScoringEngineService.computeFinalScore(asset, features, isDemo);
      if (currentRequest === requestId.current) setActiveResult(res);
    } catch (e) {
      if (currentRequest === requestId.current) setScoreError('Keine zugelassene Open-Data-Quelle. Kein verifizierter Score.');
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    computeAssetScore(selectedAsset, false);
    return () => { requestId.current++; };
  }, [selectedAsset, dataMode]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/profile/provider-connections/kraken/balance', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async response => {
        if (response.status === 401 || response.status === 404) return null;
        if (!response.ok) throw new Error('PRIVATE_CONTEXT_UNAVAILABLE');
        return response.json();
      })
      .then(payload => {
        if (controller.signal.aborted) return;
        if (
          payload?.provider === 'kraken' &&
          payload?.dataScope === 'USER_PRIVATE_ACCOUNT_DATA' &&
          Array.isArray(payload?.holdings)
        ) {
          setPrivatePortfolioContext({
            provider: 'kraken',
            dataScope: 'USER_PRIVATE_ACCOUNT_DATA',
            holdings: payload.holdings,
          });
          setPrivateContextStatus('VERIFIED');
        } else {
          setPrivatePortfolioContext(null);
          setPrivateContextStatus('UNAVAILABLE');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setPrivatePortfolioContext(null);
          setPrivateContextStatus('UNAVAILABLE');
        }
      });
    return () => controller.abort();
  }, []);

  const selectedPrivateHolding = privatePortfolioContext?.holdings.find(holding => {
    const asset = holding.asset.toUpperCase().replace(/^X|^Z/, '');
    const symbol = selectedAsset.symbol.toUpperCase();
    return symbol.startsWith(asset) || asset.startsWith(symbol.replace(/USD[T]?$/, ''));
  }) ?? null;

  return (
    <div className="space-y-6">
      {/* Top Banner & Asset Quick Selector */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0d1633] via-[#090e21] to-[#070b19] border border-amber-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-1">
              <Cpu className="w-4 h-4" />
              <span>ENTERPRISE MULTI-FAKTOR SCORING ENGINE • 50 KOMPONENTEN</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Enterprise Scorer &amp; Explainability Hub
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Multi-Asset-Analyse mit expliziter Trennung zwischen Börsen-Fakten,
              abgeleiteten Merkmalen und mathematischen Modell-Inferenzen.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Live / Demo Mode Switcher */}
            <div className="p-1 rounded-xl bg-black/60 border border-slate-800 flex items-center">
<span className="px-3 py-1.5 text-xs text-slate-400">Open Data · Source Admission erforderlich</span>
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-cyan-300" />
              <span className="text-[11px] font-black uppercase tracking-wider text-cyan-200">
                Privater Portfolio-Kontext
              </span>
            </div>
            <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold ${
              privateContextStatus === 'VERIFIED'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-700 bg-slate-900 text-slate-500'
            }`}>
              {privateContextStatus === 'VERIFIED' ? 'KRAKEN · USER_PRIVATE_ACCOUNT_DATA' : 'NICHT VERBUNDEN'}
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            Der persönliche Kraken-Bestand ergänzt die Nutzer-/Portfolio-Perspektive. Er wird nicht als
            öffentliche Marktpreisquelle, nicht als Fundamentals-Quelle und nicht zur Umgehung der MARKET-Source-Admission verwendet.
          </p>
          {selectedPrivateHolding && (
            <p className="mt-2 font-mono text-[11px] text-cyan-300">
              Persönlicher Bestand zum ausgewählten Asset: {selectedPrivateHolding.asset} · {selectedPrivateHolding.balance}
            </p>
          )}
        </div>

        {/* Quick Asset Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {PRESET_ASSETS.map((asset) => {
            const isSel = selectedAsset.assetId === asset.assetId;
            return (
              <button
                key={asset.assetId}
                type="button"
                onClick={() => {
                  setSelectedAsset(asset);
                  onSelectAsset?.(asset.symbol);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                  isSel
                    ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                    : 'bg-[#090e21] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                }`}
              >
                <span>{asset.symbol}</span>
                <span className={`text-[10px] ${isSel ? 'text-black/80' : 'text-slate-400'}`}>
                  {asset.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {scoreError && <p role="alert" className="text-sm text-amber-300">{scoreError}</p>}
      {/* Main Score & Driver Card */}
      {activeResult && activeResult.assetId === selectedAsset.assetId && activeResult.isDemo === (false) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Card (Left 2 Columns) */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-[#090e21] border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-4">
                <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-[#0d1633] to-black border border-amber-500/40 min-w-[110px] shadow-lg">
                  <div className="text-[10px] font-mono uppercase text-slate-400">Final Rank Score</div>
                  <div className={`${activeResult.finalScore === null ? 'text-base' : 'text-4xl'} font-extrabold font-mono text-amber-400 mt-1`}>
                    {activeResult.finalScore ?? 'Nicht verfügbar'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">Skala 0-100</div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">
                      {selectedAsset.name} ({selectedAsset.symbol})
                    </h3>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        activeResult.isDemo
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {activeResult.dataAvailability.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span
                      className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${
                        activeResult.eligibility
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                      }`}
                    >
                      {activeResult.eligibility ? '✓ ELIGIBLE (Gate Bestanden)' : '🚫 INELIGIBLE (Hard Veto)'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Konfidenz: <span className="text-cyan-400 font-bold">{Math.round(activeResult.confidence * 100)}%</span>
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Risiko-Abzug: <span className="text-rose-400 font-bold">{activeResult.finalScore === null ? 'Nicht verfügbar' : `-${activeResult.riskPenalty} Pkt.`}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Explainability Trigger Button */}
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 shrink-0"
              >
                <span>Score herleiten</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Drivers: Top Positive & Top Negative */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-black/40 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>Top 3 Positive Treiber</span>
                </div>
                <div className="space-y-2">
                  {activeResult.topPositiveDrivers.slice(0, 3).map((d, i) => (
                    <div key={i} className="text-xs p-2.5 rounded-lg bg-[#090e21] border border-slate-800/80">
                      <div className="font-bold text-white flex justify-between">
                        <span>{d.nameDe}</span>
                        <span className="font-mono text-emerald-400">+{d.contributionScore} Pkt.</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{d.evidenceSummary}</div>
                    </div>
                  ))}
                  {activeResult.topPositiveDrivers.length === 0 && (
                    <div className="text-xs text-slate-500 italic p-2">Keine überdurchschnittlichen positiven Treiber.</div>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-rose-400 font-mono flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  <span>Risiko-Faktoren &amp; Abzüge</span>
                </div>
                <div className="space-y-2">
                  {activeResult.topNegativeDrivers.slice(0, 3).map((d, i) => (
                    <div key={i} className="text-xs p-2.5 rounded-lg bg-[#090e21] border border-slate-800/80">
                      <div className="font-bold text-white flex justify-between">
                        <span>{d.nameDe}</span>
                        <span className="font-mono text-rose-400">{d.contributionScore} Pkt.</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{d.evidenceSummary}</div>
                    </div>
                  ))}
                  {activeResult.topNegativeDrivers.length === 0 && (
                    <div className="text-xs text-slate-500 italic p-2">Keine verifizierte Risikobewertung verfügbar.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Subscore Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2 border-t border-slate-800">
              {[
                { label: 'Momentum', val: activeResult.subScores.momentumScore },
                { label: 'Technik', val: activeResult.subScores.technicalScore },
                { label: 'Fundamental', val: activeResult.subScores.fundamentalScore },
                { label: 'Sentiment', val: activeResult.subScores.sentimentScore },
                { label: 'Event', val: activeResult.subScores.eventScore },
                { label: 'Positioning', val: activeResult.subScores.positioningScore },
              ].map((s) => (
                <div key={s.label} className="p-2 rounded-lg bg-black/30 text-center">
                  <div className="text-[10px] font-mono text-slate-400">{s.label}</div>
                  <div className="text-sm font-bold font-mono text-white mt-0.5">{s.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Model Version & Evidence Metadata */}
          <div className="p-6 rounded-2xl bg-[#090e21] border border-slate-800 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                  Audit-Trail Metadaten
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  Nicht verifiziert
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between p-2 rounded bg-black/40">
                  <span className="text-slate-400">Modellversion:</span>
                  <span className="text-white font-bold">{activeResult.modelVersion}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-black/40">
                  <span className="text-slate-400">Regime:</span>
                  <span className="text-cyan-300 font-bold">Nicht verfügbar</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-black/40">
                  <span className="text-slate-400">Plausibilität:</span>
                  <span className="text-emerald-400 font-bold">{activeResult.resultStatus}</span>
                </div>
                <div className="p-2 rounded bg-black/40">
                  <div className="text-slate-400 mb-1">Evidence-Referenz (unverifiziert):</div>
                  <div className="text-[10px] text-cyan-300 break-all select-all">
                    {activeResult.evidenceId}
                  </div>
                </div>
              </div>
            </div>

            {/* Legal Notice */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
              <span className="font-bold text-slate-300">Hinweis: </span>
              Scores drücken die relative Modellausrichtung aus und begründen keine Rendite-Zusicherung oder Anlageberatung.
            </div>
          </div>
        </div>
      )}

      {/* Drawer */}
      <ScoreExplainabilityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        result={activeResult?.assetId === selectedAsset.assetId && activeResult.isDemo === (false) ? activeResult : null}
      />
    </div>
  );
};
