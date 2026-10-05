import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyRound,
  LineChart,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Wifi,
} from 'lucide-react';

export interface KrakenHolding {
  asset: string;
  balance: string;
}

interface ProviderConnection {
  provider: string;
  credentialSlot?: 'spot_rest' | 'spot_websocket' | 'futures';
  keyName?: string;
  credentialFingerprint?: string;
  permissions?: {
    providerFamily?: string;
    permissions?: string[];
    fundsQuery?: boolean;
    websocketToken?: boolean;
    trading?: boolean;
    withdrawals?: boolean;
    generalAccess?: string;
    transferAccess?: string;
  };
  status?: 'PENDING' | 'VERIFIED' | 'INVALID' | 'REVOKED';
  dataScope?: string;
  lastVerifiedAt?: string | null;
  lastErrorCode?: string | null;
}

type Slot = 'spot_rest' | 'spot_websocket' | 'futures';

interface Draft {
  keyName: string;
  apiKey: string;
  apiSecret: string;
}

const SLOT_META: Array<{
  slot: Slot;
  path: string;
  label: string;
  subtitle: string;
  defaultName: string;
  icon: typeof KeyRound;
}> = [
  {
    slot: 'spot_rest',
    path: 'spot-rest',
    label: 'Kraken Spot REST',
    subtitle: 'Private REST-Aufrufe und persönlicher Account-Kontext',
    defaultName: 'CAPITAL-AI Spot REST',
    icon: KeyRound,
  },
  {
    slot: 'spot_websocket',
    path: 'spot-websocket',
    label: 'Kraken WebSocket/Auth',
    subtitle: 'Privater WebSocket-Token über Spot-API-Key',
    defaultName: 'CAPITAL-AI WebSocket Auth',
    icon: Wifi,
  },
  {
    slot: 'futures',
    path: 'futures',
    label: 'Kraken Futures',
    subtitle: 'Separater Derivatives-/Futures-Credential-Slot',
    defaultName: 'CAPITAL-AI Futures',
    icon: LineChart,
  },
];

function emptyDrafts(): Record<Slot, Draft> {
  return Object.fromEntries(
    SLOT_META.map(item => [item.slot, { keyName: item.defaultName, apiKey: '', apiSecret: '' }]),
  ) as Record<Slot, Draft>;
}

async function readJson(response: Response) {
  return response.json().catch(() => null);
}

function statusClasses(status?: ProviderConnection['status']) {
  if (status === 'VERIFIED') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (status === 'INVALID') return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
  if (status === 'PENDING') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  return 'border-slate-700 bg-slate-900 text-slate-400';
}

