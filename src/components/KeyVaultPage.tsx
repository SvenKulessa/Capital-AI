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
import { PRIVATE_BYOK_PROVIDERS, isPrivateByokEnabled } from '../config/providers/privateByokCatalog';

interface ProviderConnection {
  provider: string;
  credentialFingerprint?: string;
  status?: 'PENDING' | 'VERIFIED' | 'INVALID' | 'REVOKED';
  dataScope?: string;
  lastVerifiedAt?: string | null;
  lastErrorCode?: string | null;
  permissions?: {
    fundsQuery?: boolean;
    reading?: boolean;
    spotConfigured?: boolean;
    websocketToken?: boolean;
    trading?: boolean;
    withdrawals?: boolean;
    spotTrading?: boolean;
    spotOrderCreate?: boolean;
    spotOrderCancel?: boolean;
    futuresConfigured?: boolean;
    futuresTrading?: boolean;
    perpetuals?: boolean;
    futuresAccess?: string;
    orderTypes?: string[];
    executionEnabled?: boolean;
    publicMarketDataAdmission?: boolean;
  };
}

interface Holding {
  asset: string;
  balance: string;
}

const PROVIDERS = PRIVATE_BYOK_PROVIDERS;

type ProviderId = (typeof PROVIDERS)[number]['id'];

async function readJson(response: Response) {
  return response.json().catch(() => null);
}

