import React from 'react';

/**
 * Display only after the authenticated learning access RPC verifies entitlement.
 * Never infer a purchase from localStorage or a checkout URL.
 */
export function LearningEntitlementBadge() {
  const [entitled, setEntitled] = React.useState(false);

  React.useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/billing/vocabulary/access', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    }).then(async response => {
      if (!response.ok) return;
      const access = await response.json();
      if (!controller.signal.aborted) setEntitled(access?.quantProEntitled === true);
    }).catch(() => {
      // Fail closed: no verified entitlement, no badge.
    });
    return () => controller.abort();
  }, []);

  if (!entitled) return null;
  return <figure className="mt-4 flex items-center gap-3 rounded-2xl border border-violet-400/40 bg-violet-500/10 p-3" data-learning-entitlement-badge="verified">
    <img src="/branding/badges/learning-mastermind.svg" alt="CAPITAL-AI Learning Portal Mastermind Badge"
      width={64} height={64} className="h-16 w-16 shrink-0 rounded-xl object-contain" />
    <figcaption className="min-w-0">
      <strong className="block text-xs font-black tracking-wide text-violet-100">LEARNING MASTERMIND</strong>
      <span className="mt-1 block text-[11px] leading-5 text-slate-300">Learning Portal · Berechtigung serverseitig verifiziert</span>
    </figcaption>
  </figure>;
}
