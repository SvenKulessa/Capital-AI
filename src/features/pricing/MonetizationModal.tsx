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
  Check,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { motion } from 'motion/react';
import { BrandLogo } from '../../components/BrandLogo';
import {
  PRICING_CATALOG,
  annualDiscountPercent,
  displayPriceEur,
} from '../../data/pricingCatalog';
import { ADDITIONAL_PRODUCTS_CATALOG } from '../../data/additionalProductsCatalog';

interface MonetizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateLogin?: () => void;
  onNavigate?: (path: string) => void;
  onOpenWhaleRadar?: () => void;
}

type BillingCycle = 'monthly' | 'annual';
type PricingTab = 'plans' | 'products';

export const MonetizationModal: React.FC<MonetizationModalProps> = ({
  isOpen,
  onClose,
  onNavigateLogin,
  onNavigate,
}) => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [activeTab, setActiveTab] = useState<PricingTab>('plans');
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [purchaseMessage, setPurchaseMessage] = useState('');
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
    setPurchaseMessage('');
    const controller = new AbortController();
    fetch('/api/auth/session', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(session => {
        if (!controller.signal.aborted) setAuthenticated(Boolean(session?.authenticated));
      })
      .catch(() => {
        if (!controller.signal.aborted) setAuthenticated(false);
      });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
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
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

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
                  Business Model &amp; Monetarisierung
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                  Multi-Pillar Strategy
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

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-[#030716] p-1.5" role="tablist" aria-label="Preiskatalog">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'plans'}
            onClick={() => setActiveTab('plans')}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${activeTab === 'plans' ? 'bg-amber-400 text-black' : 'text-slate-300 hover:bg-white/5'}`}
          >
            Starter · Pro · Enterprise
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'products'}
            onClick={() => setActiveTab('products')}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${activeTab === 'products' ? 'bg-violet-400 text-black' : 'text-slate-300 hover:bg-white/5'}`}
          >
            Zusatzprodukte
          </button>
        </div>

        {activeTab === 'plans' && (
        <div className="mt-5 space-y-5">
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
                  description: 'Einstiegstarif aus dem aktuellen Billing-Katalog.',
                },
                {
                  id: 'pro',
                  badgeAsset: '/branding/badges/pro.svg',
                  label: PRICING_CATALOG.pro.label,
                  monthlyPrice: proPrice,
                  annualCents: PRICING_CATALOG.pro.annual.amountCents,
                  description: 'Pro-Tarif aus dem aktuellen Billing-Katalog.',
                },
                {
                  id: 'enterprise',
                  badgeAsset: '/branding/badges/enterprise.svg',
                  label: PRICING_CATALOG.enterprise.label,
                  monthlyPrice: enterprisePrice,
                  annualCents: PRICING_CATALOG.enterprise.annual.amountCents,
                  description: 'Enterprise-Tarif aus dem aktuellen Billing-Katalog.',
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
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPurchaseMessage('');
                      if (authenticated === false) {
                        onClose();
                        onNavigateLogin?.();
                        return;
                      }
                      if (authenticated === true) {
                        setPurchaseMessage('Der Abo-Checkout ist für angemeldete Nutzer noch nicht produktiv freigeschaltet. Es erfolgt keine Weiterleitung zum Login.');
                        return;
                      }
                      setPurchaseMessage('Sitzungsstatus wird geprüft. Bitte erneut auswählen.');
                    }}
                    className="mt-5 w-full rounded-xl bg-amber-400 py-2.5 text-xs font-black text-black transition-all hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030715]"
                  >
                    {tier.label} auswählen
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
                Hier erscheinen ausschließlich bereits vorhandene, kaufbare Zusatzprodukte. Geplante Token-, NFT-, B2B- oder API-Produkte werden nicht als verfügbar dargestellt.
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
                        Verfügbar
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-white">{displayPriceEur(product.amountCents)} €</span>
                      <span className="text-xs text-slate-400">einmalig</span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">
                      Enthalten sind das erweiterte Market Vocabulary mit geschützten Quant-/Pro-Begriffen,
                      der serverseitig berechtigte Lernzugang, wiederholbare Skill-Checks für berechtigte Nutzer
                      sowie der lizenzierte Vocabulary-Badge als Download. Das Paket ist nicht Bestandteil von Starter,
                      Pro oder Enterprise.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-mono text-slate-300">
                      <span className="rounded-lg border border-slate-700 bg-black/20 px-2 py-1">Separates Entitlement</span>
                      <span className="rounded-lg border border-slate-700 bg-black/20 px-2 py-1">{product.badgeLicense}</span>
                    </div>
                    <a
                      href={product.productPath}
                      onClick={(event) => {
                        event.preventDefault();
                        if (authenticated === false) {
                          onClose();
                          onNavigateLogin?.();
                          return;
                        }
                        onClose();
                        onNavigate?.(product.productPath);
                      }}
                      className="mt-4 inline-flex rounded-xl bg-violet-300 px-4 py-2 text-xs font-black text-black hover:bg-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200"
                    >
                      Vocabulary ansehen / erwerben
                    </a>
                  </div>
                </div>
              </section>
            ))}
            <section aria-disabled="true" className="pointer-events-none select-none opacity-45 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-4">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-xl border border-cyan-300/20 bg-[#06202a] flex items-center justify-center text-[10px] font-black text-cyan-200 text-center px-1">
                  DATA<br/>PIPELINE<br/>BLUEPRINT
                </div>
                <div>
                  <div className="text-xs font-black text-cyan-200">Data Pipeline Blueprint</div>
                  <p className="mt-1 text-xs text-slate-300">
                    Geplantes Zusatzprodukt. Nicht auswählbar, bis Evidence-, Lizenz-, Entitlement- und Checkout-Gates geschlossen sind.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

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
              onClick={() => {
                if (authenticated) {
                  onClose();
                  onNavigate?.('/profile');
                } else {
                  onClose();
                  onNavigateLogin?.();
                }
              }}
              className="w-full sm:w-auto px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black transition-all shadow-[0_0_15px_rgba(249,191,33,0.3)] cursor-pointer"
            >
              {authenticated ? 'Konto & Abonnement' : 'Konto anlegen'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
