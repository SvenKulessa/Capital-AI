import React from 'react';
const CLASSES = [
  ['KRYPTO', 'Krypto · Kraken'], ['AKTIEN', 'Aktien · Massive'],
  ['INDIZIES', 'Indizes · Massive'], ['FOREX', 'Forex · Massive'],
  ['ROHSTOFFE', 'Rohstoff-Futures · Massive'],
] as const;
type Category = (typeof CLASSES)[number][0];
type Asset = { symbol: string; name: string; price: number; quote: string | null;
  observedAt: number | null; timeSemantics: string; instrumentType: string;
  priceUnit?: string; settlementDate?: string | null };
type Batch = { provider: string; category: Category; assets: Asset[];
  receivedAt: number; expiresAt: number; returned: number; shortfall: number };
export function PrivateMarketBatchQuotes() {
  const [category, setCategory] = React.useState<Category>('KRYPTO');
  const [batch, setBatch] = React.useState<Batch | null>(null);
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const active = React.useRef<AbortController | null>(null);
  React.useEffect(() => {
    const clear = () => { if (document.visibilityState !== 'visible') {
      active.current?.abort(); setBatch(null); setPending(false);
    } };
    document.addEventListener('visibilitychange', clear);
    return () => { active.current?.abort(); document.removeEventListener('visibilitychange', clear); };
  }, []);
  React.useEffect(() => {
    if (!batch) return;
    const timer = window.setTimeout(() => setBatch(null), Math.max(0, batch.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [batch]);
  async function load() {
    const controller = new AbortController(); active.current?.abort(); active.current = controller;
    setPending(true); setBatch(null); setMessage('');
    const provider = category === 'KRYPTO' ? 'kraken' : 'massive';
    try {
      const response = await fetch('/api/profile/provider-query', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, operation: 'market.asset_class_snapshot', params: { category } }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]),
      });
      const envelope = await response.json();
      if (response.status === 429) throw new Error('API-Limit erreicht. Bitte nach einer Minute erneut abrufen.');
      if (!response.ok) throw new Error(response.status === 401
        ? 'Bitte anmelden, um eigene Providerdaten abzurufen.'
        : envelope.code === 'PRIVATE_MARKET_ENTITLEMENT_REQUIRED'
          ? 'Der Provider-Tarif erlaubt diesen Snapshot nicht. Bitte den eigenen Datenvertrag prüfen.'
          : 'Die private Verbindung ist noch nicht bereit. Bitte den Provider im Key Vault verbinden.');
      const value = envelope.data;
      if (envelope.provider !== provider || envelope.dataScope !== 'USER_PRIVATE_MARKET_DATA'
        || envelope.publicDisplayAllowed !== false || envelope.sharedCacheAllowed !== false
        || envelope.jetStreamPublicationAllowed !== false || envelope.redistributionAllowed !== false
        || value?.provider !== provider || value?.category !== category || !Array.isArray(value.assets)
        || value.assets.length > 50 || value.returned !== value.assets.length
        || value.shortfall !== 50 - value.assets.length || !Number.isSafeInteger(value.expiresAt)
        || !Number.isSafeInteger(value.receivedAt) || value.receivedAt > Date.now()
        || value.expiresAt <= Date.now() || value.expiresAt > value.receivedAt + 30000
        || value.assets.some((a: Record<string, unknown>) => !a || a.provider !== provider
          || a.category !== category || typeof a.symbol !== 'string' || typeof a.name !== 'string'
          || typeof a.price !== 'number' || !Number.isFinite(a.price) || a.price <= 0
          || a.dataScope !== 'USER_PRIVATE_MARKET_DATA'
          || a.observedAt !== null && (!Number.isSafeInteger(a.observedAt)
            || Number(a.observedAt) > value.receivedAt + 5000))) {
        throw new Error('Private Daten konnten nicht sicher geprüft werden.');
      }
      if (!controller.signal.aborted && document.visibilityState === 'visible') setBatch(value);
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'Abruf nicht verfügbar.');
    } finally { if (!controller.signal.aborted) setPending(false); }
  }
  return <section aria-label="Private Assetklassen-Snapshots" className="rounded-xl border border-amber-400/20 bg-slate-950/80 p-4">
    <h2 className="font-bold text-amber-200">Eigene Marktdaten · bis zu 50 Werte je Klasse</h2>
    <p className="mt-1 text-xs text-slate-400">Nur für dein Konto. Kein automatisches Polling.
      Tarif, Verzögerung und API-Limits deines Providers gelten. Anzeige und verschlüsselter Cache verfallen nach 30 Sekunden.</p>
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <label className="text-sm text-slate-200">Assetklasse <select value={category} disabled={pending}
        onChange={e => { active.current?.abort(); setBatch(null); setMessage(''); setCategory(e.target.value as Category); }}
        className="ml-2 rounded border border-slate-700 bg-slate-900 p-2">
        {CLASSES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select></label>
      <button type="button" disabled={pending} onClick={() => void load()}
        className="rounded bg-amber-400 px-3 py-2 text-sm font-bold text-black disabled:opacity-50">
        {pending ? 'Wird abgerufen …' : 'Privat abrufen'}
      </button>
    </div>
    {message && <p role="status" className="mt-3 text-sm text-amber-200">{message}</p>}
    {batch && <div className="mt-3">
      <p role="status" className="text-sm text-slate-300">{batch.returned}/50 Werte geliefert
        {batch.shortfall > 0 ? ` · ${batch.shortfall} fehlen im aktuellen Abruf` : ''}.
        {category === 'ROHSTOFFE' ? ' Terminkontrakte mit eigener Laufzeit; keine Zählung als 50 verschiedene Rohstoffe.' : ''}</p>
      <div className="mt-2 overflow-x-auto"><table className="w-full text-left text-xs text-slate-300">
        <caption className="sr-only">Private {category}-Snapshots</caption>
        <thead><tr><th scope="col" className="p-2">Instrument</th><th scope="col" className="p-2">Wert / Einheit</th>
          <th scope="col" className="p-2">Quellzeitpunkt</th></tr></thead>
        <tbody>{batch.assets.map(a => <tr key={a.symbol} className="border-t border-slate-800">
          <th scope="row" className="p-2 font-normal">{a.name} · {a.symbol}
            {a.settlementDate ? ` · ${a.settlementDate}` : ''}</th>
          <td className="p-2">{a.price.toLocaleString('de-DE', { maximumSignificantDigits: 10 })} {a.priceUnit || a.quote || 'Indexpunkte'}</td>
          <td className="p-2">{a.observedAt ? new Date(a.observedAt).toLocaleString('de-DE') : 'Vom Provider nicht geliefert'}
            {a.timeSemantics === 'delayed' ? ' · verzögert' : ''}</td>
        </tr>)}</tbody>
      </table></div>
    </div>}
  </section>;
}
