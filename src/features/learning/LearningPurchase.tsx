import React, { useState } from 'react';
import { formatVocabularyPrice } from '../../data/vocabularyOffer';
import { CheckoutPaymentHelp } from '../pricing/CheckoutPaymentHelp';

export function LearningPurchase({ onLogin }: { onLogin?: () => void }) {
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function checkout() {
    if (!consent || pending) return;
    setPending(true); setError('');
    try {
      const response = await fetch('/api/billing/vocabulary/checkout', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalWaived: consent }), signal: AbortSignal.timeout(15000),
      });
      if (response.status === 401) { setError('Bitte vor dem Kauf anmelden.'); onLogin?.(); return; }
      if (response.status === 409) { setError('Dein Learning-Portal-Zugang ist bereits aktiv.'); return; }
      const body = await response.json();
      if (!response.ok) throw new Error('checkout');
      const target = new URL(body.url);
      if (target.protocol !== 'https:' || target.hostname !== 'checkout.stripe.com') throw new Error('url');
      window.location.assign(target.href);
    } catch { setError('Stripe-Checkout konnte nicht geöffnet werden. Bitte erneut versuchen.'); }
    finally { setPending(false); }
  }
  return <section aria-label="Learning Portal kaufen" className="space-y-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
    <p className="text-sm text-slate-200">Learning Portal · {formatVocabularyPrice()} einmalig. Vollständiges Vocabulary und tägliche Quizzes. Lernvideos folgen demnächst (Coming soon). Chart-Lernatlas und Modul-Erklärungen benötigen zusätzlich mindestens Starter; Chart-Training zusätzlich Pro.</p>
    <label className="flex gap-3 text-xs text-slate-300"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
      Ich stimme der sofortigen Bereitstellung zu und bestätige den Verlust des Widerrufsrechts mit Beginn der Bereitstellung.</label>
    <button type="button" disabled={!consent || pending} aria-busy={pending} onClick={() => void checkout()} className="min-h-11 rounded-lg bg-amber-400 px-4 text-sm font-bold text-black disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-amber-200">
      {pending ? 'Stripe wird geöffnet …' : `Learning Portal für ${formatVocabularyPrice()} kaufen`}</button>
    <p className="text-xs text-slate-300">Einen gültigen Promo-Code kannst du im nächsten Schritt im Stripe-Checkout eingeben.</p>
    <CheckoutPaymentHelp />
    {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
  </section>;
}
