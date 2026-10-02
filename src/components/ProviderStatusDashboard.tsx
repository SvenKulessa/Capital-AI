import React from 'react';
import { MarketStatusSchema } from '../../shared/market-contracts.mjs';
import { useMarketAssets } from '../services/marketDataStore';
import { researchProviders } from '../data/researchLicenses';
export interface ProviderStatusDashboardProps { onBackToHome?: () => void; onNavigateArchitecture?: () => void; onNavigateLogin?: () => void; isStandaloneView?: boolean; }
export const ProviderStatusDashboard: React.FC<ProviderStatusDashboardProps> = ({ onBackToHome }) => {
 const assets = useMarketAssets();
 const [status, setStatus] = React.useState<ReturnType<typeof MarketStatusSchema.parse> | null>(null);
 React.useEffect(() => {
  let stopped = false; const controller = new AbortController();
  async function poll() { try { const r = await fetch('/api/market/status', { cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]) }); if (!r.ok) throw new Error(); const body = MarketStatusSchema.parse(await r.json()); if (!stopped) setStatus(body); } catch { if (!stopped) setStatus(null); } }
  void poll(); const timer = setInterval(() => void poll(), 10000);
  return () => { stopped = true; controller.abort(); clearInterval(timer); };
 }, []);
 return <section className="rounded-3xl bg-[#091129] border border-slate-800 p-5 text-white">
 <button onClick={onBackToHome} className="text-amber-300 text-sm">Zurück</button><h2 className="font-bold text-xl mt-2">Data &amp; Providers</h2>
 <dl className="grid grid-cols-2 gap-3 my-4"><dt>Redis</dt><dd>{status?.infrastructure?.redis ?? 'unavailable'}</dd><dt>NATS JetStream</dt><dd>{status?.infrastructure?.nats ?? 'unavailable'}</dd><dt>Gesamtzustand</dt><dd>{status?.infrastructure?.status ?? 'unavailable'}</dd><dt>Belegte Quotes</dt><dd>{assets.length}</dd></dl>
 <p className="text-sm text-slate-400">Status wird vom Backend abgefragt. Ohne bestätigte Provider-Facts werden keine Preise oder gemessenen Latenzen angezeigt.</p>
 <section aria-labelledby="provider-license-heading" className="mt-5 rounded-2xl border border-amber-500/30 bg-[#090e21] p-4">
   <h3 id="provider-license-heading" className="font-bold text-amber-300">Datenlizenzen & Forschungsbedingungen</h3>
   <p className="mt-2 text-xs text-slate-400">Verfügbarkeit und Nutzungsrechte werden getrennt geprüft. Dieser Dokumentationsstand aktiviert keine Datenfeeds.</p>
   <ul className="my-3 text-sm space-y-2">{researchProviders.map(provider => <li key={provider.id}>{provider.name} · <span className="text-amber-200">{provider.status}</span></li>)}</ul>
   <a href="/datenprovider-lizenzen" className="text-cyan-300 underline">Quellen, Bedingungen und druckbaren Prüfbericht ansehen</a>
 </section>
 <ul className="mt-4 space-y-3">{assets.map(asset => {
   const observedAt = asset.observedAt;
   const evidenceId = asset.evidenceId;
   return <li key={asset.id} className="border-t border-slate-700 pt-3"><strong>{asset.symbol}: {asset.value}</strong><p className="text-xs text-slate-400">{asset.provider ?? 'Provider nicht verfügbar'} · {asset.dataAvailability ?? 'unavailable'} · {typeof observedAt === 'number' ? new Date(observedAt).toLocaleString('de-DE') : 'Zeitstempel nicht verfügbar'}</p>{typeof evidenceId === 'string' && evidenceId.length > 0 && <a className="text-xs text-cyan-300 break-all" href={`/api/market/evidence?id=${encodeURIComponent(evidenceId)}`} target="_blank" rel="noreferrer">Evidence prüfen</a>}</li>;
 })}</ul>
 </section>;
};
