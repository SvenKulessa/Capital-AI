import React from 'react';
import { LearningFavoritesPanel } from '../features/learning/LearningFavorites';
import { ShieldCheck, User } from 'lucide-react';
import { AccountPageShell } from '../features/account/AccountPageShell';
import { openHeroBuddy } from './HeroBuddy';

type CadsEntitlement = {
  tier: string;
  label: string;
  capabilities: Record<string, boolean | string>;
  benchmarkEvidenceOnly: boolean;
  productionEligible: boolean;
  decisionEligible: boolean;
};

const CADS_CAPABILITY_LABELS: Record<string, string> = {
  standardProfiles: 'CADS Standardprofile',
  githubCheck: 'GitHub Check',
  history: 'Historische Vergleiche',
  regressionDetection: 'Regression Detection',
  evidenceExport: 'Evidence Export',
  customProfiles: 'Custom Profiles',
  customThresholds: 'Custom Thresholds',
  enforcedPrGate: 'Enforced PR Gate',
  api: 'CADS API',
  selfHostedRunner: 'Self-hosted Runner',
};

function CadsEntitlementPanel() {
  const [entitlement, setEntitlement] = React.useState<CadsEntitlement | null>(null);
  const [state, setState] = React.useState<'loading' | 'ready' | 'not-entitled' | 'unavailable'>('loading');

  React.useEffect(() => {
    const controller = new AbortController();
    fetch('/api/cads/commerce/entitlement', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async response => {
        const body = await response.json().catch(() => null);
        if (response.status === 403) {
          setState('not-entitled');
          return;
        }
        if (!response.ok || !body || typeof body.tier !== 'string' || typeof body.capabilities !== 'object') {
          throw new Error('CADS_ENTITLEMENT_UNAVAILABLE');
        }
        setEntitlement(body as CadsEntitlement);
        setState('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) setState('unavailable');
      });
    return () => controller.abort();
  }, []);

  if (state === 'loading') {
    return <p className="mt-3 text-xs text-slate-500">CADS-Berechtigungen werden serverseitig geprüft …</p>;
  }
  if (state === 'not-entitled') {
    return (
      <div className="mt-4 rounded-xl border border-slate-700 bg-black/20 p-3">
        <p className="text-xs font-bold text-slate-200">CADS Benchmark Engine</p>
        <p className="mt-1 text-xs text-slate-400">
          Kein aktives Starter-, Pro- oder Enterprise-Entitlement erkannt. Es wurde keine CADS-Berechtigung clientseitig abgeleitet.
        </p>
      </div>
    );
  }
  if (state === 'unavailable' || !entitlement) {
    return (
      <p className="mt-4 text-xs text-amber-200">
        CADS-Berechtigungen konnten nicht sicher geladen werden und bleiben fail-closed.
      </p>
    );
  }

  const enabled = Object.entries(entitlement.capabilities)
    .filter(([, value]) => value === true || typeof value === 'string')
    .map(([key, value]) => ({
      key,
      label: CADS_CAPABILITY_LABELS[key] || key,
      value: typeof value === 'string' ? value : null,
    }));

  return (
    <div className="mt-5 rounded-2xl border border-cyan-400/25 bg-cyan-500/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
            CADS Benchmark Engine
          </p>
          <p className="mt-1 text-sm font-black text-white">{entitlement.label}</p>
        </div>
        <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[10px] font-mono text-cyan-200">
          serverseitig verifiziert
        </span>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {enabled.map(capability => (
          <li key={capability.key} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-200">
            {capability.label}
            {capability.value ? <span className="ml-1 text-cyan-300">· {capability.value}</span> : null}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
        CADS- und Benchmark-Evidence bleibt Entscheidungsunterstützung. Sie erteilt weder Security-, Lizenz- noch Production-Freigabe.
      </p>
    </div>
  );
}

export function ProfilePage({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <AccountPageShell
      active="/profile"
      title="Profil"
      description="Persönliche Kontoinformationen, Abo-Status und serverseitig verifizierte Rollen."
      onNavigate={onNavigate}
    >
      {session => (
        <section className="grid gap-4 md:grid-cols-3">
          <LearningFavoritesPanel />
          <div className="rounded-2xl border border-white/10 bg-[#070b19]/80 p-5 md:col-span-1">
            <div className="flex items-center gap-2 text-amber-300">
              <User className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-wider">Konto</span>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <p className="font-bold text-white">{session.user?.name || 'Benutzer'}</p>
              <p className="break-all text-slate-400">{session.user?.email}</p>
            </div>
            <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">
              <ShieldCheck className="mb-2 h-4 w-4" />
              Identität wird serverseitig über Supabase Auth verifiziert.
            </div>
            <button
              type="button"
              onClick={openHeroBuddy}
              className="mt-3 min-h-10 w-full rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 text-xs font-bold text-cyan-200"
            >
              Hero Buddy anzeigen
            </button>
          </div>

          <div className="rounded-2xl border border-amber-500/25 bg-[#070b19]/90 p-5 md:col-span-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Abo & Berechtigungen</p>
            {session.account?.available ? (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 font-bold text-amber-100">
                    {session.account.subscription?.tier || 'Kein Tarif'}
                  </span>
                  {session.account.subscription?.status && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-300">
                      {session.account.subscription.status}
                    </span>
                  )}
                </div>

                <CadsEntitlementPanel />

                {session.account.badges?.length ? (
                  <div className="mt-4 flex flex-wrap gap-3" aria-label="Kontobadges">
                    {session.account.badges.map(badge => (
                      <figure key={badge.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                        <img
                          src={badge.asset}
                          alt={badge.label + ' Badge'}
                          className="h-14 w-14 rounded-xl object-contain"
                          width={56}
                          height={56}
                        />
                        <figcaption className="text-xs font-black tracking-wider text-slate-100">{badge.label}</figcaption>
                      </figure>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-slate-500">Für dieses Konto sind keine zusätzlichen Badges hinterlegt.</p>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-400">Abo- und Rollenstatus konnte nicht sicher geladen werden.</p>
            )}
          </div>
        </section>
      )}
    </AccountPageShell>
  );
}
