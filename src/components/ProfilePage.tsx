import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  KeyRound,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Trash2,
  User,
  WalletCards,
} from 'lucide-react';
import { AuthSecuritySettings } from '../features/auth/AuthSecuritySettings';

interface SessionUser {
  id: string;
  email: string;
  name: string;
}

interface ProviderConnection {
  provider: string;
  credentialFingerprint?: string;
  status?: 'PENDING' | 'VERIFIED' | 'INVALID' | 'REVOKED';
  dataScope?: string;
  lastVerifiedAt?: string | null;
  lastErrorCode?: string | null;
}

interface Holding {
  asset: string;
  balance: string;
}

async function readJson(response: Response) {
  return response.json().catch(() => null);
}

export function ProfilePage({ onBackToHome }: { onBackToHome: () => void }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const kraken = useMemo(
    () => connections.find(connection => connection.provider === 'kraken') || null,
    [connections],
  );

  const loadConnections = async () => {
    const response = await fetch('/api/profile/provider-connections', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('PROVIDER_CONNECTIONS_UNAVAILABLE');
    const body = await readJson(response);
    setConnections(Array.isArray(body?.connections) ? body.connections : []);
  };

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
        if (body?.mfaRequired) {
          if (!controller.signal.aborted) window.location.replace('/login?mfa=1&next=%2Fprofile');
          return;
        }
        if (controller.signal.aborted) return;
        setUser({
          id: String(body.user.id),
          email: String(body.user.email || ''),
          name: String(body.user.name || 'Benutzer'),
        });
        await loadConnections();
      } catch {
        if (!controller.signal.aborted) setError('Profil und Vault konnten nicht sicher geladen werden.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void bootstrap();
    return () => controller.abort();
  }, []);

  const saveKraken = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    setError(null);
    try {
      const response = await fetch('/api/profile/provider-connections/kraken', {
        method: 'PUT',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey, apiSecret }),
      });
      const body = await readJson(response);
      if (!response.ok) {
        throw new Error(body?.code || body?.error || 'KRAKEN_SAVE_FAILED');
      }
      setApiKey('');
      setApiSecret('');
      setHoldings(Array.isArray(body?.holdings) ? body.holdings : []);
      setFeedback('Kraken-Verbindung verifiziert. Die Zugangsdaten liegen verschlüsselt im persönlichen Vault.');
      await loadConnections();
    } catch (reason) {
      setError(
        reason instanceof Error && reason.message
          ? `Kraken-Verbindung konnte nicht verifiziert werden: ${reason.message}`
          : 'Kraken-Verbindung konnte nicht verifiziert werden.',
      );
    } finally {
      setSaving(false);
    }
  };

  const refreshKraken = async () => {
    setTesting(true);
    setFeedback(null);
    setError(null);
    try {
      const response = await fetch('/api/profile/provider-connections/kraken/balance', {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const body = await readJson(response);
      if (!response.ok) throw new Error(body?.code || body?.error || 'KRAKEN_READ_FAILED');
      setHoldings(Array.isArray(body?.holdings) ? body.holdings : []);
      setFeedback('Privater Kraken-Kontext wurde neu gelesen und bleibt ausschließlich deinem Konto zugeordnet.');
      await loadConnections();
    } catch (reason) {
      setError(
        reason instanceof Error && reason.message
          ? `Privater Kraken-Kontext nicht verfügbar: ${reason.message}`
          : 'Privater Kraken-Kontext nicht verfügbar.',
      );
    } finally {
      setTesting(false);
    }
  };

  const deleteKraken = async () => {
    setSaving(true);
    setFeedback(null);
    setError(null);
    try {
      const response = await fetch('/api/profile/provider-connections/kraken', {
        method: 'DELETE',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('DELETE_FAILED');
      setHoldings([]);
      setFeedback('Kraken-Verbindung und zugehöriges Vault-Secret wurden gelöscht.');
      await loadConnections();
    } catch {
      setError('Kraken-Verbindung konnte nicht gelöscht werden.');
    } finally {
      setSaving(false);
    }
  };

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
          </div>

          <div className="rounded-2xl border border-amber-500/25 bg-[#070b19]/90 p-5 md:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-amber-300">
                  <KeyRound className="h-4 w-4" />
                  <span className="text-xs font-black uppercase tracking-wider">Kraken BYOK</span>
                </div>
                <h2 className="mt-2 text-lg font-black">Eigene Kraken API anbinden</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Prototyp nutzt ausschließlich private Account-Daten mit Funds-Query. Trading, Withdrawals,
                  öffentliche Anzeige, Shared Cache und JetStream-Publikation bleiben deaktiviert.
                </p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold ${
                kraken?.status === 'VERIFIED'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : kraken?.status === 'INVALID'
                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                    : 'border-slate-700 bg-slate-900 text-slate-400'
              }`}>
                {kraken?.status || 'NICHT VERBUNDEN'}
              </span>
            </div>

            {kraken && (
              <div className="mt-4 grid gap-2 rounded-xl border border-white/10 bg-black/30 p-3 text-xs sm:grid-cols-2">
                <div>
                  <span className="text-slate-500">Credential-Fingerprint</span>
                  <p className="mt-1 font-mono text-slate-200">{kraken.credentialFingerprint || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Datenscope</span>
                  <p className="mt-1 font-mono text-cyan-300">{kraken.dataScope || 'USER_PRIVATE_ACCOUNT_DATA'}</p>
                </div>
              </div>
            )}

            <form onSubmit={saveKraken} className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-bold text-slate-300">
                API Key
                <input
                  type="password"
                  value={apiKey}
                  onChange={event => setApiKey(event.target.value)}
                  autoComplete="off"
                  required
                  minLength={8}
                  maxLength={512}
                  className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-3 font-mono text-sm text-white outline-none focus:border-amber-400"
                  placeholder="wird nach Speicherung nicht wieder angezeigt"
                />
              </label>
              <label className="space-y-1.5 text-xs font-bold text-slate-300">
                Private API Secret
                <input
                  type="password"
                  value={apiSecret}
                  onChange={event => setApiSecret(event.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={16}
                  maxLength={1024}
                  className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-3 font-mono text-sm text-white outline-none focus:border-amber-400"
                  placeholder="verschlüsselte Ablage in Supabase Vault"
                />
              </label>
              <div className="sm:col-span-2 flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-400 px-4 text-xs font-black text-black disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                  Speichern & read-only prüfen
                </button>
                {kraken && (
                  <>
                    <button
                      type="button"
                      disabled={testing}
                      onClick={() => void refreshKraken()}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 text-xs font-bold text-cyan-200 disabled:opacity-50"
                    >
                      {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Privaten Kontext aktualisieren
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void deleteKraken()}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 text-xs font-bold text-rose-200 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" /> Verbindung löschen
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </section>

        <AuthSecuritySettings />

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
