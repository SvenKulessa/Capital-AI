/**
 * ============================================================================
 * [ARCHITEKTUR-MAPPING: PRODUCTION PRICING]
 * ----------------------------------------------------------------------------
 * User-Surface zeigt ausschließlich Produkte und Preise aus dem aktuellen
 * Stripe-/Billing-Katalog. Spekulative B2B-, Affiliate-, Revenue- und
 * Compliance-Modelle gehören nicht in die Production-Preisliste.
 * ============================================================================
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'motion/react';
import { LearningPurchase } from '../learning/LearningPurchase';
import { CheckoutPaymentHelp } from './CheckoutPaymentHelp';
import { BrandLogo } from '../../components/BrandLogo';
import {
  PRICING_CATALOG,
  annualDiscountPercent,
  displayPriceEur,
} from '../../data/pricingCatalog';
import { ADDITIONAL_PRODUCTS_CATALOG } from '../../data/additionalProductsCatalog';
import { INITIAL_COMMERCE_STATE, readCommerceState } from './commerceState';
import { BENCHMARK_TIERS } from '../../../packages/benchmark-core/index.mjs';

interface MonetizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateLogin?: () => void;
  onNavigate?: (path: string) => void;
  onOpenWhaleRadar?: () => void;
}

type BillingCycle = 'monthly' | 'annual';
type PricingTab = 'plans' | 'products';

const CADS_CAPABILITY_LABELS: Record<string, string> = {
  standardProfiles: 'CADS Standardprofile',
  history: 'Historische Vergleiche',
  regressionDetection: 'Regression Detection',
  evidenceExport: 'Evidence Export',
  customProfiles: 'Custom Profiles',
  customThresholds: 'Custom Thresholds',
  enforcedPrGate: 'Enforced PR Gate',
  api: 'CADS API',
  selfHostedRunner: 'Self-hosted Runner',
};

function cadsFeaturesForTier(tier: 'starter' | 'pro' | 'enterprise') {
  const capabilities = BENCHMARK_TIERS[tier].capabilities as Record<string, boolean | string>;
  const features = Object.entries(capabilities)
    .filter(([key, value]) => key !== 'githubCheck' && value === true)
    .map(([key]) => CADS_CAPABILITY_LABELS[key])
    .filter(Boolean);
  features.unshift(capabilities.githubCheck === 'enforced'
    ? 'GitHub Check · enforced'
    : 'GitHub Check · neutral');
  return features;
}

export const MonetizationModal: React.FC<MonetizationModalProps> = ({
  isOpen,
  onClose,
  onNavigateLogin,
  onNavigate,
}) => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [activeTab, setActiveTab] = useState<PricingTab>('plans');
  const [commerce, setCommerce] = useState(INITIAL_COMMERCE_STATE);
  const [statusAttempt, setStatusAttempt] = useState(0);
  const [pendingTier, setPendingTier] = useState<string | null>(null);
  const checkoutRequest = useRef<AbortController | null>(null);
  const authenticated = commerce.authenticated;
  const subscriptionCheckoutEnabled = commerce.checkout === 'ready';
  const [trialCode,setTrialCode] = useState('');
  const [purchaseMessage, setPurchaseMessage] = useState('');
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setPurchaseMessage('');
    const controller = new AbortController();
    const previousFocus = document.activeElement;
    closeButtonRef.current?.focus();
    setCommerce(INITIAL_COMMERCE_STATE);
    setPendingTier(null);
    readCommerceState(AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]))
      .then(state => {
        if (!controller.signal.aborted) setCommerce(state);
      });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(element => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true');

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      controller.abort();
      checkoutRequest.current?.abort();
      checkoutRequest.current = null;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, statusAttempt]);

  const startSubscriptionCheckout = async (tier: 'starter' | 'pro' | 'enterprise') => {
    if (checkoutRequest.current) return;
    setPurchaseMessage('');
    if (authenticated === false) {
      onClose();
      onNavigateLogin?.();
      return;
    }
    if (authenticated !== true) {
      setPurchaseMessage('Sitzungsstatus wird geprüft. Bitte erneut auswählen.');
      return;
    }
    if (!subscriptionCheckoutEnabled) {
      setPurchaseMessage('Der Abo-Checkout ist derzeit nicht produktiv freigeschaltet. Es wurde keine Zahlung gestartet.');
      return;
    }
    const controller = new AbortController();
    checkoutRequest.current = controller;
    setPendingTier(tier);
    try {
      const response = await fetch('/api/billing/subscriptions/checkout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier, cycle: billingCycle, ...(tier === 'enterprise' && trialCode.trim() ? { promotion: trialCode.trim() } : {}) }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]),
      });
      const payload = await response.json();
      if (controller.signal.aborted) return;
      if (response.status === 401) {
        setCommerce(state => ({ ...state, authenticated: false }));
        setPurchaseMessage('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.');
        return;
      }
      if (payload?.error === 'trial_already_claimed') {
        setPurchaseMessage('Die Enterprise-Testphase ist für dieses Konto bereits reserviert oder wurde schon genutzt.');
        return;
      }
      if (response.status === 400 && tier === 'enterprise' && trialCode.trim()) {
        setPurchaseMessage('Dieser Trial-Code ist ungültig. Verwende ENTERPRISE3 oder entferne den Code.');
        return;
      }
      if (!response.ok || typeof payload?.url !== 'string') {
        setPurchaseMessage('Der Checkout konnte nicht gestartet werden. Es wurde keine Zahlung ausgelöst.');
        return;
      }
      const target = new URL(payload.url);
      if (target.protocol !== 'https:' || target.hostname !== 'checkout.stripe.com' || target.username || target.password || target.port) {
        setPurchaseMessage('Der Checkout wurde aus Sicherheitsgründen blockiert.');
        return;
      }
      window.location.assign(target.toString());
    } catch {
      if (!controller.signal.aborted) setPurchaseMessage('Der Checkout ist momentan nicht erreichbar. Bitte versuche es erneut.');
    } finally {
      if (checkoutRequest.current === controller) {
        checkoutRequest.current = null;
        setPendingTier(null);
      }
    }
  };

  if (!isOpen) return null;

  // Stripe is the price authority for products that exist in the current catalog.
  const starterPrice = (billingCycle === 'annual'
    ? PRICING_CATALOG.starter.annual.amountCents / 12
    : PRICING_CATALOG.starter.monthly.amountCents) / 100;
  const proPrice = (billingCycle === 'annual'
    ? PRICING_CATALOG.pro.annual.amountCents / 12
    : PRICING_CATALOG.pro.monthly.amountCents) / 100;
  const enterprisePrice = (billingCycle === 'annual'
    ? PRICING_CATALOG.enterprise.annual.amountCents / 12
    : PRICING_CATALOG.enterprise.monthly.amountCents) / 100;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="pricing-dialog-title">
      <motion.div
        lang="de"
        ref={dialogRef}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="w-full max-w-4xl bg-[#070e22] border border-amber-500/30 rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.8)] my-auto max-h-[92vh] overflow-y-auto"
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <BrandLogo variant="emblem" size="md" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                  Analyse &amp; Wissen
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                  Tarife vergleichen
                </span>
              </div>
              <h2 id="pricing-dialog-title" className="text-xl sm:text-2xl font-black text-white mt-0.5">
                Capital-AI Preiskatalog
              </h2>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Preisliste schließen"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-[#030716] p-1.5" role="group" aria-label="Preiskatalog">
          <button
            type="button"
            aria-pressed={activeTab === 'plans'}
            onClick={() => setActiveTab('plans')}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${activeTab === 'plans' ? 'bg-amber-400 text-black' : 'text-slate-300 hover:bg-white/5'}`}
          >
            Starter · Pro · Enterprise
          </button>
          <button
            type="button"
            aria-pressed={activeTab === 'products'}
            onClick={() => setActiveTab('products')}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${activeTab === 'products' ? 'bg-violet-400 text-black' : 'text-slate-300 hover:bg-white/5'}`}
          >
            Zusatzprodukte
          </button>
        </div>

        {activeTab === 'plans' && (
        <div className="mt-5 space-y-5">
            <div className="rounded-2xl border border-slate-800 bg-[#030716] p-4">
              <h3 className="text-sm font-bold text-white">Wähle den Umfang deiner Analysewerkzeuge</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Vergleiche die enthaltenen CADS-Prüffunktionen und die Abrechnung. Eigene Datenprovider
                und Modelle verbindest du separat im privaten Workspace; ihre Gebühren sind nicht im Abo enthalten.
              </p>
              <p role="status" aria-live="polite" className="mt-3 text-xs text-amber-100">
                {commerce.sessionError ? 'Dein Kontostatus konnte nicht geladen werden. Bitte prüfe ihn erneut.'
                  : commerce.checkout === 'loading' ? 'Kontostatus und Checkout-Verfügbarkeit werden geprüft …'
                  : commerce.checkout === 'error' ? 'Die Checkout-Verfügbarkeit konnte nicht geprüft werden. Bitte versuche es erneut.'
                  : commerce.checkout === 'unavailable' ? 'Der Abo-Checkout ist aktuell nicht verfügbar. Du kannst die Tarife weiter vergleichen.'
                  : authenticated === false ? 'Melde dich für die Tarifauswahl an. Die Bestellung erfolgt anschließend über Stripe.'
                  : 'Tarif auswählen und Bestellung im Stripe-Checkout prüfen.'}
              </p>
              {(commerce.sessionError || commerce.checkout === 'error') && (
                <button type="button" onClick={() => setStatusAttempt(value => value + 1)}
                  className="mt-3 rounded-lg border border-amber-300 px-3 py-2 text-xs text-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
                  Status erneut prüfen
                </button>
              )}
            </div>
            {/* Billing toggle */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-[#030716] border border-slate-800">
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-bold ${
                    billingCycle === 'monthly' ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  Monatlich
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={billingCycle === 'annual'}
                  aria-label="Jährliche Abrechnung verwenden"
                  disabled={pendingTier !== null}
                  onClick={() =>
                    setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')
                  }
                  className="w-12 h-6 rounded-full bg-slate-800 p-0.5 relative transition-colors cursor-pointer border border-slate-700"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-amber-400 transition-transform ${
                      billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs font-bold ${
                      billingCycle === 'annual' ? 'text-white' : 'text-slate-400'
                    }`}
                  >
                    Jährlich
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    Jahresrabatt je Tarif
                  </span>
                </div>
              </div>

            </div>

            {/* Pricing Tiers Grid: ausschließlich aktueller Billing-Katalog */}
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
              {([
                {
                  id: 'starter',
                  badgeAsset: '/branding/badges/starter.svg',
                  label: PRICING_CATALOG.starter.label,
                  monthlyPrice: starterPrice,
                  annualCents: PRICING_CATALOG.starter.annual.amountCents,
                  description: 'Für den Einstieg: Systeme mit CADS-Standardprofilen prüfen und Ergebnisse nachvollziehen.',
                  cadsFeatures: cadsFeaturesForTier('starter'),
                },
                {
                  id: 'pro',
                  badgeAsset: '/branding/badges/pro.svg',
                  label: PRICING_CATALOG.pro.label,
                  monthlyPrice: proPrice,
                  annualCents: PRICING_CATALOG.pro.annual.amountCents,
                  description: 'Für regelmäßige Vergleiche: Veränderungen erkennen und Prüfergebnisse exportieren.',
                  cadsFeatures: cadsFeaturesForTier('pro'),
                },
                {
                  id: 'enterprise',
                  badgeAsset: '/branding/badges/enterprise.svg',
                  label: PRICING_CATALOG.enterprise.label,
                  monthlyPrice: enterprisePrice,
                  annualCents: PRICING_CATALOG.enterprise.annual.amountCents,
                  description: 'Für individuelle Prüfabläufe: eigene Profile und Schwellenwerte sowie API und eigenen Runner nutzen.',
                  cadsFeatures: cadsFeaturesForTier('enterprise'),
                },
              ] as const).map((tier) => (
                <section
                  key={tier.id}
                  aria-labelledby={`pricing-tier-${tier.id}`}
                  className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#030715] p-4"
                >
                  <div>
                    <img src={tier.badgeAsset} alt={`${tier.label} Badge`} className="mb-3 h-16 w-16 rounded-xl border border-white/10 bg-black/20 p-1" />
                    <h3
                      id={`pricing-tier-${tier.id}`}
                      className="text-xs font-mono font-bold uppercase text-slate-200"
                    >
                      {tier.label}
                    </h3>
                    <div className="mt-2">
                      <div className="flex items-baseline gap-1 text-2xl font-black text-white">
                        {tier.monthlyPrice.toFixed(2).replace('.', ',')} €
                        <span className="text-xs font-normal text-slate-400">/ Monat</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {billingCycle === 'annual'
                          ? `${displayPriceEur(tier.annualCents)} € jährlich · -${annualDiscountPercent(tier.id)}%`
                          : 'Monatliche Abrechnung'}
                      </span>
                    </div>
                    <p className="mt-2 border-t border-slate-800 pt-3 text-xs leading-relaxed text-slate-400">
                      {tier.description}
                    </p>
                    <div className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3">
                      <div className="text-[10px] font-mono font-bold uppercase tracking-wide text-cyan-300">
                        CADS Benchmark Engine enthalten
                      </div>
                      <ul className="mt-2 space-y-1 text-[11px] text-slate-300">
                        {tier.cadsFeatures.map((feature) => (
                          <li key={feature}>• {feature}</li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                        Benchmark-Evidence unterstützt Entscheidungen, erteilt aber keine Production-Freigabe.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={pendingTier !== null || commerce.sessionError || authenticated === null || (authenticated && !subscriptionCheckoutEnabled)}
                    aria-busy={pendingTier === tier.id}
                    onClick={() => void startSubscriptionCheckout(tier.id)}
                    className="mt-5 w-full rounded-xl bg-amber-400 py-2.5 text-xs font-black text-black transition-all hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030715]"
                  >
                    {pendingTier === tier.id ? 'Checkout wird geöffnet …' : authenticated === false ? `${tier.label} · anmelden` : `${tier.label} auswählen`}
                  </button>
                </section>
              ))}
            </div>

          </div>
        )}

        {activeTab === 'products' && (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-[#030716] p-4">
              <h3 className="text-sm font-bold text-white">Katalog bestehender Zusatzprodukte</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Vertiefe dein Marktwissen mit einem separaten Lernpaket. Sieh dir die Inhalte und Kaufbedingungen auf der Produktseite an.
              </p>
            </div>

            {ADDITIONAL_PRODUCTS_CATALOG.map((product) => (
              <section
                key={product.id}
                className="rounded-2xl border border-violet-400/35 bg-violet-500/10 p-4 sm:p-5"
                aria-labelledby={`additional-product-${product.id}`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <img
                    src="/branding/badges/vocabulary.svg"
                    alt="Market Vocabulary Badge"
                    className="h-20 w-20 rounded-2xl border border-violet-300/20 bg-black/20 p-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 id={`additional-product-${product.id}`} className="text-sm font-black text-violet-200">
                        {product.label}
                      </h3>
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                        Einmaliges Lernpaket
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-white">{displayPriceEur(product.amountCents)} €</span>
                      <span className="text-xs text-slate-400">einmalig</span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">
                      Enthalten sind das vollständige Vocabulary einschließlich Quant / Pro,
                      der serverseitig berechtigte Lernzugang, wiederholbare Skill-Checks für berechtigte Nutzer
                      sowie der lizenzierte Vocabulary-Badge als Download. Das Paket ist nicht Bestandteil von Starter,
                      Pro oder Enterprise.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-mono text-slate-300">
                      <span className="rounded-lg border border-slate-700 bg-black/20 px-2 py-1">Separater Lernzugang</span>
                      <span className="rounded-lg border border-slate-700 bg-black/20 px-2 py-1">{product.badgeLicense}</span>
                    </div>
                    <LearningPurchase onLogin={onNavigateLogin} />
                  </div>
                </div>
              </section>
            ))}
            <section
              aria-labelledby="screener-blueprint-preview"
              className="rounded-2xl border border-cyan-400/40 bg-gradient-to-br from-cyan-400/10 via-[#071a36] to-purple-500/10 p-4 sm:p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <img
                  src="/branding/badges/screener-bundle-blueprint.svg"
                  alt="Screener Blueprint Produktmotiv: verbundene Datenknoten und eine Summe"
                  className="h-20 w-20 rounded-2xl border border-cyan-300/30 bg-black/30 p-1"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 id="screener-blueprint-preview" className="text-sm font-black text-cyan-100">
                      Screener Blueprint · Datenkonzept &amp; Scoring-Playbooks
                    </h3>
                    <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-mono text-amber-200">
                      Vorschau · noch nicht kaufbar
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-200">
                    Modulare Datenarchitektur mit grafischen Datenströmen, Anbindungsbeispielen in TypeScript
                    und YAML, Assetklassen-Playbooks sowie separater Gewichtung bestätigter Chartmuster.
                  </p>
                  <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                    <span>✓ Provider- und Tenant-Grenzen</span>
                    <span>✓ Versionierte Analyse-Modelle</span>
                    <span>✓ Pattern-Analyse ohne Double Counting</span>
                    <span>✓ Score-Aufschlüsselung und Audit-Konzept</span>
                  </div>
                  <p className="mt-3 text-xs text-amber-100">
                    Beispielrechnung: 76,85/100 (synthetische Faktoren; kein Live-Marktwert oder Anlageergebnis).
                    Preis, Produktlizenz, Checkout und vollständiger Download sind noch nicht freigegeben.
                  </p>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Badge: CAPITAL-AI Vorschauasset. Marktdaten-, Provider- und Modellrechte sind nicht enthalten.
                  </p>
                  <a href="/marketscreener/dokumentation"
                    onClick={event => { event.preventDefault(); onClose(); onNavigate?.('/marketscreener/dokumentation'); }}
                    className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-cyan-400/40 px-4 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
                    YAML-Editor &amp; Diagrammvorschau ansehen
                  </a>
                </div>
              </div>
            </section>
            <section aria-disabled="true" className="pointer-events-none select-none opacity-45 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-4">
              <div className="flex items-center gap-3">
                <img
                  src="/branding/badges/data-pipeline-blueprint.svg"
                  alt="Data Pipeline Blueprint Badge"
                  className="h-16 w-16 rounded-xl border border-cyan-300/20 bg-[#06202a] p-1"
                />
                <div>
                  <div className="text-xs font-black text-cyan-200">Data Pipeline Blueprint</div>
                  <p className="mt-1 text-xs text-slate-300">
                    Geplantes Zusatzprodukt. Nicht auswählbar, derzeit nicht zum Kauf verfügbar.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        <div className="mt-5"><CheckoutPaymentHelp /></div>
        <section aria-labelledby="commerce-questions" className="mt-5 rounded-2xl border border-slate-800 p-4 text-xs">
          <h3 id="commerce-questions" className="font-bold text-white">Vor deiner Auswahl</h3>
          <div className="mt-3 space-y-3 text-slate-300">
            <details>
              <summary className="cursor-pointer font-semibold text-slate-200">Welche Kosten kommen hinzu?</summary>
              <p className="mt-2 leading-relaxed">Providerdaten und KI-Modelle können eigene Abos oder verbrauchsabhängige Gebühren erfordern. Deine privaten Zugangsdaten berechtigen ausschließlich deinen Workspace. Das Abo enthält keine allgemeine Lizenz zur Weitergabe dieser Daten.</p>
            </details>
            <details>
              <summary className="cursor-pointer font-semibold text-slate-200">Sind Live-Kurse und Scoring garantiert?</summary>
              <p className="mt-2 leading-relaxed">Verfügbarkeit und Datenstatus werden in den jeweiligen Werkzeugen angezeigt. Eine Tarifauswahl aktiviert keine noch nicht verfügbare Datenquelle und garantiert kein verifiziertes Live-Scoring oder Anlageergebnis.</p>
            </details>
            <details>
              <summary className="cursor-pointer font-semibold text-slate-200">Wie funktioniert die Bestellung?</summary>
              <p className="mt-2 leading-relaxed">Wähle Tarif und Abrechnung, melde dich an und prüfe die Bestellung bei Stripe. Bei jährlicher Abrechnung wird der ausgewiesene Jahresbetrag berechnet; der Monatswert dient dem Vergleich. Der Lernzugang zum Market Vocabulary wird separat erworben.</p>
            </details>
          </div>
          <nav aria-label="Vertragsinformationen" className="mt-4 flex flex-wrap gap-4 text-amber-200 underline">
            <a href="/agb">AGB</a><a href="/datenschutz">Datenschutz</a><a href="/faq">Häufige Fragen</a>
          </nav>
        </section>

        <section className="mt-4 space-y-3 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-5" aria-label="Enterprise Trial">
          <h3 className="text-lg font-bold text-amber-200">Drei Tage vorausdenken. Enterprise und Learning Portal kostenlos entdecken.</h3>
          <p className="text-sm text-slate-300">Trial-Code ENTERPRISE3 · einmal pro Konto. Danach {billingCycle === 'monthly' ? '109,00 € monatlich' : '1.280,00 € jährlich'}. Vor Ablauf kündigen, um Folgekosten zu vermeiden. Learning Portal ist während der drei Tage inklusive; danach separat für 25,00 € einmalig erhältlich.</p>
          <label className="block text-sm text-slate-200">Enterprise-Trial-Code
            <input value={trialCode} onChange={event=>setTrialCode(event.target.value)} placeholder="ENTERPRISE3" maxLength={32} className="mt-2 block min-h-11 w-full rounded-lg border border-amber-400/30 bg-slate-950 p-3" />
          </label>
          <button type="button" disabled={pendingTier!==null} onClick={()=>{setTrialCode('ENTERPRISE3');}} className="min-h-11 rounded-lg border border-amber-400 px-4 text-sm text-amber-200">Trial-Code einsetzen · danach Enterprise auswählen</button>
          <p className="text-xs text-slate-400">Weitere gültige Rabattcodes können im regulären Stripe-Checkout eingegeben werden. Kein zusätzlicher Rechnungsrabatt während der Trial.</p>
        </section>
        {purchaseMessage && (
          <div role="status" className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs text-amber-100">
            {purchaseMessage}
          </div>
        )}

        {/* Modal Footer */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Zahlungsabwicklung über Stripe • Vertragsdetails im jeweiligen Bestellprozess</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Schließen
            </button>
            <button
              type="button"
              disabled={authenticated === null}
              onClick={() => {
                if (authenticated === true) {
                  onClose();
                  onNavigate?.('/profile');
                } else {
                  onClose();
                  onNavigateLogin?.();
                }
              }}
              className="w-full sm:w-auto px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black transition-all shadow-[0_0_15px_rgba(249,191,33,0.3)] cursor-pointer"
            >
              {authenticated === true ? 'Konto & Abonnement' : 'Anmelden / Konto anlegen'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
