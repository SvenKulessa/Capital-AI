import React from 'react';
import type { MarketAsset } from '../types';
import { useMarketAssets } from '../services/marketDataStore';
import { DataUnavailable } from './DataUnavailable';
export const AssetDetailModal: React.FC<{ asset: MarketAsset | null; onClose: () => void; onOpenAllAlerts?: () => void }> = ({ asset, onClose }) => {
 const assets = useMarketAssets();
 if (!asset) return null;
 const current = assets.find(value => value.id === asset.id);
 const observedAt = current?.observedAt;
 const evidenceId = current?.evidenceId;
 return <div role="dialog" aria-modal="true" aria-label={asset.name} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"><div className="w-full max-w-lg rounded-3xl bg-[#070e22] border border-slate-700 p-6 text-white">
  <button onClick={onClose} aria-label="Schließen" className="float-right">✕</button><h2 className="text-xl font-bold">{asset.name}</h2><p className="text-slate-400">{asset.symbol}</p>
  <p className="mt-4 text-2xl text-amber-300">{current?.value ?? 'Daten nicht verfügbar'}</p>
  {current && <><p className="text-sm mt-3">{current.provider ?? 'Provider nicht verfügbar'} · {current.dataAvailability ?? 'unavailable'} · {typeof observedAt === 'number' ? new Date(observedAt).toLocaleString('de-DE') : 'Zeitstempel nicht verfügbar'}</p>{typeof evidenceId === 'string' && evidenceId.length > 0 && <a className="text-xs break-all text-cyan-300" href={`/api/market/evidence?id=${encodeURIComponent(evidenceId)}`} target="_blank" rel="noreferrer">Evidence prüfen</a>}</>}
  <DataUnavailable title="Analyse" required="Historie, Fundamentals, Sentiment und Risikoprüfung" />
 </div></div>;
};
