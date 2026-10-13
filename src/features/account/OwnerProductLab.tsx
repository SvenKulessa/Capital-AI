import { useEffect, useState } from 'react';
import { FlaskConical, ShieldCheck, LockKeyhole } from 'lucide-react';

type LabProduct = { id: string; label: string; kind: 'subscription' | 'payment'; replicaAvailable: boolean; selected: boolean };
type Lab = { mode: 'production' | 'test'; selected: string[]; stripeTestConfigured: boolean; stripeLiveReadConfigured: boolean; products: LabProduct[] };
type Result = { sku: string; completed: boolean; productionEntitlementGranted: false };
const messages: Record<string, string> = {
  owner_required: 'Nur der verifizierte Owner darf den Testbereich benutzen.',
  owner_testlab_storage_not_configured: 'Privater Testlabor-Speicher ist nicht konfiguriert.',
  owner_testlab_upstream_unavailable: 'Testlabor-Speicher oder Stripe sind momentan nicht erreichbar.',
  stripe_test_keys_not_configured: 'Der Stripe-Testschlüssel fehlt im privaten Backend.',
  test_replica_missing: 'Für dieses Produkt fehlt eine Test-Replik.',
  test_replica_price_mismatch: 'Die Test-Replik stimmt nicht mit dem Live-Preis überein.',
  live_catalog_mismatch: 'Der Live-Preis konnte nicht sicher abgeglichen werden.',
  not_your_test_session: 'Diese Testsession gehört nicht zu deinem Konto.',
};
async function call(path: string, method = 'GET', data?: object, signal?: AbortSignal) {
  const res = await fetch('/api/owner/product-lab' + path, {
    method, credentials: 'same-origin', cache: 'no-store',
    headers: { Accept: 'application/json', ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {}), signal,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) throw Error(payload?.error || 'unavailable');
  return payload;
}
function friendly(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  return messages[code] || 'Aktion fehlgeschlagen. Produktionsdaten bleiben unverändert.';
}

/** Visible to verified owner only. All routes also enforce server-side IAM. */
export function OwnerProductLab() {
  const [lab, setLab] = useState<Lab | null>(null);
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const state = await call('', 'GET', undefined, controller.signal) as Lab;
        if (controller.signal.aborted) return;
        setLab(state);
        const url = new URL(window.location.href);
        if (url.searchParams.get('testlab') === 'cancelled') setNotice('Stripe-Testcheckout abgebrochen.');
        if (url.searchParams.get('testlab') === 'success' && url.searchParams.has('session_id')) {
          const id = url.searchParams.get('session_id') || '';
          const verified = await call('/checkout-result?session_id=' + encodeURIComponent(id), 'GET', undefined, controller.signal) as Result;
          if (!controller.signal.aborted) {
            setResult(verified);
            setNotice(verified.completed
              ? 'Stripe bestätigt deinen Testkauf. Es wurden keine produktiven Berechtigungen erteilt.'
              : 'Testcheckout noch nicht erfolgreich abgeschlossen.');
          }
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(friendly(cause));
      } finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, []);
  const save = async (mode: Lab['mode'], selected: string[]) => {
    if (!lab || busy) return;
    setBusy('save'); setError(''); setNotice('');
    try {
      setLab(await call('/configuration', 'POST', { mode, selected }) as Lab);
      setNotice('Deine private Owner-Auswahl wurde gespeichert.');
    } catch (cause) { setError(friendly(cause)); }
    finally { setBusy(''); }
  };
  const createReplica = async (sku: string) => {
    if (!lab || busy) return;
    setBusy(sku); setError(''); setNotice('');
    try {
      setLab(await call('/replica', 'POST', { sku }) as Lab);
      setNotice('Stripe-Test-Replik eingerichtet. Live-Produkte sind unverändert.');
    } catch (cause) { setError(friendly(cause)); }
    finally { setBusy(''); }
  };
  const checkout = async (sku: string) => {
    if (!lab || busy) return;
    setBusy(sku); setError(''); setNotice('');
    try {
      const session = await call('/checkout', 'POST', { sku }) as { mode: string; url: string };
      const target = new URL(session.url);
      if (session.mode !== 'test' || target.protocol !== 'https:' ||
          target.hostname !== 'checkout.stripe.com') throw Error('invalid_test_checkout');
      window.location.assign(target.href);
    } catch (cause) { setError(friendly(cause)); setBusy(''); }
  };
  return (
    <section aria-labelledby="owner-product-lab" className="mt-4 space-y-4 rounded-2xl border border-rose-400/30 bg-[#110b19] p-4 sm:p-5 md:col-span-3">
      <div className="flex items-start gap-3">
        <FlaskConical className="mt-1 h-6 w-6 shrink-0 text-rose-300" aria-hidden="true" />
        <div>
          <h2 id="owner-product-lab" className="text-lg font-bold text-white">Owner · Stripe-Produkt-Testlabor</h2>
          <p className="mt-1 text-sm leading-6 text-slate-300">Nur für dich: Testprodukte auswählen,
            Zahlungsflüsse durchspielen und Stripe-Testkäufe prüfen – ohne Live-Zahlungen umzuschalten.</p>
        </div>
      </div>
      {loading && <p role="status" className="text-sm text-slate-200">Verifizierte Testlabor-Daten werden geladen …</p>}
      {error && <p role="alert" className="rounded-lg border border-rose-400/40 p-3 text-sm text-rose-100">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-400/40 p-3 text-sm text-emerald-100">{notice}</p>}
      {result && <p role="status" className="text-sm text-white">Stripe-Testkauf {result.sku}:
        {result.completed ? ' bestätigt' : ' nicht abgeschlossen'}. Live-Berechtigungen unverändert.</p>}
      {lab && (
        <>
          <fieldset className="space-y-2">
            <legend className="text-sm font-bold">Meine Ansicht auswählen</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['production', 'test'] as const).map(mode => (
                <button key={mode} type="button" aria-pressed={lab.mode === mode}
                  disabled={Boolean(busy)} onClick={() => void save(mode, lab.selected)}
                  className={'min-h-12 rounded-xl border px-3 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-amber-200 disabled:opacity-50 ' +
                    (lab.mode === mode ? 'border-rose-300 bg-rose-800/40 text-white' : 'border-white/25 bg-slate-900 text-slate-200')}>
                  {mode === 'production' ? 'Produktion ansehen' : 'Stripe-Testmodus'}
                </button>
              ))}
            </div>
          </fieldset>
          <p className="flex items-start gap-2 text-xs leading-5 text-slate-300">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
            {lab.mode === 'production'
              ? 'Read-only Live-Ansicht. Der echte Checkout bleibt für alle Kunden unverändert.'
              : 'Testprodukte: Kein echtes Geld, kein produktives Abo und keine Änderung fremder Konten.'}
          </p>
          {!lab.stripeTestConfigured && <p role="status" className="rounded-lg border border-amber-300/40 p-3 text-sm text-amber-100">
            Testprodukte auswählen ist möglich. Für echte Stripe-Testkäufe fehlt noch der private
            Backend-Schlüssel. Niemals einen Schlüssel in dieses Formular eingeben.</p>}
          <h3 className="font-semibold text-white">Produkt-Repliken durch Auswahl aktivieren</h3>
          <div className="space-y-2">
            {lab.products.map(product => {
              const selected = lab.selected.includes(product.id);
              const testing = lab.mode === 'test';
              return (
                <div key={product.id} className="flex flex-col gap-2 rounded-xl border border-white/15 bg-slate-950/75 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{product.label}</p>
                    <p className="text-xs text-slate-300">{product.kind === 'subscription' ? 'Abonnement' : 'Einmalkauf'} ·
                      {product.replicaAvailable ? ' Testpreis vorhanden' : ' Replik fehlt'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" aria-pressed={selected}
                      aria-label={product.label + (selected ? ' abwählen' : ' für Tests auswählen')}
                      disabled={!testing || Boolean(busy)}
                      onClick={() => void save(lab.mode, selected
                        ? lab.selected.filter(id => id !== product.id)
                        : [...lab.selected, product.id])}
                      className={'min-h-11 rounded-lg border px-3 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-amber-200 disabled:opacity-50 ' +
                        (selected ? 'border-rose-300 bg-rose-900/50 text-white' : 'border-white/25 bg-slate-900 text-slate-100')}>
                      {selected ? 'Ausgewählt' : 'Auswählen'}
                    </button>
                    {testing && selected && !product.replicaAvailable &&
                      <button type="button" disabled={Boolean(busy) || !lab.stripeTestConfigured || !lab.stripeLiveReadConfigured}
                        onClick={() => void createReplica(product.id)}
                        className="min-h-11 rounded-lg border border-amber-300/50 px-3 py-2 text-sm text-amber-100 disabled:opacity-50">Replik anlegen</button>}
                    {testing && selected && product.replicaAvailable &&
                      <button type="button" disabled={Boolean(busy) || !lab.stripeTestConfigured || !lab.stripeLiveReadConfigured}
                        onClick={() => void createReplica(product.id)}
                        className="min-h-11 rounded-lg border border-amber-300/40 px-3 py-2 text-xs text-amber-100 disabled:opacity-50">Replik prüfen</button>}
                    {testing && selected && product.replicaAvailable &&
                      <button type="button" disabled={Boolean(busy) || !lab.stripeTestConfigured || !lab.stripeLiveReadConfigured}
                        onClick={() => void checkout(product.id)}
                        className="min-h-11 rounded-lg bg-rose-300 px-3 py-2 text-sm font-bold text-black disabled:opacity-50">Testkauf</button>}
                  </div>
                </div>
              );
            })}
            {lab.mode === 'test' && !lab.selected.length &&
              <p role="status" className="text-sm text-slate-300">Noch keine Produkte ausgewählt.</p>}
          </div>
          <div className="flex gap-2 rounded-lg border border-white/15 p-3 text-xs leading-5 text-slate-300">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>Alle Auswahl-/Replikationsaktionen sind serverseitig an deine Owner-Identität gebunden.
              Testzahlungen erteilen keine produktiven Rechte. Pro-/Enterprise-Featuretests
              werden anschließend getrennt mit isolierten Testberechtigungen geprüft.</p>
          </div>
        </>
      )}
    </section>
  );
}
