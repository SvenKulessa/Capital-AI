import React, { useEffect, useMemo, useState } from 'react';
import { LockKeyhole, GitBranch, RotateCcw } from 'lucide-react';
import { SHADOW_SCORE_CONFIG_V1 } from '../../config/shadowScoreConfig';
import { ProviderRegistryService } from '../../config/providers/providerRegistry';
import {
  ShadowPipelineConfigSchema,
  SCORE_FAMILIES,
  type ShadowPipelineConfig,
} from '../../contracts/pipelineExecution';
import { CANONICAL_50_COMPONENTS } from '../../contracts/analysisComponentRegistry';
import { type ConfigurationRevision } from '../../services/pipelineConfigurator';
import { type ShadowPipelineRun } from '../../services/shadowPipeline';
import { AnalysisShadowSession } from './AnalysisShadowSession';
import {
  AnalysisComponentExplorer,
  ComponentDependencyView,
} from './AnalysisComponentExplorer';
import { componentName, registrySummary } from './analysisPresentation';
import { useAnalysisQuery } from './useAnalysisQuery';
import {
  DataStatusBadge,
  EmptyMetric,
  panelClass,
  inputClass,
  buttonClass,
} from './AnalysisUi';
import { analysisUiEnabled } from './analysisUiFlags';

const VIEWS = [
  ['overview', 'Pipeline-Übersicht'],
  ['providers', 'Provider-Registry'],
  ['components', 'Komponenten-Registry'],
  ['dependencies', 'Feature-Abhängigkeiten'],
  ['freshness', 'Datenfrische'],
  ['quality', 'Datenqualität'],
  ['runs', 'Laufhistorie'],
  ['replay', 'Evidence & Replay'],
  ['configuration', 'Konfiguration & Diff'],
  ['benchmark', 'Shadow vs. Active'],
] as const;
const STAGE_NAMES = [
  'Ingestion',
  'Normalisierung',
  'Validierung',
  'Feature-Berechnung',
  'Scoring',
  'Ranking',
  'Evidence',
  'Auslieferung',
];

/** The same owner identity as the existing Control Center; presentation flags grant no authority. */
export function PipelineConfiguratorConsole() {
  const [access, setAccess] = useState<'checking' | 'allowed' | 'denied'>(
    'checking',
  );
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/session', {
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (!controller.signal.aborted)
          setAccess(
            s?.authenticated === true && s?.account?.iamRole === 'owner'
              ? 'allowed'
              : 'denied',
          );
      })
      .catch(() => {
        if (!controller.signal.aborted) setAccess('denied');
      });
    return () => controller.abort();
  }, []);
  if (!analysisUiEnabled('console'))
    return (
      <p className={panelClass}>
        Analyse-Konsole ist in dieser Auslieferung ausgeblendet.
      </p>
    );
  if (access !== 'allowed')
    return (
      <p role="status" className={panelClass}>
        <LockKeyhole className="mb-2 text-amber-300" />
        {access === 'checking'
          ? 'Berechtigung wird geprüft …'
          : 'Nur für den angemeldeten Owner verfügbar.'}
      </p>
    );
  return <AuthorizedConsole />;
}

