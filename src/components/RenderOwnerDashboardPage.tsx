import { useEffect, useState } from 'react';
import { Activity, KeyRound, Loader2, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react';
import { AccountPageShell } from '../features/account/AccountPageShell';

type Provider = {
  id: string; label: string;
  status: 'CONFIGURED_UNVERIFIED' | 'NOT_CONFIGURED';
  verificationAvailable: boolean;
};
type Snapshot = { symbol: string; close: number; observedAt: string; timeSemantics: string };
type Dashboard = {
  private: boolean;
  providers: Provider[];
  sampleSymbols: { symbol: string; label: string }[];
};
const path = '/api/profile/render-owner-dashboard';

async function readJson(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(response.status === 429 ? 'Wartezeit zwischen Prüfungen: 60 Sekunden.' : 'Readback nicht verfügbar oder nicht berechtigt.');
  return body;
}

export function RenderOwnerDashboardPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState('');
  const [results, setResults] = useState<Record<string, string>>({});
  const [sample, setSample] = useState<Snapshot | null>(null);
  const [symbol, setSymbol] = useState('X:BTCUSD');

  useEffect(() => {
    const controller = new AbortController();
    fetch(path, {
      method: 'GET', credentials: 'same-origin', cache: 'no-store',
      headers: { Accept: 'application/json' }, signal: controller.signal,
    }).then(readJson).then(value => {
      if (!controller.signal.aborted && value?.private === true) setData(value as Dashboard);
    }).catch(() => {
      if (!controller.signal.aborted) setError('Das private Owner-Dashboard ist nicht freigeschaltet oder nicht erreichbar.');
    });
    return () => controller.abort();
  }, []);

  async function action(endpoint: 'probe' | 'sample', provider: string) {
    setPending(endpoint + ':' + provider);
    setError('');
    try {
      const result = await readJson(await fetch(path + '/' + endpoint, {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ provider, ...(endpoint === 'sample' ? { symbol } : {}) }),
      }));
      if (endpoint === 'probe') {
        setResults(previous => ({ ...previous, [provider]: result.status === 'REFERENCE_VERIFIED' ? 'Referenzzugriff bestätigt; Datenrechte separat prüfen' : 'Nicht verifiziert' }));
      } else setSample(result as Snapshot);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Verbindung nicht nachgewiesen.');
    } finally { setPending(''); }
  }

  const configured = data?.providers.filter(provider => provider.status === 'CONFIGURED_UNVERIFIED').length ?? 0;
  return (
    <AccountPageShell
      active="/profile/render-dashboard"
      title="Privates Provider-Dashboard"
      description="Exklusiver, serverseitig autorisierter Zugriff auf deine Render-Providerkonfiguration."
      onNavigate={onNavigate}
    >
      {() => (
        <div className="space-y-5">
          <section className="rounded-2xl border border-amber-400/25 bg-[#070b19] p-4 sm:p-5">
            <div className="flex items-center gap-2 font-bold text-amber-200">
              <LockKeyhole className="h-5 w-5" aria-hidden="true" /> Owner Private / Render
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Die Provider-Schlüssel bleiben ausschließlich in der Render-Serverumgebung.
              Im Browser werden weder Schlüssel noch Token, Secrets oder Zugangsdaten übertragen.
              Providerprüfungen werden nur über einen bewussten Klick ausgelöst.
            </p>
            <p className="mt-2 text-xs text-amber-100">
              Provideranfragen können Quotas oder nutzungsabhängige Kosten verursachen.
              Eine Referenzprüfung ist kein Nachweis kommerzieller Datenrechte oder Live-Kursberechtigung.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">Konfigurierte bekannte Provider</div>
                <div className="mt-1 text-2xl font-black tabular-nums">{data ? configured : '–'}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">Trading / automatische Abfragen</div>
                <div className="mt-1 text-sm font-bold text-amber-200">Deaktiviert</div>
              </div>
            </div>
          </section>
          {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</p>}
          {!data && !error && <p role="status" className="flex items-center gap-2 text-slate-300"><Loader2 className="h-4 w-4 animate-spin" /> Zugang wird geprüft …</p>}
          {data && (
            <>
              <section aria-label="Providerstatus" className="grid gap-3 sm:grid-cols-2">
                {data.providers.map(provider => (
                  <article key={provider.id} className="rounded-xl border border-white/10 bg-[#070b19] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-sm font-bold text-white">{provider.label}</h2>
                      <span className="text-xs text-slate-300">
                        {provider.status === 'CONFIGURED_UNVERIFIED' ? 'In Render hinterlegt · ungeprüft' : 'Kein bekanntes Env-Binding'}
                      </span>
                    </div>
                    {results[provider.id] && <p role="status" className="mt-2 flex gap-2 text-xs text-emerald-200">
                      <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" /> {results[provider.id]}
                    </p>}
                    {provider.verificationAvailable && provider.status === 'CONFIGURED_UNVERIFIED' && (
                      <button type="button" disabled={!!pending}
                        onClick={() => void action('probe', provider.id)}
                        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-400/30 px-3 text-xs font-semibold text-amber-200 disabled:opacity-50">
                        {pending === 'probe:' + provider.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Read-only-Zugriff prüfen
                      </button>
                    )}
                  </article>
                ))}
              </section>
              <section className="rounded-2xl border border-white/10 bg-[#070b19] p-4 sm:p-5" aria-label="Private Marktdatenprobe">
                <h2 className="flex items-center gap-2 text-sm font-bold"><Activity className="h-4 w-4 text-amber-300" /> Private Massive-Datenprobe</h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  Nur Vortagesdaten, keine Live-Kurse. Keine automatische Aktualisierung, keine geteilten Caches oder öffentlichen Marktdaten-Events.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <label htmlFor="owner-sample-symbol" className="sr-only">Instrument</label>
                  <select id="owner-sample-symbol" value={symbol} onChange={event => { setSymbol(event.target.value); setSample(null); }}
                    className="min-h-11 flex-1 rounded-xl border border-white/15 bg-slate-900 px-3 text-sm text-white">
                    {data.sampleSymbols.map(item => <option key={item.symbol} value={item.symbol}>{item.label}</option>)}
                  </select>
                  <button type="button" disabled={!!pending || !data.providers.some(item => item.id === 'massive' && item.status === 'CONFIGURED_UNVERIFIED')}
                    onClick={() => void action('sample', 'massive')}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-xs font-bold text-black disabled:opacity-50">
                    {pending === 'sample:massive' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Vortageskurs abrufen
                  </button>
                </div>
                {sample && <div role="status" className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                  <span className="font-bold">{sample.symbol}</span>
                  <span className="ml-3 tabular-nums">{sample.close.toLocaleString('de-DE')}</span>
                  <span className="ml-3 text-xs text-slate-400">Vortag · {new Date(sample.observedAt).toLocaleString('de-DE')}</span>
                </div>}
              </section>
              <button type="button" onClick={() => onNavigate('/profile/workspace')}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-xs font-semibold text-slate-200">
                <KeyRound className="h-4 w-4" aria-hidden="true" /> Zu Analyse-Modulzuordnungen
              </button>
              <p className="text-xs text-slate-400">
                Bestehende nutzergebundene Vault-Zuordnungen sind vom Render-Owner-Profil getrennt.
                Andere Provider werden nur hinsichtlich bekannter Env-Namen erfasst; ihre Readbacks sind noch nicht implementiert.
              </p>
            </>
          )}
        </div>
      )}
    </AccountPageShell>
  );
}
