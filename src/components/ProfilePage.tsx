import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
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

export type AccountView = 'profile' | 'security' | 'vault';

interface SessionUser {
  id: string;
  email: string;
  name: string;
}

interface AccountBadge {
  id: string;
  label: string;
  asset: string;
}

interface AccountProjection {
  available: boolean;
  iamRole: string | null;
  subscription: {
    tier: string;
    status: string | null;
    currentPeriodEnd: string | null;
  } | null;
  badges: AccountBadge[];
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

const PROVIDERS = [
  { id: 'kraken', label: 'Kraken', enabled: true },
] as const;

async function readJson(response: Response) {
  return response.json().catch(() => null);
}

function routeForView(view: AccountView) {
  if (view === 'security') return '/security';
  if (view === 'vault') return '/key-vault';
  return '/profile';
}

export function ProfilePage({
  onBackToHome,
  onNavigate,
  view = 'profile',
}: {
  onBackToHome: () => void;
  onNavigate?: (path: string) => void;
  view?: AccountView;
}) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [account, setAccount] = useState<AccountProjection | null>(null);
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<'kraken'>('kraken');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vaultError, setVaultError] = useState<string | null>(null);

  const connection = useMemo(
    () => connections.find(item => item.provider === selectedProvider) || null,
    [connections, selectedProvider],
  );

  const navigate = (path: string) => {
    if (onNavigate) onNavigate(path);
    else window.location.assign(path);
  };

  const loadConnections = async () => {
    setVaultError(null);
    const response = await fetch('/api/profile/provider-connections', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    const body = await readJson(response);
    if (!response.ok) {
      const code = body?.error || 'provider_vault_unavailable';
      setConnections([]);
      setVaultError(
        code === 'provider_vault_not_configured'
          ? 'Der persönliche Key Vault ist serverseitig noch nicht vollständig konfiguriert.'
          : `Key Vault konnte nicht geladen werden: ${code}`,
      );
      return;
    }
    setConnections(Array.isArray(body?.connections) ? body.connections : []);
  };

  useEffect(() => {
    const controller = new AbortController();
    const bootstrap = async () => {
      setLoading(true);
      setError(null);
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
          const next = encodeURIComponent(routeForView(view));
          if (!controller.signal.aborted) window.location.replace(`/login?mfa=1&next=${next}`);
          return;
        }
        if (controller.signal.aborted) return;

        setUser({
          id: String(body.user.id),
          email: String(body.user.email || ''),
          name: String(body.user.name || 'Benutzer'),
        });
        setAccount(body?.account && typeof body.account === 'object' ? {
          available: body.account.available === true,
          iamRole: typeof body.account.iamRole === 'string' ? body.account.iamRole : null,
          subscription: body.account.subscription && typeof body.account.subscription === 'object'
            ? {
                tier: String(body.account.subscription.tier || ''),
                status: typeof body.account.subscription.status === 'string' ? body.account.subscription.status : null,
                currentPeriodEnd: typeof body.account.subscription.currentPeriodEnd === 'string'
                  ? body.account.subscription.currentPeriodEnd
                  : null,
              }
            : null,
          badges: Array.isArray(body.account.badges)
            ? body.account.badges.filter((badge: unknown): badge is AccountBadge => {
                if (!badge || typeof badge !== 'object') return false;
                const value = badge as Record<string, unknown>;
                return typeof value.id === 'string'
                  && typeof value.label === 'string'
                  && typeof value.asset === 'string'
                  && value.asset.startsWith('/branding/badges/');
              })
            : [],
        } : null);

        if (view === 'vault') await loadConnections();
      } catch {
        if (!controller.signal.aborted) setError('Kontodaten konnten nicht sicher geladen werden.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void bootstrap();
    return () => controller.abort();
  }, [view]);

  const saveProvider = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    setVaultError(null);
    try {
      const response = await fetch(`/api/profile/provider-connections/${selectedProvider}`, {
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
      if (!response.ok) throw new Error(body?.code || body?.error || 'PROVIDER_SAVE_FAILED');

      setApiSecret('');
      setShowSecret(false);
      setHoldings(Array.isArray(body?.holdings) ? body.holdings : []);
      setFeedback('Verbindung erfolgreich verifiziert. Der private Schlüssel liegt ausschließlich verschlüsselt im persönlichen Vault.');
      await loadConnections();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'PROVIDER_SAVE_FAILED';
      setVaultError(
        message === 'provider_vault_not_configured'
          ? 'Key Vault ist serverseitig noch nicht vollständig konfiguriert.'
          : `Verbindung konnte nicht gespeichert/verifiziert werden: ${message}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const refreshProvider = async () => {
    setTesting(true);
    setFeedback(null);
    setVaultError(null);
    try {
      const response = await fetch(`/api/profile/provider-connections/${selectedProvider}/balance`, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const body = await readJson(response);
      if (!response.ok) throw new Error(body?.code || body?.error || 'PROVIDER_READ_FAILED');
      setHoldings(Array.isArray(body?.holdings) ? body.holdings : []);
      setFeedback('Private Provider-Verbindung wurde erfolgreich geprüft.');
      await loadConnections();
    } catch (reason) {
      setVaultError(reason instanceof Error ? reason.message : 'Privater Provider-Kontext nicht verfügbar.');
    } finally {
      setTesting(false);
    }
  };

  const deleteProvider = async () => {
    setSaving(true);
    setFeedback(null);
    setVaultError(null);
    try {
      const response = await fetch(`/api/profile/provider-connections/${selectedProvider}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('DELETE_FAILED');
      setHoldings([]);
      setApiKey('');
      setApiSecret('');
      setFeedback('Provider-Verbindung und zugehöriges Vault-Secret wurden gelöscht.');
      await loadConnections();
    } catch {
      setVaultError('Provider-Verbindung konnte nicht gelöscht werden.');
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (response.ok) window.location.replace('/');
    else setError('Abmeldung konnte nicht bestätigt werden.');
  };

  const pageTitle = view === 'security'
    ? 'Sicherheit'
    : view === 'vault'
      ? 'Key Vault'
      : 'Profil';

  if (loading) {
    return (
      <main className="min-h-screen bg-[#02050e] text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
          Konto wird verifiziert …
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
                CAPITAL-AI / ACCOUNT / {pageTitle.toUpperCase()}
              </p>
              <h1 className="mt-1 text-2xl font-black">{pageTitle}</h1>
              <p className="mt-1 text-sm text-slate-400">
                {view === 'profile' && 'Identität, Abonnement und kontogebundene Berechtigungen.'}
                {view === 'security' && 'Passkeys, Authenticator und Passwort-Wiederherstellung.'}
                {view === 'vault' && 'Private Provider-Zugangsdaten getrennt von öffentlichen MARKET-Daten.'}
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

        <nav aria-label="Kontobereich" className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-[#070b19]/80 p-2">
          {([
            ['profile', 'Profil'],
            ['security', 'Sicherheit'],
            ['vault', 'Key Vault'],
          ] as Array<[AccountView, string]>).map(([target, label]) => (
            <button
              key={target}
              type="button"
              onClick={() => navigate(routeForView(target))}
              className={`min-h-11 rounded-xl px-3 text-xs font-black transition ${
                view === target
                  ? 'bg-amber-400 text-black'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

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

        {view === 'profile' && (
          <section className="rounded-2xl border border-white/10 bg-[#070b19]/80 p-5">
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
              Identität wird serverseitig über Supabase Auth verifiziert.
            </div>

            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Abo & Berechtigungen</p>
              {account?.available ? (
                <>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 font-bold text-amber-100">
                      {account.subscription?.tier || 'Kein Tarif'}
                    </span>
                    {account.subscription?.status && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-300">
                        {account.subscription.status}
                      </span>
                    )}
                    {account.iamRole && (
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 font-mono text-cyan-200">
                        IAM {account.iamRole}
                      </span>
                    )}
                  </div>
                  {account.badges.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2" aria-label="Kontobadges">
                      {account.badges.map(badge => (
                        <figure key={badge.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2">
                          <img src={badge.asset} alt={badge.label} className="h-10 w-10 rounded-lg object-cover" />
                          <figcaption className="text-[10px] font-black tracking-wider text-slate-200">{badge.label}</figcaption>
                        </figure>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-2 text-xs text-slate-400">Abo- und Rollenstatus konnte nicht sicher geladen werden.</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => void logout()}
              className="mt-5 min-h-11 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 text-xs font-black text-rose-200"
            >
              Abmelden
            </button>
          </section>
        )}

        {view === 'security' && (
          <>
            <AuthSecuritySettings />
            <section className="rounded-2xl border border-white/10 bg-[#070b19]/80 p-5">
              <h2 className="text-sm font-black text-white">Passwort</h2>
              <p className="mt-1 text-xs text-slate-400">
                Für Konten mit E-Mail/Passwort kann jederzeit eine neue Reset-Mail angefordert werden.
              </p>
              <button
                type="button"
                onClick={() => window.location.assign('/login?mode=forgot')}
                className="mt-3 min-h-11 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 text-xs font-black text-amber-200"
              >
                Passwort vergessen / zurücksetzen
              </button>
            </section>
          </>
        )}

        {view === 'vault' && (
          <>
            {vaultError && (
              <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                {vaultError}
              </div>
            )}

            <section className="rounded-2xl border border-amber-500/25 bg-[#070b19]/90 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-amber-300">
                    <KeyRound className="h-4 w-4" />
                    <span className="text-xs font-black uppercase tracking-wider">Provider BYOK</span>
                  </div>
                  <h2 className="mt-2 text-lg font-black">Eigenen Provider-Account anbinden</h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Private Account-Daten bleiben kontogebunden. Trading, Withdrawals, öffentliche Anzeige,
                    Shared Cache und JetStream-Publikation bleiben deaktiviert.
                  </p>
                </div>

                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold ${
                  connection?.status === 'VERIFIED'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : connection?.status === 'INVALID'
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                      : 'border-slate-700 bg-slate-900 text-slate-400'
                }`}>
                  {connection?.status === 'VERIFIED' && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {connection?.status === 'VERIFIED' ? 'VERBUNDEN' : connection?.status || 'NICHT VERBUNDEN'}
                </span>
              </div>

              <label className="mt-5 block text-xs font-bold text-slate-300">
                Provider
                <select
                  value={selectedProvider}
                  onChange={event => setSelectedProvider(event.target.value as 'kraken')}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-3 text-sm text-white"
                >
                  {PROVIDERS.map(provider => (
                    <option key={provider.id} value={provider.id} disabled={!provider.enabled}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </label>

              {connection?.status === 'VERIFIED' && (
                <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                  <div className="flex items-center gap-2 font-black">
                    <CheckCircle2 className="h-4 w-4" /> Provider-Verbindung erfolgreich
                  </div>
                  <p className="mt-1 text-emerald-100/70">
                    Read-only Funds-Query wurde verifiziert.
                  </p>
                </div>
              )}

              {connection && (
                <div className="mt-4 grid gap-2 rounded-xl border border-white/10 bg-black/30 p-3 text-xs sm:grid-cols-2">
                  <div>
                    <span className="text-slate-500">Credential-Fingerprint</span>
                    <p className="mt-1 font-mono text-slate-200">{connection.credentialFingerprint || '—'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Datenscope</span>
                    <p className="mt-1 font-mono text-cyan-300">{connection.dataScope || 'USER_PRIVATE_ACCOUNT_DATA'}</p>
                  </div>
                </div>
              )}

              <form onSubmit={saveProvider} className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-xs font-bold text-slate-300">
                  API Key
                  <input
                    type="text"
                    value={apiKey}
                    onChange={event => setApiKey(event.target.value)}
                    autoComplete="off"
                    required
                    minLength={8}
                    maxLength={512}
                    className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-3 font-mono text-sm text-white outline-none focus:border-amber-400"
                    placeholder="API Key aus deinem Provider-Account"
                  />
                </label>

                <label className="space-y-1.5 text-xs font-bold text-slate-300">
                  Private API Secret
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={apiSecret}
                      onChange={event => setApiSecret(event.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={16}
                      maxLength={1024}
                      className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-3 pr-12 font-mono text-sm text-white outline-none focus:border-amber-400"
                      placeholder="verschlüsselte Ablage in Supabase Vault"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(value => !value)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:text-white"
                      aria-label={showSecret ? 'Private API Secret verbergen' : 'Private API Secret anzeigen'}
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
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

                  {connection && (
                    <>
                      <button
                        type="button"
                        disabled={testing}
                        onClick={() => void refreshProvider()}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 text-xs font-bold text-cyan-200 disabled:opacity-50"
                      >
                        {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Verbindung prüfen
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void deleteProvider()}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 text-xs font-bold text-rose-200 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" /> Verbindung löschen
                      </button>
                    </>
                  )}
                </div>
              </form>

              <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
                Aktuell ist je Provider genau ein aktives Credential vorgesehen. Die Unterstützung mehrerer benannter Credentials desselben Providers benötigt eine separate Vault-Schema-Version.
              </p>
            </section>

            <section className="rounded-2xl border border-cyan-500/20 bg-[#070b19]/80 p-5">
              <div className="flex items-center gap-2 text-cyan-300">
                <WalletCards className="h-4 w-4" />
                <h2 className="text-xs font-black uppercase tracking-wider">Privater Provider-Kontext</h2>
              </div>
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
                  <Database className="h-4 w-4" /> Noch kein verifizierter privater Provider-Kontext geladen.
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
