import React from 'react';

type Provider = 'kraken' | 'binance';
type PrivateQuote = {
  provider: Provider;
  symbol: string;
  price: number;
  quote: string;
  observedAt: number;
  dataScope: 'USER_PRIVATE_MARKET_DATA';
  mode: 'rest' | 'websocket';
};

const PROVIDERS: ReadonlyArray<{ provider: Provider; symbol: string; label: string }> = [
  { provider: 'kraken', symbol: 'BTCUSD', label: 'Bitcoin / USD' },
  { provider: 'binance', symbol: 'BTCUSDT', label: 'Bitcoin / USDT' },
];
const QUERY_ENDPOINT = '/api/profile/provider-query';

// A user-private snapshot is deliberately NOT combined with useMarketAssets(), global cache,
// public screeners, scores or executable signals. No user API key ever enters this component.
function isPrivateQuote(value: unknown, provider: Provider, symbol: string, mode: 'rest' | 'websocket'): value is PrivateQuote {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return row.provider === provider && row.symbol === symbol && row.mode === mode &&
    row.dataScope === 'USER_PRIVATE_MARKET_DATA' &&
    typeof row.price === 'number' && Number.isFinite(row.price) && row.price > 0 &&
    typeof row.quote === 'string' && /^[A-Z0-9]{3,6}$/.test(row.quote) &&
    typeof row.observedAt === 'number' && Number.isSafeInteger(row.observedAt) &&
    row.observedAt <= Date.now() + 5000 && row.observedAt >= Date.now() - 30_000;
}

