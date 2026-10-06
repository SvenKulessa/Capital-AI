import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Server,
  Trash2,
} from 'lucide-react';
import { AccountPageShell } from '../features/account/AccountPageShell';

interface ProviderConnection {
  provider: string;
  credentialFingerprint?: string;
  status?: 'PENDING' | 'VERIFIED' | 'INVALID' | 'REVOKED';
  dataScope?: string;
  lastVerifiedAt?: string | null;
  lastErrorCode?: string | null;
  permissions?: {
    fundsQuery?: boolean;
    websocketToken?: boolean;
    trading?: boolean;
    withdrawals?: boolean;
    publicMarketDataAdmission?: boolean;
  };
}

interface Holding {
  asset: string;
  balance: string;
}

const PROVIDERS = [
  {
    id: 'kraken',
    label: 'Kraken',
    description: 'Kraken Spot API: REST-Credential-Verifikation, optionaler Funds-Readback und WebSocket-Token-Capability; Trading und Withdrawals bleiben deaktiviert.',
  },
] as const;

type ProviderId = (typeof PROVIDERS)[number]['id'];

async function readJson(response: Response) {
  return response.json().catch(() => null);
}

export function KeyVaultPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [provider, setProvider] = useState<ProviderId>('kraken');
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loadingVault, setLoadingVault] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const connection = useMemo(
    () => connections.find(item => item.provider === provider) || null,
    [connections, provider],
  );

  const loadConnections = async () => {
    setLoadingVault(true);
    try {
      const response = await fetch('/api/profile/provider-connections', {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const body = await readJson(response);
      if (!response.ok) throw new Error(body?.error || 'provider_vault_unavailable');
      setConnections(Array.isArray(body?.connections) ? body.connections : []);
    } finally {
      setLoadingVault(false);
    }
  };

  useEffect(() => {
    void loadConnections().catch(reason => {
      const message = reason instanceof Error ? reason.message : 'provider_vault_unavailable';
      setError(
        message === 'provider_vault_not_configured'
          ? 'Key Vault ist in der Web-Runtime noch nicht mit einer gültigen serverseitigen Supabase-Admin-Credential verbunden.'
          : message === 'provider_vault_admin_credential_rejected'
            ? 'Die serverseitige Supabase-Admin-Credential der Web-Runtime wurde vom Projekt abgewiesen. Sie muss in der Runtime ersetzt oder korrigiert werden.'
            : 'Key Vault konnte nicht sicher geladen werden.',
      );
    });
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setFeedback('');
    try {
      const response = await fetch(`/api/profile/provider-connections/${provider}`, {
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
      setHoldings(Array.isArray(body?.holdings) ? body.holdings : []);
      const portfolio = body?.portfolioAvailable === true ? ' · Spot-Portfolio verfügbar' : ' · kein Funds-Readback angefordert';
      const websocket = body?.capabilities?.websocketToken === true ? ' · WebSocket-Token erlaubt' : '';
      setFeedback(`${PROVIDERS.find(item => item.id === provider)?.label || provider} wurde erfolgreich verifiziert und sicher gespeichert${portfolio}${websocket}.`);
      await loadConnections();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'PROVIDER_SAVE_FAILED';
      setError(
        message === 'provider_vault_not_configured'
          ? 'Serverseitiger Key Vault ist noch nicht mit einer gültigen Admin-Credential konfiguriert.'
          : message === 'provider_vault_admin_credential_rejected'
            ? 'Die serverseitige Supabase-Admin-Credential wurde abgewiesen. Der Provider-Key wurde nicht gespeichert.'
            : `Verbindung konnte nicht gespeichert oder verifiziert werden: ${message}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const refresh = async () => {
    setTesting(true);
    setError('');
    setFeedback('');
    try {
      const response = await fetch(`/api/profile/provider-connections/${provider}/balance`, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const body = await readJson(response);
      if (!response.ok) throw new Error(body?.code || body?.error || 'PROVIDER_READ_FAILED');
      setHoldings(Array.isArray(body?.holdings) ? body.holdings : []);
      setFeedback(
        body?.portfolioAvailable === true
          ? 'Spot-Credential und Funds-Readback erfolgreich geprüft.'
          : 'Spot-Credential erfolgreich geprüft. Dieser Key besitzt kein Query-Funds-Recht; deshalb wird kein Portfolio gelesen.',
      );
      await loadConnections();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Verbindung konnte nicht geprüft werden.');
    } finally {
      setTesting(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    setError('');
    setFeedback('');
    try {
      const response = await fetch(`/api/profile/provider-connections/${provider}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('DELETE_FAILED');
      setApiKey('');
      setApiSecret('');
      setHoldings([]);
      setFeedback('Provider-Verbindung wurde aus dem persönlichen Vault entfernt.');
      await loadConnections();
    } catch {
      setError('Provider-Verbindung konnte nicht gelöscht werden.');
    } finally {
      setSaving(false);
    }
  };

  const statusClasses = connection?.status === 'VERIFIED'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : connection?.status === 'INVALID'
      ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
      : 'border-slate-700 bg-slate-900 text-slate-300';

  return (
    <AccountPageShell
      active="/profile/key-vault"
      title="Key Vault"
      description="Eigene Provider-Zugangsdaten kontogebunden verwalten. Secrets verlassen den serverseitigen Vault nicht."
      onNavigate={onNavigate}
    >
      {() => (
        <div className="space-y-5">
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

          <section className="rounded-2xl border border-amber-500/25 bg-[#070b19]/90 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-300">
                  <KeyRound className="h-4 w-4" />
                  <span className="text-xs font-black uppercase tracking-wider">Provider Credential</span>
                </div>
                <h2 className="mt-2 text-lg font-black">Eigenen API-Zugang hinterlegen</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  API-Key bleibt sichtbar editierbar. Der Private Key wird als Secret-Eingabe behandelt und nach erfolgreicher Speicherung nicht wieder aus dem Vault angezeigt.
                </p>
              </div>

              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${statusClasses}`}>
                {connection?.status === 'VERIFIED' && <CheckCircle2 className="h-4 w-4" />}
                {loadingVault ? 'WIRD GELADEN' : connection?.status || 'NICHT VERBUNDEN'}
              </div>
            </div>

            <form onSubmit={save} className="mt-5 grid gap-4">
              <label className="text-xs font-bold text-slate-300">
                Provider
                <select
                  value={provider}
                  onChange={event => setProvider(event.target.value as ProviderId)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-3 text-sm text-white"
                >
                  {PROVIDERS.map(item => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
                <span className="mt-1 block text-[10px] font-normal text-slate-500">
                  {PROVIDERS.find(item => item.id === provider)?.description}
                </span>
              </label>

              <label className="text-xs font-bold text-slate-300">
                API Key
                <input
                  type="text"
                  value={apiKey}
                  onChange={event => setApiKey(event.target.value)}
                  autoComplete="off"
                  required
                  minLength={8}
                  maxLength={512}
                  spellCheck={false}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-3 font-mono text-sm text-white"
                  placeholder="API Key des eigenen Provider-Accounts"
                />
              </label>

              <label className="text-xs font-bold text-slate-300">
                Private API Secret
                <div className="relative mt-1">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={apiSecret}
                    onChange={event => setApiSecret(event.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={16}
                    maxLength={1024}
                    spellCheck={false}
                    className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-3 pr-12 font-mono text-sm text-white"
                    placeholder="Private Key / Secret"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(value => !value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:text-white"
                    aria-label={showSecret ? 'Private API Secret ausblenden' : 'Private API Secret anzeigen'}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-black text-black disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                Spot API-Key speichern & read-only verifizieren
              </button>
            </form>

            {connection && (
              <div className={`mt-5 rounded-2xl border p-4 ${statusClasses}`}>
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  <p className="text-sm font-black">
                    {connection.status === 'VERIFIED' ? 'Provider erfolgreich verbunden' : 'Provider-Verbindungsstatus'}
                  </p>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                    <div className="text-[9px] font-mono uppercase text-slate-500">Spot REST Auth</div>
                    <div className="mt-1 text-[11px] font-bold text-emerald-200">VERIFIZIERT</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                    <div className="text-[9px] font-mono uppercase text-slate-500">Portfolio / Query Funds</div>
                    <div className={`mt-1 text-[11px] font-bold ${connection.permissions?.fundsQuery ? 'text-emerald-200' : 'text-slate-400'}`}>
                      {connection.permissions?.fundsQuery ? 'ERLAUBT' : 'NICHT ERLAUBT'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                    <div className="text-[9px] font-mono uppercase text-slate-500">Spot WebSocket Token</div>
                    <div className={`mt-1 text-[11px] font-bold ${connection.permissions?.websocketToken ? 'text-emerald-200' : 'text-slate-400'}`}>
                      {connection.permissions?.websocketToken ? 'ERLAUBT' : 'NICHT ERLAUBT'}
                    </div>
                  </div>
                </div>

                <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="opacity-70">Credential-Fingerprint</dt>
                    <dd className="mt-1 font-mono">{connection.credentialFingerprint || '—'}</dd>
                  </div>
                  <div>
                    <dt className="opacity-70">Zuletzt verifiziert</dt>
                    <dd className="mt-1 font-mono">{connection.lastVerifiedAt || '—'}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={testing}
                    onClick={() => void refresh()}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 text-xs font-bold text-cyan-100 disabled:opacity-50"
                  >
                    {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Verbindung prüfen
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void remove()}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 text-xs font-bold text-rose-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" /> Entfernen
                  </button>
                </div>
              </div>
            )}
          </section>

          {holdings.length > 0 && (
            <section className="rounded-2xl border border-cyan-500/20 bg-[#070b19]/80 p-5">
              <h2 className="text-xs font-black uppercase tracking-wider text-cyan-300">Read-only Verifikation</h2>
              <p className="mt-2 text-xs text-slate-400">Die Verbindung lieferte einen privaten Funds-Readback. Es werden keine Secrets dargestellt.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {holdings.slice(0, 12).map(item => (
                  <div key={item.asset} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="font-mono text-xs text-slate-300">{item.asset}</p>
                    <p className="mt-1 font-mono text-sm font-bold text-white">{item.balance}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-slate-800 bg-[#070b19]/70 p-4 text-[11px] leading-relaxed text-slate-400">
            <h2 className="font-black text-white">Credential-Grenze</h2>
            <p className="mt-2">
              Der aktuelle Vault-Slot ist ein Kraken-Spot-Credential. REST und die Berechtigung zum Erzeugen eines privaten Spot-WebSocket-Tokens werden als Capabilities desselben Spot-Keys geprüft.
            </p>
            <p className="mt-2 text-amber-200">
              Kraken Futures verwendet eine getrennte Authentifizierungsfamilie und ist in diesem Slot noch nicht speicherbar. Dafür ist eine additive Vault-Schemaerweiterung erforderlich; ein Futures-Key wird nicht als Spot-Key umgedeutet.
            </p>
          </section>
        </div>
      )}
    </AccountPageShell>
  );
}
