import React, { useCallback, useEffect, useState } from 'react';
import { FileDown, LockKeyhole, ShoppingCart } from 'lucide-react';

type Offer = { sku: 'CAP-BP-001' | 'CAP-BP-002'; name: string; version: string; amountCents: number; currency: string; taxBehavior: string };
type Entitlement = { sku: string; version: string; purchasedAt: string; licenseVersion: string };
type OfferResponse = { checkoutEnabled: boolean; licenseVersion: string; products: Offer[] };
const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200';

/** Only public-safe product metadata is sent to browsers. Proprietary files remain server-side. */
export function BlueprintCommercePanel({ onNavigateLogin }: { onNavigateLogin?: () => void }) {
  const [offers, setOffers] = useState<OfferResponse | null>(null);
  const [access, setAccess] = useState<Entitlement[]>([]);
  const [loggedOut, setLoggedOut] = useState(false);
  const [licenseeName, setLicenseeName] = useState('');
  const [licenseAccepted, setLicenseAccepted] = useState(false);
  const [immediateDeliveryConsent, setImmediateDeliveryConsent] = useState(false);
  const [withdrawalLossAcknowledged, setWithdrawalLossAcknowledged] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [offerResponse, accessResponse] = await Promise.all([
        fetch('/api/billing/blueprints/offer', { credentials: 'same-origin', cache: 'no-store' }),
        fetch('/api/billing/blueprints/access', { credentials: 'same-origin', cache: 'no-store' }),
      ]);
      if (!offerResponse.ok) throw new Error('Angebote derzeit nicht abrufbar.');
      const offerJson = await offerResponse.json() as OfferResponse;
      if (!Array.isArray(offerJson.products) || offerJson.products.length !== 2) throw new Error('Produktkatalog unvollständig.');
      setOffers(offerJson);
      setLoggedOut(accessResponse.status === 401);
      if (accessResponse.ok) {
        const entitlementData = await accessResponse.json() as { purchases?: Entitlement[] };
        setAccess(Array.isArray(entitlementData.purchases) ? entitlementData.purchases : []);
      } else {
        setAccess([]);
        if (accessResponse.status !== 401) throw new Error('Kaufberechtigungen derzeit nicht abrufbar.');
      }
      setNotice('');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Angebote derzeit nicht abrufbar.'); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function buy(sku: Offer['sku']) {
    if (!offers?.checkoutEnabled || busy) return;
    setBusy(sku);
    setNotice('');
    try {
      const response = await fetch('/api/billing/blueprints/checkout', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, licenseeName: licenseeName.trim(), licenseVersion: offers.licenseVersion,
          licenseAccepted, immediateDeliveryConsent, withdrawalLossAcknowledged }),
      });
      const payload = await response.json() as { checkoutUrl?: string; error?: string };
      if (!response.ok || !payload.checkoutUrl) throw new Error(payload.error || 'Checkout derzeit nicht verfügbar.');
      const checkout = new URL(payload.checkoutUrl);
      if (checkout.protocol !== 'https:' || checkout.hostname !== 'checkout.stripe.com') throw new Error('Ungültige Checkout-Adresse.');
      window.location.assign(checkout.href);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Checkout derzeit nicht verfügbar.'); }
    finally { setBusy(null); }
  }

  return (
    <section aria-labelledby="capital-blueprint-shop-heading" className="rounded-2xl border border-cyan-400/30 bg-[#0b1830] p-5 text-white">
      <div className="flex items-start gap-3">
        <ShoppingCart className="mt-1 shrink-0 text-cyan-200" size={24} aria-hidden="true" />
        <div>
          <h3 id="capital-blueprint-shop-heading" className="text-xl font-bold">Screener Component Blueprints kaufen</h3>
          <p className="mt-2 text-sm leading-6 text-slate-200">Technische Architekturkonzepte, jeweils als versioniertes Markdown-Dokument. Kein ausführbarer Produktionscode, keine Provider-/Marktdatenrechte, keine Anlageratschläge.</p>
          <p className="mt-2 text-sm font-medium text-amber-200">50,00 € je Dokument zuzüglich gegebenenfalls anfallender Steuer. Der endgültige Gesamtpreis wird vor Zahlung im Stripe-Checkout angezeigt.</p>
        </div>
      </div>
      {notice && <p role="alert" className="mt-3 rounded-lg border border-amber-400/40 p-3 text-sm text-amber-100">{notice}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void refresh()} className={`min-h-11 rounded-lg border border-cyan-400/50 px-4 py-2 text-sm font-semibold text-cyan-100 ${focus}`}>Zugriff neu prüfen</button>
        <a href="/api/billing/blueprints/license" target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 items-center rounded-lg border border-slate-500 px-4 py-2 text-sm font-semibold ${focus}`}>Unternehmenslizenz v1.0.0 lesen</a>
        {loggedOut && <button type="button" onClick={onNavigateLogin} className={`min-h-11 rounded-lg border border-slate-500 px-4 py-2 text-sm ${focus}`}>Anmelden</button>}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {offers?.products.map(item => {
          const entitled = access.some(a => a.sku === item.sku && a.version === item.version);
          return <article key={item.sku} className="flex flex-col rounded-xl border border-slate-700 bg-slate-950/70 p-4">
            <p className="text-xs font-semibold tracking-wide text-cyan-200">{item.sku} · v{item.version}</p>
            <h4 className="mt-1 text-lg font-semibold">{item.name}</h4>
            <p className="mt-2 text-xl font-bold tabular-nums">50,00 € <span className="text-xs font-normal text-slate-300">netto · Einmalkauf</span></p>
            <p className="mt-2 flex-1 text-sm text-slate-300">Unbefristete interne Unternehmensnutzung und eigene Software-/Kundenprojekte. Keine Weitergabe oder Vermarktung der Blueprint-Originaldatei.</p>
            {entitled ? <a className={`mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-950/30 px-3 py-2 font-semibold text-emerald-100 ${focus}`}
                href={`/api/billing/blueprints/download/${item.sku}`}><FileDown size={18} aria-hidden="true" /> Gekauftes Dokument laden</a> :
              <button type="button" disabled={!offers.checkoutEnabled || loggedOut || !!busy || licenseeName.trim().length < 2 || !licenseAccepted || !immediateDeliveryConsent || !withdrawalLossAcknowledged}
                onClick={() => void buy(item.sku)} className={`mt-4 min-h-11 rounded-lg bg-cyan-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 ${focus}`}>
                {busy === item.sku ? 'Checkout wird vorbereitet…' : !offers.checkoutEnabled ? 'Kauf derzeit nicht freigeschaltet' : 'Weiter zum sicheren Checkout'}
              </button>}
          </article>;
        })}
      </div>
      <div className="mt-5 space-y-3 rounded-xl border border-slate-700 p-4">
        <label htmlFor="blueprint-licensee-name" className="block text-sm font-semibold">Lizenznehmer: vollständiger Unternehmensname</label>
        <input id="blueprint-licensee-name" type="text" autoComplete="organization" maxLength={160} value={licenseeName} onChange={e => setLicenseeName(e.target.value)}
          placeholder="Rechtliche Firma / Lizenznehmer" className={`min-h-11 w-full rounded-lg border border-slate-500 bg-slate-950 px-3 text-white placeholder:text-slate-400 ${focus}`} />
        <label className="flex min-h-11 items-start gap-3 text-sm leading-6"><input className="mt-1 h-5 w-5 shrink-0 accent-cyan-400" type="checkbox" checked={licenseAccepted} onChange={e => setLicenseAccepted(e.target.checked)} /><span>Ich habe die <a className="underline underline-offset-2" href="/api/billing/blueprints/license" target="_blank" rel="noopener noreferrer">Unternehmenslizenz v1.0.0</a> gelesen und akzeptiere sie für den angegebenen Lizenznehmer.</span></label>
        <label className="flex min-h-11 items-start gap-3 text-sm leading-6"><input className="mt-1 h-5 w-5 shrink-0 accent-cyan-400" type="checkbox" checked={immediateDeliveryConsent} onChange={e => setImmediateDeliveryConsent(e.target.checked)} /><span>Ich stimme ausdrücklich zu, dass CAPITAL AI bereits vor Ablauf einer etwaigen Widerrufsfrist mit der Bereitstellung des digitalen Dokuments beginnt.</span></label>
        <label className="flex min-h-11 items-start gap-3 text-sm leading-6"><input className="mt-1 h-5 w-5 shrink-0 accent-cyan-400" type="checkbox" checked={withdrawalLossAcknowledged} onChange={e => setWithdrawalLossAcknowledged(e.target.checked)} /><span>Mir ist bekannt, dass ich bei Erfüllung der gesetzlichen Voraussetzungen durch Beginn der Bereitstellung mein gesetzliches Widerrufsrecht verlieren kann. Gesetzliche Verbraucherrechte bleiben im Übrigen unberührt.</span></label>
        <div className="flex items-start gap-2 text-xs leading-5 text-slate-300"><LockKeyhole size={16} className="mt-0.5 shrink-0" aria-hidden="true" /><p>Der Download ist nur nach bestätigter Zahlung im angemeldeten Konto verfügbar. Zahlung, Steuer, Widerruf und digitale Bereitstellung unterliegen den angezeigten Vertragsbedingungen. Ohne Freigabe findet kein Checkout statt.</p></div>
      </div>
    </section>
  );
}
