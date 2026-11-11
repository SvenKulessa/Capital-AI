import { useEffect, useState } from 'react';
import { checkoutConfirmationSession, forgetCheckoutConfirmation } from '../../utils/checkoutConfirmation';
import { trackCommerceEvent, updatePageSEO } from '../../utils/analytics';

export function CheckoutConfirmationPage() {
  const [status, setStatus] = useState('Deine Zahlung wird geprüft …');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    updatePageSEO({ title: 'Zahlungsbestätigung | CAPITAL-AI', description: 'Status deiner Zahlung prüfen.', canonicalPath: '/checkout/confirmation' });
    const sessionId = checkoutConfirmationSession();
    if (!sessionId) { setStatus('Kein Zahlungsbeleg verfügbar. Prüfe deinen Zugang im Konto.'); return; }
    const controller = new AbortController();
    let receipt: unknown;
    const measure = () => { if (receipt && checkoutConfirmationSession()) void trackCommerceEvent('purchase', receipt); };
    window.addEventListener('capital-ai:analytics-ready', measure);
    fetch('/api/billing/purchase-receipt', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }), signal: controller.signal,
    }).then(async response => {
      if (response.status === 401) { setStatus('Bitte melde dich an und prüfe deinen Zugang im Konto.'); return; }
      if (!response.ok) { setStatus('Die Zahlung ist noch nicht bestätigt. Du kannst den Status erneut prüfen.'); return; }
      receipt = await response.json();
      if (controller.signal.aborted) return;
      setStatus('Deine Zahlung wurde bestätigt. Deinen Zugang findest du im Konto.');
      measure();
    }).catch(() => { if (!controller.signal.aborted) setStatus('Der Zahlungsstatus ist derzeit nicht abrufbar. Bitte erneut prüfen.'); });
    return () => { controller.abort(); receipt = undefined; window.removeEventListener('capital-ai:analytics-ready', measure); };
  }, [retry]);
  useEffect(() => { const clear = () => forgetCheckoutConfirmation(); window.addEventListener('pagehide', clear); return () => window.removeEventListener('pagehide', clear); }, []);
  return <section aria-labelledby="checkout-confirmation-heading" className="mx-auto max-w-2xl space-y-6 px-[12px] sm:px-6 py-16 text-slate-100">
    <h1 id="checkout-confirmation-heading" className="break-words text-2xl font-bold sm:text-3xl">Deine Zahlungsbestätigung</h1>
    <p role="status" className="text-base leading-7">{status}</p>
    <div className="flex flex-wrap gap-4">
      <button type="button" onClick={() => setRetry(value => value + 1)} className="min-h-11 rounded-lg border border-slate-400 px-4 py-2 focus-visible:outline-2 focus-visible:outline-amber-200">Status erneut prüfen</button>
      <a href="/profile" className="inline-flex min-h-11 items-center rounded-lg bg-amber-400 px-4 py-2 font-bold text-black focus-visible:outline-2 focus-visible:outline-amber-200">Zum Konto</a>
      <a href="/learning" className="inline-flex min-h-11 items-center px-4 py-2 underline focus-visible:outline-2 focus-visible:outline-amber-200">Zum Learning Portal</a>
    </div>
  </section>;
}
