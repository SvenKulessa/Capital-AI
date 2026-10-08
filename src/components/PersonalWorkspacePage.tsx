import { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { AccountPageShell } from '../features/account/AccountPageShell';

const MODULES = [
  { id: 'enterprise_scorer', label: 'Enterprise Scorer', detail: 'Quantitative Asset-Bewertung' },
  { id: 'buffett_value_check', label: 'Buffett Value Check', detail: 'Fundamentalanalyse' },
  { id: 'market_screener', label: 'Market Screener', detail: 'Filter und Ranglisten' },
  { id: 'market_sentiment', label: 'Market Sentiment', detail: 'Sentiment-Auswertung' },
  { id: 'sector_rotation', label: 'Sector Rotation', detail: 'Sektor- und Zyklusanalyse' },
  { id: 'whale_radar', label: 'Whale Radar', detail: 'On-Chain- und Flussanalyse' },
  { id: 'ai_newsfeed', label: 'AI Newsfeed', detail: 'Nachrichtenanalyse' },
] as const;
type ModuleId = (typeof MODULES)[number]['id'];
type Draft = { provider: string; modelProvider: string; modelId: string; bindingEnabled: boolean };
type Connection = { provider: string; status: string };
type StoredBinding = {
  moduleId: ModuleId;
  provider: string | null;
  modelProvider: string | null;
  modelId: string | null;
  bindingEnabled: boolean;
  executionEnabled: boolean;
  providerStatus: string;
};
const defaultDraft = (): Draft => ({
  provider: '', modelProvider: '', modelId: '', bindingEnabled: true,
});
const sources = [
  { value: '', label: 'Keine Datenquelle' },
  { value: 'kraken', label: 'Kraken' },
  { value: 'binance', label: 'Binance' },
  { value: 'massive', label: 'Massive / Polygon' },
];
const models = [
  { value: '', label: 'Kein KI-Modell' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'ollama', label: 'Ollama (lokal)' },
  { value: 'custom', label: 'Anderes Modell' },
];
const controlStyle = 'w-full min-h-11 rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400';
async function parseResponse(response: Response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'workspace_unavailable');
  return payload;
}