function AuthorizedConsole() {
  const [view, setView] = useAnalysisQuery('consoleView', 'overview');
  const activeView = VIEWS.some((v) => v[0] === view) ? view : 'overview';
  const session = useMemo(() => new AnalysisShadowSession(), []);
  const providers = useMemo(
    () => ProviderRegistryService.getSelectableProviders(),
    [],
  );
  const summary = useMemo(registrySummary, []);
  const [config, setConfig] = useState<ShadowPipelineConfig>(() =>
    structuredClone(SHADOW_SCORE_CONFIG_V1),
  );
  const [draft, setDraft] = useState<ShadowPipelineConfig>(() =>
    structuredClone(SHADOW_SCORE_CONFIG_V1),
  );
  const [revisions, setRevisions] = useState<ConfigurationRevision[]>([]);
  const [runs, setRuns] = useState<ShadowPipelineRun[]>([]);
  const [replayId, setReplayId] = useState('');
  const [replayStatus, setReplayStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [profileIndex, setProfileIndex] = useState(0);
  const [dependencyId, setDependencyId] = useState(
    CANONICAL_50_COMPONENTS[0].componentId,
  );
  const dependency = CANONICAL_50_COMPONENTS.find(
    (c) => c.componentId === dependencyId,
  )!;
  const currentRun = replayId
    ? runs.find((r) => r.evidenceId === replayId)
    : runs[0];
  const diff =
    revisions.length > 1
      ? session.history.diff(
          revisions[revisions.length - 2],
          revisions[revisions.length - 1],
        )
      : [];
  const configEdit = <K extends keyof ShadowPipelineConfig>(
    key: K,
    value: ShadowPipelineConfig[K],
  ) => setDraft((previous) => ({ ...previous, [key]: value }));
  async function saveRevision() {
    setBusy(true);
    setError('');
    try {
      if (revisions.length >= 50) throw new Error('SESSION_REVISION_LIMIT');
      await session.history.append(SHADOW_SCORE_CONFIG_V1);
      const version = config.version.split('.').map(Number);
      version[2]++;
      const next = ShadowPipelineConfigSchema.parse({
        ...draft,
        version: version.join('.'),
        productionApproved: false,
        mode: 'shadow',
      });
      await session.history.append(next);
      setConfig(next);
      setDraft(structuredClone(next));
      setRevisions(session.history.history());
    } catch {
      setError(
        'Konfiguration nicht gespeichert: Gewichte müssen 100% ergeben; Mindestkonfidenz 90%, Datenqualität mindestens 90. Versions- und Sitzungslimits gelten.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function runOffline() {
    setBusy(true);
    setError('');
    try {
      const run = await session.pipeline.run(
        {
          runId: `demo-inspection-${runs.length + 1}`,
          evaluatedAt: Date.now(),
          horizon: '1d',
          regime: 'baseline',
          isDemo: true,
          asset: {
            assetId: 'capital-demo-inspection',
            symbol: 'DEMO',
            name: 'Offline-Diagnose ohne Marktdaten',
            assetClass: 'crypto',
            venue: 'DEMO',
            currency: 'USD',
            status: 'unverified',
          },
          features: [],
          rights: [],
          rawInputReferences: ['capital_ai_demo_engine:empty-diagnostic'],
        },
        config,
      );
      setRuns((previous) => [run, ...previous]);
      setReplayId(run.evidenceId);
      setReplayStatus('');
      setView('runs');
    } catch {
      setError(
        'Offline-Diagnose nicht abgeschlossen. Evidence-Readback oder Sitzungslimit prüfen.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function replay() {
    setBusy(true);
    setError('');
    setReplayStatus('');
    try {
      await session.pipeline.replay(replayId);
      setReplayStatus(
        'PASS · Hash und deterministisches Ergebnis stimmen überein. Nur Offline-Demo, kein Production-Nachweis.',
      );
    } catch {
      setError(
        'Replay nicht verifiziert: Evidence fehlt in dieser Sitzung oder der Hash stimmt nicht.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Pipeline Configurator Console" className="space-y-5">
      <header className={panelClass}>
        <p className="flex items-center gap-2 text-xs font-mono text-cyan-300">
          <GitBranch size={16} />
          OWNER · PIPELINE CONFIGURATOR
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">
          Datenwege und Entscheidungen prüfen
        </h2>
        <p className="mt-3 text-sm text-slate-300">
          Versionierte Shadow-Policy und Offline-Diagnose. Diese Konsole
          verändert keine produktiven Provider, Aktivierungen oder Broker.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <DataStatusBadge mode="unavailable" />
          <span className="text-xs text-amber-200">
            Production: nicht aktiviert · Konfiguration {config.version}
          </span>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Änderungen, Läufe und Evidence bleiben ausschließlich im
          Arbeitsspeicher dieser Seite. Beim Verlassen gehen sie verloren. Kein
          persistenter Audit-Store.
        </p>
      </header>
      <nav aria-label="Pipeline-Ansichten" className="flex flex-wrap gap-2">
        {VIEWS.map(([id, label]) => (
          <button
            type="button"
            key={id}
            aria-pressed={activeView === id}
            className={
              buttonClass +
              (activeView === id
                ? ' border-cyan-400 bg-cyan-400/10 text-cyan-200'
                : '')
            }
            onClick={() => setView(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-rose-400/40 p-4 text-sm text-rose-200"
        >
          {error}
        </p>
      )}
      {replayStatus && (
        <p
          role="status"
          className="rounded-lg border border-cyan-400/40 p-4 text-sm text-cyan-200"
        >
          {replayStatus}
        </p>
      )}
      {activeView === 'overview' && (
        <div className="space-y-4">
          <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {config.stages.map((id, i) => (
              <li className={panelClass} key={id}>
                <p className="text-xs font-mono text-amber-300">
                  STUFE {i + 1}
                </p>
                <h3 className="mt-2 font-semibold text-white">
                  {STAGE_NAMES[i]}
                </h3>
                <p className="mt-2 text-xs text-slate-400">
                  {[2, 4, 6].includes(i)
                    ? 'Offline-Ausführung für Diagnose verfügbar'
                    : 'Als Policy registriert; hier kein Runtime-Transport'}
                </p>
                <p className="mt-3 text-xs text-slate-300">
                  Status: kein produktiver Ausführungsnachweis
                </p>
              </li>
            ))}
          </ol>
          <div className={panelClass}>
            <h3 className="font-semibold text-white">
              Explizite DEMO-Diagnose
            </h3>
            <p className="my-3 text-sm text-slate-300">
              Prüft die konfigurierten Komponenten mit einem leeren
              Demo-Snapshot. Fehlende Inputs und Runner führen zu gesperrten
              Ergebnissen; keine erfundenen Marktwerte. Hash-Readback und Replay
              sind ausführbar.
            </p>
            <button
              type="button"
              disabled={busy}
              className={buttonClass}
              onClick={runOffline}
            >
              Offline-Demo prüfen ({config.componentIds.length} Komponenten)
            </button>
          </div>
        </div>
      )}
      {activeView === 'providers' && (
        <div className={panelClass}>
          <h3 className="font-semibold text-white">
            Provider-Katalog · keine Live-Health-Telemetrie
          </h3>
          <p className="my-3 text-sm text-slate-400">
            Stammdaten und Shadow-Zuordnung. Beispiel-Health, Preis- und
            Latenzfelder aus dem Provider-Katalog werden nicht als Laufzeitdaten
            ausgegeben. Private Vault-Verbindungen bleiben nutzergebunden.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr>
                  {[
                    'Provider',
                    'Protokolle',
                    'Shadow-Policy',
                    'Health / Latenz',
                  ].map((x) => (
                    <th
                      scope="col"
                      className="border-b border-slate-600 p-3"
                      key={x}
                    >
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p.id}>
                    <th scope="row" className="p-3 font-normal text-cyan-200">
                      {p.name}
                    </th>
                    <td className="p-3 text-slate-300">
                      {p.capabilities.protocols.join(', ')}
                    </td>
                    <td className="p-3">
                      {config.providers.find((x) => x.providerId === p.id)
                        ?.enabled
                        ? 'Zugeordnet · offline'
                        : 'Nicht zugeordnet'}
                    </td>
                    <td className="p-3 text-slate-400">Nicht gemessen</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className={buttonClass + ' mt-4'}
            onClick={() => setView('configuration')}
          >
            Shadow-Zuordnung bearbeiten
          </button>
        </div>
      )}
      {activeView === 'components' && <AnalysisComponentExplorer compact />}
      {activeView === 'dependencies' && (
        <div className={panelClass + ' space-y-4'}>
          <label className="block text-sm">
            Komponente
            <select
              value={dependencyId}
              onChange={(e) => setDependencyId(e.target.value)}
              className={inputClass + ' mt-2'}
            >
              {CANONICAL_50_COMPONENTS.map((c) => (
                <option key={c.componentId} value={c.componentId}>
                  {componentName(c)}
                </option>
              ))}
            </select>
          </label>
          <ComponentDependencyView component={dependency} />
          <p className="text-xs text-slate-400">
            Input-Verträge: {dependency.inputContracts.join(', ')}
          </p>
        </div>
      )}
      {activeView === 'freshness' && (
        <div className={panelClass}>
          <h3 className="font-semibold text-white">
            Freshness & Latenz · keine gemessenen Feeds
          </h3>
          <div className="my-4 grid gap-4 sm:grid-cols-3">
            <EmptyMetric
              label="Beobachtungsalter"
              required="Provider-Timestamp fehlt"
            />
            <EmptyMetric
              label="Ingestion-Latenz"
              required="Keine Runtime-Messung"
            />
            <EmptyMetric
              label="Stale-Feeds"
              required="Keine laufenden Feeds beobachtet"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="mb-3 text-left text-xs text-slate-400">
                Grenzwerte aus der Shadow-Konfiguration, keine gemessenen
                Alterswerte
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="p-2">
                    Provider
                  </th>
                  <th scope="col" className="p-2">
                    Refresh
                  </th>
                  <th scope="col" className="p-2">
                    Stale-Grenze
                  </th>
                </tr>
              </thead>
              <tbody>
                {config.providers.map((p) => (
                  <tr key={p.providerId}>
                    <th scope="row" className="p-2">
                      {p.providerId}
                    </th>
                    <td className="p-2">{p.refreshIntervalMs} ms</td>
                    <td className="p-2">{p.maxStalenessMs} ms</td>
                  </tr>
                ))}
                {!config.providers.length && (
                  <tr>
                    <td colSpan={3} className="p-3 text-slate-400">
                      Keine Provider in dieser Policy.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeView === 'quality' && (
        <div className={panelClass}>
          <h3 className="font-semibold text-white">
            Referenzprüfung und Datenqualität
          </h3>
          <p className="my-3 text-sm text-amber-200">
            {summary.report.issues.length} offene Registry-Referenzen. Dies ist
            eine statische Vertragsprüfung, kein gemessener Feed-Qualitätsindex.
          </p>
          <p className="mb-3 text-xs text-slate-300">
            Policy: Qualität ≥ {config.minQualityScore}/100 · Konfidenz ≥{' '}
            {config.minimumConfidence * 100}% ·{' '}
            {config.minimumProvidersPerFeature} Quellen je Feature
          </p>
          <ul className="max-h-96 space-y-2 overflow-y-auto text-xs">
            {summary.report.issues.map((issue, i) => (
              <li
                key={i}
                className="break-words rounded border border-slate-700 p-3"
              >
                <code className="text-amber-200">{issue.code}</code>
                <p className="mt-1 text-slate-400">
                  {issue.componentId} · {issue.reference}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {activeView === 'runs' && (
        <div className={panelClass}>
          <div className="flex flex-wrap justify-between gap-3">
            <h3 className="font-semibold text-white">
              Läufe dieser Sitzung · Offline DEMO
            </h3>
            <button
              type="button"
              className={buttonClass}
              disabled={busy}
              onClick={runOffline}
            >
              Neue Diagnose
            </button>
          </div>
          <p className="my-3 text-xs text-slate-400">
            Keine produktive Laufhistorie angebunden.
          </p>
          <ul className="space-y-3">
            {runs.map((run) => (
              <li
                key={run.evidenceId}
                className="rounded-xl border border-slate-700 p-3"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <DataStatusBadge mode="simulated" />
                  <span className="text-sm">
                    {new Date(run.result.computedAt).toLocaleString('de-DE')} ·{' '}
                    {run.result.components.length} geprüft ·{' '}
                    {
                      run.result.components.filter(
                        (c) => c.status === 'blocked',
                      ).length
                    }{' '}
                    gesperrt
                  </span>
                </div>
                <p className="my-2 break-all font-mono text-xs text-slate-400">
                  {run.evidenceId}
                </p>
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => {
                    setReplayId(run.evidenceId);
                    setView('replay');
                    setReplayStatus('');
                  }}
                >
                  Evidence inspizieren
                </button>
              </li>
            ))}
          </ul>
          {!runs.length && (
            <p role="status" className="text-sm text-slate-400">
              Noch keine Offline-Läufe.
            </p>
          )}
        </div>
      )}
      {activeView === 'replay' && (
        <div className={panelClass + ' space-y-4'}>
          <h3 className="font-semibold text-white">
            Evidence- und Replay-Inspector
          </h3>
          <label className="block text-sm">
            Evidence-ID dieser Sitzung
            <input
              value={replayId}
              onChange={(e) => {
                setReplayId(e.target.value);
                setReplayStatus('');
              }}
              className={inputClass + ' mt-2 font-mono'}
              placeholder="EVD-…"
            />
          </label>
          <button
            type="button"
            className={buttonClass}
            disabled={busy || !replayId}
            onClick={replay}
          >
            <RotateCcw className="mr-2 inline" size={16} />
            Deterministisch replayen
          </button>
          {currentRun && (
            <>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {[
                  ['Modellversion', currentRun.result.modelVersion],
                  ['Gewichtsversion', currentRun.result.weightVersion],
                  ['Datenstatus', 'DEMO · keine Fakten'],
                  ['Eligibility', 'Gesperrt'],
                  ['Finaler Rang', 'Nicht veröffentlicht'],
                  ['Candidate-Score', 'Nicht verfügbar'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-slate-400">{label}</dt>
                    <dd className="mt-1">{value}</dd>
                  </div>
                ))}
              </dl>
              <details>
                <summary className="cursor-pointer text-cyan-200">
                  Komponentenergebnisse und Reason-Codes
                </summary>
                <ul className="mt-3 max-h-96 space-y-3 overflow-auto text-xs">
                  {currentRun.result.components.map((c) => (
                    <li
                      key={c.componentId}
                      className="rounded border border-slate-700 p-3"
                    >
                      <p className="font-semibold">
                        {c.componentId} · {c.status} · {c.score ?? 'kein Score'}
                      </p>
                      <p className="mt-2 break-words text-slate-400">
                        {c.reasonCodes.join(' · ')}
                      </p>
                    </li>
                  ))}
                </ul>
              </details>
              <p className="break-words text-xs text-amber-200">
                {currentRun.result.reasonCodes.join(' · ')}
              </p>
            </>
          )}
        </div>
      )}
      {activeView === 'configuration' && (
        <div className={panelClass + ' space-y-5'}>
          <h3 className="font-semibold text-white">
            Shadow-Entwurf · Version {config.version}
          </h3>
          <p className="text-sm text-slate-400">
            Providerzuordnung und Gewichte gelten ausschließlich für
            Offline-Auswertung. Speichern erzeugt eine validierte Revision mit
            SHA-256-Fingerprint.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              ['minimumConfidence', 'minQualityScore', 'maxRiskScore'] as const
            ).map((key) => (
              <label key={key} className="text-xs text-slate-300">
                {
                  {
                    minimumConfidence: 'Mindestkonfidenz (0,9–1)',
                    minQualityScore: 'Mindestqualität (90–100)',
                    maxRiskScore: 'Risiko-Vetogrenze (0–100)',
                  }[key]
                }
                <input
                  type="number"
                  min={
                    key === 'minimumConfidence'
                      ? 0.9
                      : key === 'minQualityScore'
                        ? 90
                        : 0
                  }
                  max={key === 'minimumConfidence' ? 1 : 100}
                  step={key === 'minimumConfidence' ? 0.01 : 1}
                  className={inputClass + ' mt-1'}
                  value={draft[key]}
                  onChange={(e) => configEdit(key, Number(e.target.value))}
                />
              </label>
            ))}
          </div>
          <label className="block text-sm">
            Asset-Class / Horizont / Regime
            <select
              value={profileIndex}
              onChange={(e) => setProfileIndex(Number(e.target.value))}
              className={inputClass + ' mt-2'}
            >
              {draft.profiles.map((p, i) => (
                <option value={i} key={i}>
                  {p.assetClass} / {p.horizon} / {p.regime}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            {SCORE_FAMILIES.map((family) => (
              <label className="text-xs text-slate-300" key={family}>
                {family} · Gewicht (%)
                <input
                  className={inputClass + ' mt-1'}
                  type="number"
                  min={0}
                  max={100}
                  value={Math.round(
                    draft.profiles[profileIndex].weights[family] * 100,
                  )}
                  onChange={(e) =>
                    configEdit(
                      'profiles',
                      draft.profiles.map((p, i) =>
                        i === profileIndex
                          ? {
                              ...p,
                              weights: {
                                ...p.weights,
                                [family]: Number(e.target.value) / 100,
                              },
                            }
                          : p,
                      ),
                    )
                  }
                />
              </label>
            ))}
          </div>
          <p className="text-xs text-amber-200">
            Gewichtssumme:{' '}
            {Math.round(
              Object.values(draft.profiles[profileIndex].weights).reduce(
                (a, b) => a + b,
                0,
              ) * 100,
            )}
            % · muss 100% sein. Weitere Anlageklassen haben noch kein exaktes
            Gewichtprofil.
          </p>
          <details>
            <summary className="cursor-pointer py-2 text-cyan-200">
              Provider-Routing, Intervalle und Fallback-Policy
            </summary>
            <div className="mt-3 space-y-3">
              {providers.map((provider) => {
                const p = draft.providers.find(
                  (p) => p.providerId === provider.id,
                );
                return (
                  <div
                    key={provider.id}
                    className="rounded border border-slate-700 p-3"
                  >
                    <label className="flex min-h-11 items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={p?.enabled ?? false}
                        onChange={(e) => {
                          const previous = draft.providers.filter(
                            (x) => x.providerId !== provider.id,
                          );
                          configEdit('providers', [
                            ...previous,
                            {
                              providerId: provider.id,
                              enabled: e.target.checked,
                              priority: p?.priority ?? previous.length,
                              featureFamilies: p?.featureFamilies ?? [
                                ...SCORE_FAMILIES,
                              ],
                              refreshIntervalMs: p?.refreshIntervalMs ?? 1000,
                              maxStalenessMs: p?.maxStalenessMs ?? 30000,
                              retryCount: p?.retryCount ?? 0,
                              timeoutMs: p?.timeoutMs ?? 1000,
                              fallbackProviderIds: p?.fallbackProviderIds ?? [],
                            },
                          ]);
                        }}
                      />
                      {provider.name} · Shadow-Zuordnung
                    </label>
                    {p && (
                      <div className="grid gap-3 sm:grid-cols-3">
                        {(
                          [
                            'priority',
                            'refreshIntervalMs',
                            'maxStalenessMs',
                          ] as const
                        ).map((key) => (
                          <label className="text-xs" key={key}>
                            {
                              {
                                priority: 'Quellenpriorität',
                                refreshIntervalMs: 'Refresh (ms)',
                                maxStalenessMs: 'Stale-Grenze (ms)',
                              }[key]
                            }
                            <input
                              type="number"
                              min={key === 'priority' ? 0 : 1}
                              className={inputClass + ' mt-1'}
                              value={p[key]}
                              onChange={(e) =>
                                configEdit(
                                  'providers',
                                  draft.providers.map((x) =>
                                    x.providerId === p.providerId
                                      ? { ...x, [key]: Number(e.target.value) }
                                      : x,
                                  ),
                                )
                              }
                            />
                          </label>
                        ))}
                      </div>
                    )}
                    {p && (
                      <div className="mt-3 flex flex-wrap gap-3">
                        {SCORE_FAMILIES.map((f) => (
                          <label
                            key={f}
                            className="flex min-h-11 items-center gap-2 text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={p.featureFamilies.includes(f)}
                              onChange={(e) =>
                                configEdit(
                                  'providers',
                                  draft.providers.map((x) =>
                                    x.providerId === p.providerId
                                      ? {
                                          ...x,
                                          featureFamilies: e.target.checked
                                            ? [...x.featureFamilies, f]
                                            : x.featureFamilies.filter(
                                                (v) => v !== f,
                                              ),
                                        }
                                      : x,
                                  ),
                                )
                              }
                            />
                            {f}
                          </label>
                        ))}
                      </div>
                    )}
                    {p && (
                      <label className="mt-3 block text-xs">
                        Fallback (nur aus zugeordneten Providern)
                        <select
                          className={inputClass + ' mt-1'}
                          value={p.fallbackProviderIds[0] ?? ''}
                          onChange={(e) =>
                            configEdit(
                              'providers',
                              draft.providers.map((x) =>
                                x.providerId === p.providerId
                                  ? {
                                      ...x,
                                      fallbackProviderIds: e.target.value
                                        ? [e.target.value]
                                        : [],
                                    }
                                  : x,
                              ),
                            )
                          }
                        >
                          <option value="">Kein Fallback</option>
                          {draft.providers
                            .filter((x) => x.providerId !== p.providerId)
                            .map((x) => (
                              <option key={x.providerId} value={x.providerId}>
                                {x.providerId}
                              </option>
                            ))}
                        </select>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </details>
          <details>
            <summary className="cursor-pointer py-2 text-cyan-200">
              Komponenten für Offline-Shadow-Läufe auswählen
            </summary>
            <div className="grid gap-2 sm:grid-cols-2">
              {CANONICAL_50_COMPONENTS.map((c) => (
                <label
                  key={c.componentId}
                  className="flex min-h-11 items-center gap-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={draft.componentIds.includes(c.componentId)}
                    onChange={(e) =>
                      configEdit(
                        'componentIds',
                        e.target.checked
                          ? [...draft.componentIds, c.componentId]
                          : draft.componentIds.filter(
                              (id) => id !== c.componentId,
                            ),
                      )
                    }
                  />
                  {componentName(c)}
                </label>
              ))}
            </div>
          </details>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={buttonClass}
              disabled={busy}
              onClick={saveRevision}
            >
              Shadow-Revision speichern
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={busy}
              onClick={() => setDraft(structuredClone(config))}
            >
              Entwurf verwerfen
            </button>
            <button type="button" className={buttonClass} disabled>
              Production-Aktivierung nicht verfügbar
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Produktivaktivierung erfordert einen gesicherten Serverpfad und
            explizite Bestätigung. Diese Sitzung besitzt keine Write-Authority
            für Production.
          </p>
          <h4 className="text-sm font-semibold">Configuration Diff</h4>
          <p className="text-xs text-slate-300">
            {diff.length
              ? 'Geänderte Felder: ' + diff.join(', ')
              : 'Noch keine gespeicherte Änderung.'}
          </p>
          <ul className="space-y-2 text-xs">
            {revisions.map((r) => (
              <li
                key={r.fingerprint}
                className="break-all rounded border border-slate-700 p-3"
              >
                v{r.config.version} · {r.fingerprint} · productionApproved=false
              </li>
            ))}
          </ul>
        </div>
      )}
      {activeView === 'benchmark' && (
        <div className={panelClass}>
          <h3 className="font-semibold text-white">
            Shadow vs. Active · kein vergleichbarer Runtime-Lauf
          </h3>
          <div className="my-4 grid gap-4 sm:grid-cols-3">
            <EmptyMetric label="Active-Latenz" required="Nicht gemessen" />
            <EmptyMetric
              label="Shadow-Latenz"
              required="Kein Provider-Roundtrip"
            />
            <EmptyMetric
              label="Ergebnisabweichung"
              required="Keine identische aktive Kohorte"
            />
          </div>
          <p className="text-sm text-slate-300">
            Offline-Diagnosen: {runs.length}. Diese Zahl misst keine produktive
            Kapazität. Eine sub-45-ms-Aussage ist hier nicht nachgewiesen.
          </p>
        </div>
      )}
    </section>
  );
}