export function KrakenVaultBadges({
  onHoldings,
}: {
  onHoldings: (holdings: KrakenHolding[]) => void;
}) {
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [drafts, setDrafts] = useState<Record<Slot, Draft>>(emptyDrafts);
  const [busySlot, setBusySlot] = useState<Slot | null>(null);
  const [testingBalance, setTestingBalance] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bySlot = useMemo(() => {
    const map = new Map<Slot, ProviderConnection>();
    for (const connection of connections) {
      if (connection.provider !== 'kraken' || !connection.credentialSlot) continue;
      map.set(connection.credentialSlot, connection);
    }
    return map;
  }, [connections]);

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
    void loadConnections().catch(() => setError('Vault-Status konnte nicht geladen werden.'));
  }, []);

  const updateDraft = (slot: Slot, patch: Partial<Draft>) => {
    setDrafts(current => ({ ...current, [slot]: { ...current[slot], ...patch } }));
  };

  const save = async (slot: Slot, path: string) => {
    const draft = drafts[slot];
    setBusySlot(slot);
    setFeedback(null);
    setError(null);
    try {
      const response = await fetch(`/api/profile/provider-connections/kraken/${path}`, {
        method: 'PUT',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyName: draft.keyName,
          apiKey: draft.apiKey,
          apiSecret: draft.apiSecret,
        }),
      });
      const body = await readJson(response);
      if (!response.ok) throw new Error(body?.code || body?.error || 'KRAKEN_SAVE_FAILED');
      updateDraft(slot, { apiKey: '', apiSecret: '' });
      setFeedback(`${SLOT_META.find(item => item.slot === slot)?.label || 'Kraken'} wurde verifiziert und im persönlichen Vault gespeichert.`);
      await loadConnections();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? `Credential konnte nicht gespeichert werden: ${reason.message}`
          : 'Credential konnte nicht gespeichert werden.',
      );
    } finally {
      setBusySlot(null);
    }
  };

  const remove = async (slot: Slot, path: string) => {
    setBusySlot(slot);
    setFeedback(null);
    setError(null);
    try {
      const response = await fetch(`/api/profile/provider-connections/kraken/${path}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('DELETE_FAILED');
      if (slot === 'spot_rest') onHoldings([]);
      setFeedback('Credential-Slot und zugehöriges Vault-Secret wurden gelöscht.');
      await loadConnections();
    } catch {
      setError('Credential-Slot konnte nicht gelöscht werden.');
    } finally {
      setBusySlot(null);
    }
  };

  const loadBalance = async () => {
    setTestingBalance(true);
    setFeedback(null);
    setError(null);
    try {
      const response = await fetch('/api/profile/provider-connections/kraken/spot-rest/balance', {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const body = await readJson(response);
      if (!response.ok) throw new Error(body?.code || body?.error || 'KRAKEN_READ_FAILED');
      onHoldings(Array.isArray(body?.holdings) ? body.holdings : []);
      setFeedback('Privater Kraken-Spot-Kontext wurde neu gelesen.');
      await loadConnections();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? `Privater Kraken-Kontext nicht verfügbar: ${reason.message}`
          : 'Privater Kraken-Kontext nicht verfügbar.',
      );
    } finally {
      setTestingBalance(false);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-[#070b19]/90 p-5 md:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-amber-300">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-xs font-black uppercase tracking-wider">Kraken Vault</span>
          </div>
          <h2 className="mt-2 text-lg font-black">Drei getrennte API-Credential-Badges</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
            Jeder Schlüssel erhält einen eigenen Namen und Slot. Die eigentlichen Public-/Private-Key-Werte
            werden nach dem Speichern geleert und niemals aus dem Vault zurück an den Browser gegeben.
          </p>
        </div>
        <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black text-cyan-200">
          USER PRIVATE · BYOK
        </span>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
          {error}
        </div>
      )}
      {feedback && (
        <div role="status" className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
          {feedback}
        </div>
      )}

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        {SLOT_META.map(meta => {
          const connection = bySlot.get(meta.slot);
          const draft = drafts[meta.slot];
          const Icon = meta.icon;
          const busy = busySlot === meta.slot;
          const permissionSummary = connection?.permissions?.permissions?.join(', ')
            || connection?.permissions?.generalAccess
            || '—';

          return (
            <section key={meta.slot} className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2 text-amber-300">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">{meta.label}</h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{meta.subtitle}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-1 font-mono text-[9px] font-bold ${statusClasses(connection?.status)}`}>
                  {connection?.status || 'LEER'}
                </span>
              </div>

              {connection && (
                <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-black/30 p-3 text-[10px]">
                  <div>
                    <span className="text-slate-500">Name</span>
                    <p className="mt-0.5 break-words font-bold text-slate-200">{connection.keyName || '—'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Fingerprint</span>
                    <p className="mt-0.5 break-all font-mono text-slate-300">{connection.credentialFingerprint || '—'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Berechtigungen</span>
                    <p className="mt-0.5 break-words font-mono text-cyan-300">{permissionSummary}</p>
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-3">
                <label className="block text-[11px] font-bold text-slate-300">
                  API-Key-Name
                  <input
                    type="text"
                    value={draft.keyName}
                    onChange={event => updateDraft(meta.slot, { keyName: event.target.value })}
                    maxLength={80}
                    autoComplete="off"
                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2.5 text-xs text-white outline-none focus:border-amber-400"
                    placeholder={meta.defaultName}
                  />
                </label>
                <label className="block text-[11px] font-bold text-slate-300">
                  Public API Key
                  <input
                    type="password"
                    value={draft.apiKey}
                    onChange={event => updateDraft(meta.slot, { apiKey: event.target.value })}
                    minLength={8}
                    maxLength={512}
                    autoComplete="off"
                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2.5 font-mono text-xs text-white outline-none focus:border-amber-400"
                    placeholder="wird nicht erneut angezeigt"
                  />
                </label>
                <label className="block text-[11px] font-bold text-slate-300">
                  Private API Secret
                  <input
                    type="password"
                    value={draft.apiSecret}
                    onChange={event => updateDraft(meta.slot, { apiSecret: event.target.value })}
                    minLength={16}
                    maxLength={1024}
                    autoComplete="new-password"
                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2.5 font-mono text-xs text-white outline-none focus:border-amber-400"
                    placeholder="verschlüsselte Ablage im Vault"
                  />
                </label>

                <button
                  type="button"
                  disabled={busy || !draft.keyName.trim() || !draft.apiKey || !draft.apiSecret}
                  onClick={() => void save(meta.slot, meta.path)}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-3 text-xs font-black text-black disabled:opacity-40"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                  Speichern & prüfen
                </button>

                {connection && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(meta.slot, meta.path)}
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 text-[11px] font-bold text-rose-200 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Slot löschen
                  </button>
                )}

                {meta.slot === 'spot_rest' && connection?.status === 'VERIFIED' && (
                  <button
                    type="button"
                    disabled={testingBalance}
                    onClick={() => void loadBalance()}
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 text-[11px] font-bold text-cyan-200 disabled:opacity-40"
                  >
                    {testingBalance ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Private Bestände laden
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-100">
        Withdrawal-/Transfer-Rechte werden vom Vault nicht akzeptiert. Ein Futures-Key darf Trading-Rechte besitzen,
        löst durch das Speichern oder Prüfen aber niemals selbst einen Trade aus.
      </div>
    </div>
  );
}