export function PersonalWorkspacePage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saved, setSaved] = useState<Record<string, StoredBinding>>({});
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const params = { credentials: 'same-origin' as const, cache: 'no-store' as const,
      signal: controller.signal, headers: { Accept: 'application/json' } };
    Promise.all([
      fetch('/api/profile/analysis-bindings', params).then(parseResponse),
      fetch('/api/profile/provider-connections', params).then(parseResponse),
    ]).then(([workspace, vault]) => {
      if (controller.signal.aborted) return;
      const bindings = Array.isArray(workspace?.bindings) ? workspace.bindings as StoredBinding[] : [];
      const nextSaved: Record<string, StoredBinding> = {};
      const nextDrafts: Record<string, Draft> = {};
      for (const binding of bindings) {
        if (!MODULES.some(module => module.id === binding.moduleId)) continue;
        nextSaved[binding.moduleId] = binding;
        nextDrafts[binding.moduleId] = {
          provider: binding.provider || '',
          modelProvider: binding.modelProvider || '',
          modelId: binding.modelId || '',
          bindingEnabled: binding.bindingEnabled,
        };
      }
      setSaved(nextSaved);
      setDrafts(nextDrafts);
      setConnections(Array.isArray(vault?.connections) ? vault.connections : []);
    }).catch(() => {
      if (!controller.signal.aborted) setError('Der private Workspace ist nicht erreichbar. Es wurden keine Einstellungen lokal gespeichert.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);

  const change = (id: string, patch: Partial<Draft>) => {
    setDrafts(current => ({
      ...current, [id]: { ...(current[id] || defaultDraft()), ...patch },
    }));
    setError(''); setMessage('');
  };

  async function save(id: ModuleId) {
    const draft = drafts[id] || defaultDraft();
    if (!draft.provider && !draft.modelProvider) {
      setError('Bitte mindestens eine eigene Datenquelle oder eine Modellpräferenz wählen.'); return;
    }
    if (draft.provider && !connections.some(item => item.provider === draft.provider && item.status === 'VERIFIED')) {
      setError('Die gewählte Datenquelle muss zunächst im persönlichen Key Vault verifiziert werden.'); return;
    }
    if (draft.modelProvider && !draft.modelId.trim()) {
      setError('Für die Modellpräferenz wird eine Modellkennung benötigt.'); return;
    }
    setPending(id); setError(''); setMessage('');
    try {
      await parseResponse(await fetch('/api/profile/analysis-bindings', {
        method: 'PUT', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          moduleId: id, provider: draft.provider || null,
          modelProvider: draft.modelProvider || null, modelId: draft.modelProvider ? draft.modelId.trim() : null,
          bindingEnabled: draft.bindingEnabled,
        }),
      }));
      setSaved(current => ({ ...current, [id]: {
        moduleId: id, provider: draft.provider || null,
        modelProvider: draft.modelProvider || null, modelId: draft.modelProvider ? draft.modelId.trim() : null,
        bindingEnabled: draft.bindingEnabled, executionEnabled: false,
        providerStatus: draft.provider ? 'VERIFIED_PRIVATE' : 'NOT_CONFIGURED',
      } }));
      setMessage('Zuordnung privat gespeichert. Keine Daten- oder Modellverarbeitung wurde aktiviert.');
    } catch {
      setError('Zuordnung nicht gespeichert. Vault-Verbindung, Berechtigung und Datenbankmigration prüfen.');
    } finally { setPending(null); }
  }

  async function remove(id: ModuleId) {
    setPending(id); setError(''); setMessage('');
    try {
      await parseResponse(await fetch('/api/profile/analysis-bindings/' + id, {
        method: 'DELETE', credentials: 'same-origin', cache: 'no-store',
      }));
      setSaved(current => { const copy = { ...current }; delete copy[id]; return copy; });
      setDrafts(current => ({ ...current, [id]: defaultDraft() }));
      setMessage('Modulzuordnung gelöscht.');
    } catch { setError('Modulzuordnung konnte nicht gelöscht werden.'); }
    finally { setPending(null); }
  }

  return (
    <AccountPageShell
      active="/profile/workspace"
      title="Mein Intelligence Workspace"
      description="Eigene Datenprovider und Modellpräferenzen pro Analysewerkzeug konfigurieren."
      onNavigate={onNavigate}
    >
      {() => (
        <div className="space-y-5">
          <section className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 sm:p-5">
            <div className="flex items-center gap-2 font-bold text-amber-200">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" /> Bring Your Own Key &amp; Model
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              CAPITAL AI liefert die Mathematik und Analysewerkzeuge. Die Daten und Zugänge bleiben nutzergebunden.
              Diese Seite speichert nur Modulzuordnungen und Modellkennungen – keine KI-Zugangsschlüssel.
              Modellaufrufe, Token-Abrechnung und die Weiterleitung privater Daten sind noch nicht freigeschaltet.
            </p>
            <button type="button" onClick={() => onNavigate('/profile/key-vault')}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-400/30 px-4 text-sm font-semibold text-amber-200 hover:bg-amber-400/10">
              <KeyRound className="h-4 w-4" aria-hidden="true" /> Eigene API-Keys verwalten
            </button>
          </section>
          {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
          {message && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p>}
          {loading ? (
            <p role="status" className="flex items-center gap-2 text-slate-300"><Loader2 className="h-4 w-4 animate-spin" /> Private Konfiguration wird geladen …</p>
          ) : (
            <section aria-label="Modulkonfigurationen" className="space-y-4">
              {MODULES.map(module => {
                const draft = drafts[module.id] || defaultDraft();
                const stored = saved[module.id];
                return (
                  <article key={module.id} className="rounded-2xl border border-white/10 bg-[#070b19] p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="font-bold text-white">{module.label}</h2>
                        <p className="mt-1 text-xs text-slate-400">{module.detail}</p>
                      </div>
                      <span className="rounded-full border border-white/15 px-2 py-1 text-xs text-slate-300">
                        {stored ? 'Privat konfiguriert' : 'Nicht konfiguriert'}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <label className="space-y-2 text-xs font-semibold text-slate-300">
                        <span>Datenprovider</span>
                        <select aria-label={module.label + ': Datenprovider'} className={controlStyle}
                          value={draft.provider} onChange={event => change(module.id, { provider: event.target.value })}>
                          {sources.map(source => <option key={source.value} value={source.value}
                            disabled={source.value !== '' && !connections.some(item => item.provider === source.value && item.status === 'VERIFIED')}>
                            {source.label}{source.value && !connections.some(item => item.provider === source.value && item.status === 'VERIFIED') ? ' · Vault benötigt' : ''}
                          </option>)}
                        </select>
                      </label>
                      <label className="space-y-2 text-xs font-semibold text-slate-300">
                        <span>KI-Modell-Anbieter (Vormerkung)</span>
                        <select aria-label={module.label + ': Modellanbieter'} className={controlStyle}
                          value={draft.modelProvider} onChange={event => change(module.id, { modelProvider: event.target.value, modelId: '' })}>
                          {models.map(model => <option key={model.value} value={model.value}>{model.label}</option>)}
                        </select>
                      </label>
                      <label className="space-y-2 text-xs font-semibold text-slate-300">
                        <span>Modellkennung (ohne API-Key)</span>
                        <input aria-label={module.label + ': Modellkennung'} className={controlStyle}
                          value={draft.modelId} placeholder="z. B. eigenes-modell-v1" maxLength={101}
                          disabled={!draft.modelProvider}
                          onChange={event => change(module.id, { modelId: event.target.value })} />
                      </label>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <label className="inline-flex min-h-11 items-center gap-2 text-xs text-slate-300">
                        <input type="checkbox" className="h-4 w-4 accent-amber-400"
                          checked={draft.bindingEnabled}
                          onChange={event => change(module.id, { bindingEnabled: event.target.checked })} />
                        Zuordnung vormerken
                      </label>
                      <button type="button" disabled={pending !== null}
                        onClick={() => void save(module.id)}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-400 px-4 text-xs font-bold text-black disabled:opacity-50">
                        {pending === module.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Speichern
                      </button>
                      {stored && <button type="button" disabled={pending !== null}
                        onClick={() => void remove(module.id)}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-500/30 px-4 text-xs font-bold text-rose-200 disabled:opacity-50">
                        <Trash2 className="h-4 w-4" /> Entfernen
                      </button>}
                    </div>
                    <p className="mt-3 text-xs text-slate-400">
                      Runtime: gesperrt · Kein Datenversand an KI-Anbieter · Keine Token-Belastung
                    </p>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      )}
    </AccountPageShell>
  );
}
