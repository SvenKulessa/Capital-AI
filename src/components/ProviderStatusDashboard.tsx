import React from 'react';
import { MarketStatusSchema } from '../../shared/market-contracts.mjs';
import { useMarketAssetCatalog, useMarketAssets } from '../services/marketDataStore';
import { providerLicenseReviews } from '../data/providerLicenseReview';

export interface ProviderStatusDashboardProps {
  onBackToHome?: () => void;
  onNavigateArchitecture?: () => void;
  onNavigateLogin?: () => void;
  isStandaloneView?: boolean;
}

export const ProviderStatusDashboard: React.FC<ProviderStatusDashboardProps> = ({ onBackToHome }) => {
  const assets = useMarketAssets();
  const catalog = useMarketAssetCatalog();
  const deliveryBySymbol = new Map(assets.map(asset => [asset.symbol, asset]));
  const [status, setStatus] = React.useState<ReturnType<typeof MarketStatusSchema.parse> | null>(null);

  React.useEffect(() => {
    let stopped = false;
    const controller = new AbortController();
    async function poll() {
      try {
        const r = await fetch('/api/market/status', {
          cache: 'no-store',
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]),
        });
        if (!r.ok) throw new Error();
        const body = MarketStatusSchema.parse(await r.json());
        if (!stopped) setStatus(body);
      } catch {
        if (!stopped) setStatus(null);
      }
    }
    void poll();
    const timer = setInterval(() => void poll(), 10000);
    return () => {
      stopped = true;
      controller.abort();
      clearInterval(timer);
    };
  }, []);

  return <section className="rounded-3xl bg-[#091129] border border-slate-800 p-5 text-white">
    <button onClick={onBackToHome} className="text-amber-300 text-sm">Zurück</button>
    <h2 className="font-bold text-xl mt-2">Data &amp; Providers</h2>

    <dl className="grid grid-cols-2 gap-3 my-4">
      <dt>Redis</dt><dd>{status?.infrastructure?.redis ?? 'unavailable'}</dd>
      <dt>NATS JetStream</dt><dd>{status?.infrastructure?.nats ?? 'unavailable'}</dd>
      <dt>Gesamtzustand</dt><dd>{status?.infrastructure?.status ?? 'unavailable'}</dd>
      <dt>Zugelassene Assets</dt><dd>{catalog.assets.length}</dd>
      <dt>Quote-Runtime</dt><dd>{catalog.quotesEnabled ? 'aktiviert' : 'deaktiviert'}</dd>
      <dt>Belegte Quotes</dt><dd>{assets.length}</dd>
    </dl>

    <p className="text-sm text-slate-400">
      Asset-Identität und Quote-Verfügbarkeit sind getrennt. Die Website zeigt nur zugelassene Instrumente;
      Preise erscheinen ausschließlich mit bestätigtem Provider-Fact und Evidence.
    </p>

    <section aria-labelledby="provider-license-heading" className="mt-5 rounded-2xl border border-amber-500/30 bg-[#090e21] p-4">
      <h3 id="provider-license-heading" className="font-bold text-amber-300">Datenlizenzen &amp; kommerzielle Nutzungsrechte</h3>
      <p className="mt-2 text-xs text-slate-400">
        Verfügbarkeit und Nutzungsrechte werden getrennt geprüft. Dieser Dokumentationsstand aktiviert keine Datenfeeds.
      </p>
      <ul className="my-3 text-sm space-y-2">
        {providerLicenseReviews.map(provider =>
          <li key={provider.id}>{provider.name} · <span className="text-amber-200">{provider.status}</span></li>)}
      </ul>
      <a href="/datenprovider-lizenzen" className="text-cyan-300 underline">
        Quellen, Bedingungen und druckbaren Prüfbericht ansehen
      </a>
    </section>

    <section aria-labelledby="market-assets-heading" className="mt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="market-assets-heading" className="font-bold text-lg">Zugelassene Market Assets</h3>
        <span className="text-xs text-slate-400">Keine synthetische Coverage</span>
      </div>
      {catalog.assets.length === 0
        ? <p className="mt-3 text-sm text-slate-400">Kein zugelassener Asset-Katalog verfügbar.</p>
        : <ul className="mt-3 divide-y divide-slate-800 border-y border-slate-800">
            {catalog.assets.map(asset => {
              const delivery = deliveryBySymbol.get(asset.symbol);
              return <li key={asset.instrumentId} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <strong>{asset.symbol} · {asset.name}</strong>
                  <span className="text-xs text-amber-200">
                    {asset.timeSemantics === 'reference' ? 'Daily Reference' : 'Realtime'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {asset.provider} · {asset.venue} · {asset.sourceAdmission}
                </p>
                {delivery
                  ? <>
                      <p className="mt-1 text-sm">{delivery.value} · {delivery.dataAvailability}</p>
                      <p className="text-xs text-slate-400">
                        {delivery.observedAt === undefined
                          ? 'Zeitpunkt nicht verfügbar'
                          : new Date(delivery.observedAt).toLocaleString('de-DE')}
                      </p>
                      {delivery.evidenceId &&
                        <a
                          className="text-xs text-cyan-300 break-all"
                          href={`/api/market/evidence?id=${encodeURIComponent(delivery.evidenceId)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Evidence prüfen
                        </a>}
                    </>
                  : <p className="mt-1 text-xs text-slate-400">
                      {asset.runtimeEnabled
                        ? 'Runtime zugelassen; aktuell kein replay-verifizierter Quote verfügbar.'
                        : 'Asset zugelassen; Quote-Runtime bleibt fail-closed deaktiviert.'}
                    </p>}
              </li>;
            })}
          </ul>}
    </section>
  </section>;
};
