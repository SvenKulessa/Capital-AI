// Session IDs are short-lived memory only. Strip all return parameters before GA initialization.
let session: { id: string; expires: number } | null = null;
export function captureCheckoutConfirmation() {
  if (typeof window === 'undefined' || window.location.pathname !== '/checkout/confirmation') return;
  const params = new URLSearchParams(window.location.search);
  const ids = params.getAll('session_id');
  if (ids.length) session = null;
  if (ids.length === 1 && /^cs_(live|test)_[A-Za-z0-9]{8,240}$/.test(ids[0])) session = { id: ids[0], expires: Date.now() + 10 * 60_000 };
  if (window.location.search || window.location.hash) window.history.replaceState(null, '', '/checkout/confirmation');
}
export function checkoutConfirmationSession() {
  if (session && Date.now() < session.expires) return session.id;
  session = null;
  return null;
}
export function forgetCheckoutConfirmation() { session = null; }
