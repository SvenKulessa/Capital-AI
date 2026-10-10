import React from 'react';

export function CheckoutPaymentHelp() {
  return <details className="rounded-lg border border-slate-700 p-3 text-xs leading-relaxed text-slate-300">
    <summary className="min-h-6 cursor-pointer font-semibold text-amber-200">Zahlungsmittel · Google Pay, PayPal und weitere</summary>
    <p className="mt-2">Stripe zeigt die für deinen Kauf verfügbaren Zahlungsmittel. Die Auswahl kann sich zwischen Einmalkauf und Abonnement sowie nach Land und Gerät unterscheiden.</p>
    <p className="mt-2">Google Pay erscheint bei unterstütztem Browser und einer geeigneten Karte in deinem Google Wallet. Fehlt die Anzeige, öffne den Checkout in Chrome außerhalb eines eingebetteten App-Browsers.</p>
    <a href="https://docs.stripe.com/testing/wallets" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center text-amber-200 underline underline-offset-4">Wallet-Voraussetzungen bei Stripe prüfen</a>
  </details>;
}
