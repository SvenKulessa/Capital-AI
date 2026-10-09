export type CommerceState = {
  authenticated: boolean | null;
  sessionError: boolean;
  checkout: 'loading' | 'ready' | 'unavailable' | 'error';
};

export const INITIAL_COMMERCE_STATE: CommerceState = {
  authenticated: null, sessionError: false, checkout: 'loading',
};

// A billing outage must never turn a valid session into an anonymous one.
export async function readCommerceState(signal: AbortSignal, fetchImpl: typeof fetch = fetch): Promise<CommerceState> {
  async function read(path: string) {
    const response = await fetchImpl(path, {
      credentials: 'same-origin', cache: 'no-store',
      headers: { Accept: 'application/json' }, signal,
    });
    if (!response.ok) throw new Error('commerce_status_unavailable');
    return response.json();
  }
  const [session, readiness] = await Promise.allSettled([
    read('/api/auth/session'), read('/api/billing/subscriptions/readiness'),
  ]);
  const authenticated = session.status === 'fulfilled' && typeof session.value?.authenticated === 'boolean'
    ? session.value.authenticated : null;
  const enabled = readiness.status === 'fulfilled' && typeof readiness.value?.enabled === 'boolean'
    ? readiness.value.enabled : null;
  return {
    authenticated, sessionError: authenticated === null,
    checkout: enabled === null ? 'error' : enabled ? 'ready' : 'unavailable',
  };
}
