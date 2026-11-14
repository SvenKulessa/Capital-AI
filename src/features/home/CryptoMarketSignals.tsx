import { useEffect, useState } from 'react';

type Signal = {
  symbol: string;
  asOf: string;
  score: number;
  signal: 'BUY' | 'SHORT' | 'WATCH';
  setup: { entry: number; invalidation: number; target: number; currency: 'EUR' } | null;
  sentiment: { label: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'; samples: number; model: string } | null;
  sources: { url: string; publishedAt: string }[];
  marketSource: string;
};

type Draft = {
  id: string; digest?: string; expiresAt: string; signals: Signal[]; marketAttribution?: string;
  reviewSources?: { symbol: string; news: { title: string; url: string }[] }[];
};
type Review = { status: string; draft: Draft | null; published: boolean };
const publicPath = '/api/crypto-signals';
const ownerPath = '/api/internal/crypto-signals';
const number = new Intl.NumberFormat('de-DE', { maximumSignificantDigits: 8 });
const date = new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Berlin' });
const signals = { BUY: 'Kauf-Setup', SHORT: 'Short-Setup', WATCH: 'Beobachten' };
const sentiments = { POSITIVE: 'Positiv', NEGATIVE: 'Negativ', NEUTRAL: 'Neutral' };

function Cards({ draft }: { draft: Draft }) {
  return <>
    <p className="mt-2 text-sm text-slate-300">
      Regelbasierte Ausbruchssignale mit KI-Stimmung aus offiziellen Release-Meldungen.
      Der Score beschreibt die Übereinstimmung der Kriterien. Einstiege und Ziele sind Szenarien.
    </p>
    <div className="mt-4 grid gap-3 md:grid-cols-3">{draft.signals.map(item =>
      <article key={item.symbol} className="min-w-0 rounded-2xl border border-slate-700 bg-black/20 p-4">
        <h3 className="font-semibold text-white">{item.symbol} · {signals[item.signal]}</h3>
        <p className="mt-2 text-sm text-cyan-200">Score {item.score}/100</p>
        <p className="mt-1 text-sm text-slate-300">KI-Sentiment{' '}
          {item.sentiment ? sentiments[item.sentiment.label] + ' (' + item.sentiment.samples + ' Meldungen)' : 'offen'}</p>
        {item.setup && <dl className="mt-3 grid grid-cols-2 gap-1 text-sm">
          <dt>Einstieg</dt><dd>{number.format(item.setup.entry)} €</dd>
          <dt>Ungültig ab</dt><dd>{number.format(item.setup.invalidation)} €</dd>
          <dt>Szenarioziel</dt><dd>{number.format(item.setup.target)} €</dd>
        </dl>}
        <p className="mt-3 text-xs text-slate-300">Kursstand <time dateTime={item.asOf}>{date.format(new Date(item.asOf))}</time> (Berlin)</p>
        <ul className="mt-2 space-y-2 text-xs">
          <li><a className="underline" href={item.marketSource}>Marktdaten für {item.symbol}</a></li>
          {item.sources.map(source => <li key={source.url}>
            <a className="underline" href={source.url}>{draft.reviewSources?.find(entry => entry.symbol === item.symbol)?.news.find(news => news.url === source.url)?.title
              ?? 'Offizielle Meldung'} · {date.format(new Date(source.publishedAt))}</a>
          </li>)}
        </ul>
      </article>
    )}</div>
  </>;
}

export function CryptoMarketSignals() {
  const [draft, setDraft] = useState<Draft | null>(null);
  useEffect(() => {
    let active = true;
    let controller: AbortController | undefined;
    const load = async () => {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      try {
        const response = await fetch(publicPath, { signal: current.signal, cache: 'no-store' });
        const value = response.ok ? await response.json() as Draft : null;
        if (active && !current.signal.aborted) setDraft(value);
      } catch {
        if (active && !current.signal.aborted) setDraft(null);
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => { active = false; controller?.abort(); clearInterval(timer); };
  }, []);
  if (!draft || Date.parse(draft.expiresAt) <= Date.now()) return null;
  return <section id="crypto-marktsignale" aria-labelledby="crypto-market-title"
    className="mx-3 my-4 rounded-3xl border border-cyan-400/20 bg-[#071526] p-5 text-slate-100 sm:mx-6">
    <h2 id="crypto-market-title" className="text-xl font-bold">Krypto-Marktsignale</h2>
    <Cards draft={draft} />
    <p className="mt-3 text-xs text-slate-300">Öffentliche Marktanalyse. Kryptowerte können stark schwanken.
      {' '}<a className="underline" href={draft.marketAttribution}>Data provided by CoinGecko</a></p>
  </section>;
}

export function CryptoSignalReview() {
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function load() {
    const response = await fetch(ownerPath, { cache: 'no-store' });
    if (response.status === 404) return setReview(null);
    if (!response.ok) throw Error();
    setReview(await response.json());
  }
  useEffect(() => { void load().catch(() => setError('Krypto-Entwurf konnte nicht geladen werden.')); }, []);
  async function update(action: 'approve' | 'reject') {
    const digest = review?.draft?.digest;
    if (!digest || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(ownerPath, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, digest }),
      });
      if (!response.ok) throw Error();
    } catch { setError('Freigabe oder Rücknahme konnte nicht gespeichert werden. Prüfe den aktuellen Entwurf.'); }
    try { await load(); } catch { setError('Krypto-Entwurf konnte nicht geladen werden.'); }
    finally { setBusy(false); }
  }
  return <section aria-labelledby="crypto-review-title" className="my-5 rounded-2xl border border-slate-700 p-4">
    <h3 id="crypto-review-title" className="text-lg font-semibold">Krypto-Marktsignale prüfen</h3>
    <p className="mt-1 text-sm text-slate-300">Ein freigegebener Entwurf erscheint bis zum nächsten Vier-Stunden-Fenster auf der Startseite.</p>
    {error && <p role="alert" className="mt-2 text-amber-200">{error}</p>}
    {review?.draft
      ? <><Cards draft={review.draft} />
        <p role="status" className="mt-3 text-sm">{review.published ? 'Auf der Startseite sichtbar.' : review.status === 'REJECTED' ? 'Entwurf abgelehnt.' : 'Entwurf zur Prüfung.'}</p>
        <div className="mt-2 flex flex-wrap gap-3">
          {!review.published && <button disabled={busy} className="min-h-11 rounded-lg bg-cyan-900 px-3" onClick={() => void update('approve')}>Für Startseite freigeben</button>}
          {(review.published || review.status !== 'REJECTED') && <button disabled={busy} className="min-h-11 rounded-lg border border-slate-500 px-3" onClick={() => void update('reject')}>{review.published ? 'Veröffentlichung zurücknehmen' : 'Entwurf ablehnen'}</button>}
        </div></>
      : <p role="status" className="mt-2 text-sm">{review?.status === 'WORKFLOW_UNAVAILABLE'
        ? 'Workflow momentan nicht verfügbar.' : review?.status === 'NO_VERIFIED_DATA'
        ? 'Für dieses Fenster fehlen überprüfbare Daten.' : 'Kein prüfbarer Entwurf verfügbar.'}</p>}
    <button className="mt-2 min-h-11 text-sm underline" disabled={busy} onClick={() => {
      setError(''); void load().catch(() => setError('Krypto-Entwurf konnte nicht geladen werden.'));
    }}>Entwurf aktualisieren</button>
  </section>;
}
