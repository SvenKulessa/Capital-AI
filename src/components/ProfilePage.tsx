import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  Loader2,
  ShieldCheck,
  User,
  WalletCards,
} from 'lucide-react';
import { KrakenVaultBadges, type KrakenHolding } from './KrakenVaultBadges';

interface SessionUser {
  id: string;
  email: string;
  name: string;
}

interface AccessState {
  authenticated: boolean;
  owner: boolean;
  allAccess: boolean;
  iamRole: string;
  tier: 'Free' | 'Starter' | 'Pro' | 'Enterprise';
  subscription: { status: string; currentPeriodEnd: string | null };
  products: Array<{ id: string; label: string; entitled: boolean; source: string }>;
}

async function readJson(response: Response) {
  return response.json().catch(() => null);
}

export function ProfilePage({ onBackToHome }: { onBackToHome: () => void }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [access, setAccess] = useState<AccessState | null>(null);
  const [holdings, setHoldings] = useState<KrakenHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const bootstrap = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        const body = await readJson(response);
        if (!response.ok || !body?.authenticated || !body?.user?.id) {
          if (!controller.signal.aborted) window.location.replace('/login');
          return;
        }
        if (controller.signal.aborted) return;
        setUser({
          id: String(body.user.id),
          email: String(body.user.email || ''),
          name: String(body.user.name || 'Benutzer'),
        });
        setLoading(false);

        void fetch('/api/profile/access', {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        })
          .then(async accessResponse => accessResponse.ok ? readJson(accessResponse) : null)
          .then(accessBody => {
            if (!controller.signal.aborted && accessBody?.authenticated === true) setAccess(accessBody as AccessState);
          })
          .catch(() => undefined);

      } catch {
        if (!controller.signal.aborted) setError('Profil und Vault konnten nicht sicher geladen werden.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void bootstrap();
    return () => controller.abort();
  }, []);


  if (loading) {
    return (
      <main className="min-h-screen bg-[#02050e] text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
          Profil und persönlicher Vault werden verifiziert …
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#02050e] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-2xl border border-white/10 bg-[#070b19]/90 p-4 shadow-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-amber-300">
                CAPITAL-AI / PROFIL / PRIVATE DATA
              </p>
              <h1 className="mt-1 text-2xl font-black">Profil & persönlicher API-Vault</h1>
              <p className="mt-1 text-sm text-slate-400">
                Eigene Provider-Zugangsdaten bleiben kontogebunden und werden nicht als öffentliche MARKET-Quelle zugelassen.
              </p>
            </div>
            <button
              type="button"
              onClick={onBackToHome}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" /> Zur Plattform
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}
        {feedback && (
          <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            {feedback}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#070b19]/80 p-5 md:col-span-1">
            <div className="flex items-center gap-2 text-amber-300">
              <User className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-wider">Konto</span>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <p className="font-bold text-white">{user?.name || 'Benutzer'}</p>
              <p className="break-all text-slate-400">{user?.email}</p>
              <p className="break-all font-mono text-[10px] text-slate-500">{user?.id}</p>
            </div>
            <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">
              <ShieldCheck className="mb-2 h-4 w-4" />
              Identität wird serverseitig über Supabase Auth verifiziert. Der Browser entscheidet niemals selbst über den Vault-Eigentümer.
            </div>

            {access && (
              <div className="mt-4 space-y-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2.5 py-1 text-[11px] font-black text-amber-200">
                    {access.tier}
                  </span>
                  {access.owner && (
                    <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-black text-cyan-200">
                      OWNER · ALL ACCESS
                    </span>
                  )}
                  {access.products.map(product => (
                    <span
                      key={product.id}
                      className="rounded-full border border-violet-400/30 bg-violet-400/10 px-2.5 py-1 text-[11px] font-bold text-violet-200"
                    >
                      {product.label}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  {access.owner
                    ? 'Owner-Zugriff wird serverseitig aus der verifizierten Supabase-IAM-Rolle abgeleitet und ist unabhängig von einzelnen Produktkäufen.'
                    : 'Tarif und Produktzugriffe stammen aus serverseitig verifizierter Subscription-/Entitlement-Evidence.'}
                </p>
              </div>
            )}
          </div>

          <KrakenVaultBadges onHoldings={setHoldings} />
        </section>

        <section className="rounded-2xl border border-cyan-500/20 bg-[#070b19]/80 p-5">
          <div className="flex items-center gap-2 text-cyan-300">
            <WalletCards className="h-4 w-4" />
            <h2 className="text-xs font-black uppercase tracking-wider">Enterprise-Scorer Privatkontext</h2>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Diese Bestände dürfen als persönlicher Portfolio-Kontext an den Enterprise Scorer übergeben werden.
            Sie ersetzen keine zugelassene Markt- oder Fundamentaldatenquelle.
          </p>
          {holdings.length ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {holdings.map(item => (
                <div key={item.asset} className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <p className="font-mono text-xs font-black text-white">{item.asset}</p>
                  <p className="mt-1 break-all font-mono text-[11px] text-cyan-300">{item.balance}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-500">
              <Database className="h-4 w-4" /> Noch kein privater Kraken-Kontext geladen.
            </div>
          )}
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            Buffett Value Check bleibt für Kraken-Daten fachlich fail-closed: Kontostände liefern keine ROE-, FCF-, ROIC- oder DCF-Fundamentaldaten.
          </div>
        </section>
      </div>
    </main>
  );
}