export const PrivateByokSpotQuotes: React.FC = () => {
  const [connected, setConnected] = React.useState<Provider[]>([]);
  const [loadingConnections, setLoadingConnections] = React.useState(true);
  const [pending, setPending] = React.useState<Provider | null>(null);
  const [quotes, setQuotes] = React.useState<Partial<Record<Provider, PrivateQuote>>>({});
  const [message, setMessage] = React.useState('');
  const alive = React.useRef(true);
  const activeRequest = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    void fetch('/api/profile/provider-connections', {
      credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' },
      signal: controller.signal,
    }).then(async response => response.ok ? response.json() : null)
      .then(body => {
        if (!alive.current || controller.signal.aborted) return;
        const rows: unknown[] = Array.isArray(body?.connections) ? body.connections : [];
        setConnected(PROVIDERS.filter(spec => rows.some(row => {
          if (!row || typeof row !== 'object') return false;
          const conn = row as Record<string, unknown>;
          return conn.provider === spec.provider && conn.status === 'VERIFIED' &&
            conn.dataScope === 'USER_PRIVATE_ACCOUNT_DATA';
        })).map(p => p.provider));
      })
      .catch(() => { if (alive.current && !controller.signal.aborted) setMessage('Private Providerverbindungen derzeit nicht abrufbar.'); })
      .finally(() => { if (alive.current && !controller.signal.aborted) setLoadingConnections(false); });
    return () => {
      alive.current = false;
      controller.abort();
      activeRequest.current?.abort();
    };
  }, []);

  async function requestQuote(provider: Provider, symbol: string, mode: 'rest' | 'websocket') {
    if (pending || !connected.includes(provider)) return;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(provider);
    setMessage('');
    // Prevent exposing older snapshots after an unsuccessful new private request.
    setQuotes(prev => ({ ...prev, [provider]: undefined }));
    try {
      const response = await fetch(QUERY_ENDPOINT, {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ provider, operation: mode === 'rest' ? 'market.spot_trade' : 'market.spot_ws_snapshot', params: { symbol } }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12_000)]),
      });
      if (response.status === 429) throw new Error('PROVIDER_QUOTA');
      if (!response.ok) throw new Error('PRIVATE_PROVIDER_UNAVAILABLE');
      const body: unknown = await response.json();
      if (!body || typeof body !== 'object') throw new Error('PRIVATE_RESPONSE_INVALID');
      const envelope = body as Record<string, unknown>;
      if (envelope.dataScope !== 'USER_PRIVATE_MARKET_DATA' ||
          envelope.publicDisplayAllowed !== false ||
          envelope.redistributionAllowed !== false ||
          envelope.sharedCacheAllowed !== false ||
          envelope.jetStreamPublicationAllowed !== false ||
          envelope.executionEnabled !== false ||
          !isPrivateQuote(envelope.data, provider, symbol, mode)) {
        throw new Error('PRIVATE_RESPONSE_INVALID');
      }
      if (alive.current && !controller.signal.aborted) setQuotes(prev => ({ ...prev, [provider]: envelope.data as PrivateQuote }));
    } catch (error) {
      if (alive.current && !controller.signal.aborted) {
        setMessage(error instanceof Error && error.message === 'PROVIDER_QUOTA'
          ? 'Provider-Limit erreicht. Bitte erst später erneut abfragen.'
          : 'Privater Kurs derzeit nicht verfügbar. Vault-Verbindung und privaten Providerdienst prüfen.');
      }
    } finally {
      if (alive.current && !controller.signal.aborted) setPending(null);
    }
  }

  return (
    <section aria-labelledby="private-byok-rates" className="rounded-2xl bg-[#090e21] border border-slate-800 p-4 text-white">
      <h2 id="private-byok-rates" className="font-bold text-base text-cyan-300">Meine privaten Spot-Kurse</h2>
      <p className="mt-1 text-xs text-slate-400">
        Nur mit eigener verifizierter Provider-Vault. Kursabrufe erfolgen auf Knopfdruck,
        nutzergebunden und ohne gemeinsame Marktveröffentlichung. Keine Scores oder Handelskurse.
      </p>
      {loadingConnections ? (
        <p role="status" className="mt-3 text-sm text-slate-400">Private Verbindungen werden geprüft …</p>
      ) : connected.length === 0 ? (
        <p role="status" className="mt-3 text-sm text-slate-400">
          Keine verifizierte private Binance- oder Kraken-Verbindung verfügbar.
          Melden Sie sich an und richten Sie Ihren persönlichen API-Key im Profil ein.
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PROVIDERS.filter(spec => connected.includes(spec.provider)).map(spec => {
            const quote = quotes[spec.provider];
            return (
              <li key={spec.provider} className="border border-slate-700 rounded-lg p-3">
                <p className="text-sm font-semibold">{spec.label}</p>
                <p className="text-xs text-slate-400">{spec.provider.toUpperCase()} · {spec.symbol} · nur privat</p>
                {quote && (
                  <div className="mt-2" aria-live="polite">
                    <p className="font-mono text-amber-200">{quote.price.toLocaleString('de-DE', { maximumFractionDigits: 8 })} {quote.quote}</p>
                    <p className="text-xs text-slate-400">
                      {quote.mode === 'websocket' ? 'WebSocket' : 'REST'} · Börsenzeit: {new Date(quote.observedAt).toLocaleTimeString('de-DE')}
                    </p>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={pending !== null}
                    onClick={() => void requestQuote(spec.provider,spec.symbol,'rest')}
                    className="px-3 py-2 rounded-md border border-cyan-500/50 text-xs text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-50 disabled:cursor-not-allowed">
                    {pending === spec.provider ? 'Abfrage läuft …' : 'REST-Kurs abrufen'}
                  </button>
                  <button type="button" disabled={pending !== null}
                    onClick={() => void requestQuote(spec.provider,spec.symbol,'websocket')}
                    className="px-3 py-2 rounded-md border border-slate-500 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed">
                    WS-Momentaufnahme
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {message && <p role="status" className="mt-3 text-xs text-amber-200">{message}</p>}
      <p className="mt-3 text-[11px] text-slate-500">Kein automatisches Polling. Eventuelle API-Limits und Gebühren trägt das jeweilige Providerkonto.</p>
    </section>
  );
};
