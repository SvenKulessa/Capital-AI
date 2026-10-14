import { useEffect, useState } from 'react';

export type VerifiedSessionState = 'loading' | 'authenticated' | 'anonymous' | 'error';

/** Session identity is verified by the same-origin backend, never inferred from client persistence or entitlements. */
export function useVerifiedSession(): VerifiedSessionState {
  const [state, setState] = useState<VerifiedSessionState>('loading');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store',
      headers: { Accept: 'application/json' }, signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('SESSION_UNAVAILABLE');
        const data: unknown = await response.json();
        if (!data || typeof data !== 'object' || !('authenticated' in data) ||
          typeof data.authenticated !== 'boolean') throw new Error('INVALID_SESSION');
        const next: VerifiedSessionState = data.authenticated ? 'authenticated' : 'anonymous';
        return next;
      })
      .then(next => { if (!controller.signal.aborted) setState(next); })
      .catch(() => { if (!controller.signal.aborted) setState('error'); });
    return () => controller.abort();
  }, []);
  return state;
}