export function KeyVaultPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [provider, setProvider] = useState<ProviderId>('kraken');
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [credentialFamily, setCredentialFamily] = useState<'spot' | 'futures'>('spot');
  const [allowTrading, setAllowTrading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loadingVault, setLoadingVault] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const providerEnabled = isPrivateByokEnabled(provider);
  const currentProvider = PROVIDERS.find(item => item.id === provider) || PROVIDERS[0];

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
    if (!providerEnabled) {
      setError('Dieser Provider hat noch keinen sicher verifizierten Serveradapter. Es wurden keine Zugangsdaten übermittelt.');
      return;
    }
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
        body: JSON.stringify({ apiKey, apiSecret, credentialFamily, allowTrading }),
      });
      const body = await readJson(response);
      if (!response.ok) throw new Error(body?.code || body?.error || 'PROVIDER_SAVE_FAILED');

      setApiKey('');
      setApiSecret('');
      setShowSecret(false);
      setHoldings(Array.isArray(body?.holdings) ? body.holdings : []);
      const portfolio = body?.portfolioAvailable === true ? ' · Spot-Portfolio verfügbar' : '';
      const websocket = body?.capabilities?.websocketToken === true ? ' · WebSocket-Token erlaubt' : '';
      const trading = body?.capabilities?.trading === true ? ' · Orderrechte erkannt' : '';
      const family = credentialFamily === 'futures' ? 'Futures/Perps' : 'Spot';
      setFeedback(`${currentProvider.label}: ${family}-Credential wurde erfolgreich verifiziert und sicher gespeichert${portfolio}${websocket}${trading}. Live-Ausführung bleibt gesperrt.`);
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
                  API-Key und Private Secret werden nur zur Verifikation eingegeben. Nach erfolgreicher Speicherung werden beide Werte aus dem Browser-State entfernt; die Oberfläche zeigt anschließend ausschließlich Fingerprint und Vault-Status.
                </p>
              </div>

              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${statusClasses}`}>
                {connection?.status === 'VERIFIED' && <CheckCircle2 className="h-4 w-4" />}
                {loadingVault ? 'WIRD GELADEN' : !providerEnabled ? 'ADAPTER AUSSTEHEND' : connection?.status || 'NICHT VERBUNDEN'}
              </div>
            </div>

            <form onSubmit={save} className="mt-5 grid gap-4">
              <label className="text-xs font-bold text-slate-300">
                Provider
                <select
                  value={provider}
                  onChange={event => {
                    setProvider(event.target.value as ProviderId);
                    setApiKey('');
                    setApiSecret('');
                    setShowSecret(false);
                    setAllowTrading(false);
                    setCredentialFamily('spot');
                    setHoldings([]);
                    setFeedback('');
                    setError('');
                  }}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-3 text-sm text-white"
                >
                  {PROVIDERS.map(item => (
                    <option key={item.id} value={item.id}>{item.label}{item.availability !== 'active' ? ' · Adapter ausstehend' : ''}</option>
                  ))}
                </select>
                <span className="mt-1 block text-[10px] font-normal text-slate-500">
                  {currentProvider.category} · {currentProvider.description}
                </span>
              </label>

              {!providerEnabled && (
                <p role="status" className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-200">
                  Diese Schnittstelle ist im Katalog vorgemerkt. Der Server nimmt dafür noch keine API-Schlüssel an. Provideradapter, Berechtigungsprüfung, Kosten- und Lizenzbedingungen müssen zuerst technisch nachgewiesen werden.
                </p>
              )}

              <fieldset disabled={!providerEnabled} className="grid min-w-0 gap-4 disabled:opacity-50">
              <label className="text-xs font-bold text-slate-300">
                Credential-Familie
                <select
                  value={credentialFamily}
                  onChange={event => {
                    setCredentialFamily(event.target.value as 'spot' | 'futures');
                    setAllowTrading(false);
                  }}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-3 text-sm text-white"
                >
                  <option value="spot">Spot REST / WebSocket</option>
                  <option value="futures">Futures / Perpetuals</option>
                </select>
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

              <label className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={allowTrading}
                  onChange={event => setAllowTrading(event.target.checked)}
                  className="mt-0.5 h-4 w-4"
                />
                <span>
                  <strong className="text-amber-200">Orderrechte zulassen.</strong>{' '}
                  Der Key darf Market-/Limit-Orders der gewählten Credential-Familie ermöglichen.
                  CAPITAL-AI speichert die Capability, führt in diesem PR aber noch keine Live-Order aus.
                  Funding-, Transfer- und Withdrawal-Rechte bleiben unzulässig.
                </span>
              </label>

              <button
                type="submit"
                disabled={saving || !providerEnabled}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-black text-black disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                {credentialFamily === 'futures' ? 'Futures/Perps-Key' : 'Spot API-Key'} speichern & verifizieren
              </button>
              </fieldset>
            </form>

            {connection && (
              <div className={`mt-5 rounded-2xl border p-4 ${statusClasses}`}>
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  <p className="text-sm font-black">
                    {connection.status === 'VERIFIED' ? 'Provider erfolgreich verbunden' : 'Provider-Verbindungsstatus'}
                  </p>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                    <div className="text-[9px] font-mono uppercase text-slate-500">Provider REST Auth</div>
                    <div className={`mt-1 text-[11px] font-bold ${connection.status === 'VERIFIED' ? 'text-emerald-200' : 'text-amber-200'}`}>
                      {connection.status === 'VERIFIED' ? 'VERIFIZIERT' : 'NICHT VERIFIZIERT'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                    <div className="text-[9px] font-mono uppercase text-slate-500">{provider === 'binance' ? 'Privater Konto-Lesezugriff' : 'Portfolio / Query Funds'}</div>
                    <div className={`mt-1 text-[11px] font-bold ${(provider === 'binance' ? connection.permissions?.reading : connection.permissions?.fundsQuery) ? 'text-emerald-200' : 'text-slate-400'}`}>
                      {(provider === 'binance' ? connection.permissions?.reading : connection.permissions?.fundsQuery) ? 'ERLAUBT' : 'NICHT ERLAUBT'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                    <div className="text-[9px] font-mono uppercase text-slate-500">{provider === 'binance' ? 'Spot-Konto verbunden' : 'Spot WebSocket Token'}</div>
                    <div className={`mt-1 text-[11px] font-bold ${(provider === 'binance' ? connection.permissions?.spotConfigured : connection.permissions?.websocketToken) ? 'text-emerald-200' : 'text-slate-400'}`}>
                      {(provider === 'binance' ? connection.permissions?.spotConfigured : connection.permissions?.websocketToken) ? 'ERLAUBT' : 'NICHT ERLAUBT'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                    <div className="text-[9px] font-mono uppercase text-slate-500">Spot Orders</div>
                    <div className={`mt-1 text-[11px] font-bold ${connection.permissions?.spotTrading ? 'text-emerald-200' : 'text-slate-400'}`}>
                      {connection.permissions?.spotTrading ? 'MARKET + LIMIT BEREIT' : 'NICHT FREIGEGEBEN'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                    <div className="text-[9px] font-mono uppercase text-slate-500">Futures / Perps</div>
                    <div className={`mt-1 text-[11px] font-bold ${connection.permissions?.futuresTrading ? 'text-emerald-200' : 'text-slate-400'}`}>
                      {connection.permissions?.futuresTrading ? 'MARKET + LIMIT BEREIT' : connection.permissions?.futuresConfigured ? 'READ ONLY' : 'NICHT VERBUNDEN'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                    <div className="text-[9px] font-mono uppercase text-slate-500">Execution Gate</div>
                    <div className="mt-1 text-[11px] font-bold text-amber-200">
                      {connection.permissions?.executionEnabled ? 'AKTIV' : 'BLOCKED'}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3">
                  <div className="flex items-center gap-2 text-xs font-black text-cyan-100">
                    <LockKeyhole className="h-4 w-4" />
                    Supabase Vault · verschlüsselt gespeichert
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-300">
                    API-Key und Secret liegen gemeinsam im serverseitigen Supabase Vault. Vault speichert Secret-Inhalte authentifiziert verschlüsselt (AEAD) at rest; die Website erhält weder Klartext noch Ciphertext zurück. Sichtbar bleibt nur der nicht reversible Credential-Fingerprint.
                  </p>
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
                  {provider === 'kraken' && <button
                    type="button"
                    disabled={testing}
                    onClick={() => void refresh()}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 text-xs font-bold text-cyan-100 disabled:opacity-50"
                  >
                    {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Spot Funds prüfen
                  </button>}
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
              Die aktiven Kraken- und Binance-Vault-Slots enthalten getrennte Spot- und Futures/Perps-Credential-Familien. API-Key und Secret werden gemeinsam als versionierter Payload im serverseitigen Supabase Vault gespeichert. Die Website liest ausschließlich Metadaten/Fingerprint zurück; ein Futures-Key wird nicht als Spot-Key umgedeutet.
            </p>
            <p className="mt-2 text-amber-200">
              Nur Kraken und Binance sind heute als private Konto-Adapter verifiziert implementiert. Die weiteren 18 Katalogeinträge nehmen noch keine Credentials an. Trading-Rechte können für aktive Provider explizit zugelassen werden. Funding, Transfers und Withdrawals bleiben abgewiesen. Die erkannte Order-Capability bereitet den späteren MarketScreener für Market-/Limit-Orders vor; Live-Execution ist bis zu separaten Risk-, Confirmation- und Production-Gates deaktiviert.
            </p>
          </section>
        </div>
      )}
    </AccountPageShell>
  );
}
