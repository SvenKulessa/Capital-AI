import React from 'react';
import { PROJECT_OWNERS, ROADMAP_SNAPSHOT, ROADMAP_STAGES, WORK_PACKAGES } from '../data/roadmapData';
import type { ProjectOwner, RoadmapEvidenceState } from '../data/roadmapData';
import mergeAuditData from '../data/roadmapMergeReconciliation.json';
const mergeAudit = mergeAuditData as unknown as {
  state: string; lastReconciledPr: number | null; unproven?: number;
};

const STATES: Record<RoadmapEvidenceState, { label: string; style: string }> = {
  VERIFIED: { label: 'VERIFIED · Repo umgesetzt', style: 'border-emerald-400/40 text-emerald-300' },
  OFFEN: { label: 'OFFEN · Prüfung / Umsetzung', style: 'border-amber-400/40 text-amber-300' },
  GEHALTEN: { label: 'GEHALTEN · Freigabe ausstehend', style: 'border-rose-400/40 text-rose-300' },
  UNGEKLÄRT: { label: 'UNGEKLÄRT · Backlog-Ziel', style: 'border-slate-600 text-slate-300' },
};

const PROJECT_OWNER_BY_ID = new Map<ProjectOwner, (typeof PROJECT_OWNERS)[number]>(
  PROJECT_OWNERS.map(project => [project.id, project]),
);

type RepositoryStatus = {
  repository: string;
  sourceSha: string;
  deployedSha: string | null;
  observedAt: string;
  freshness: 'LIVE' | 'CACHED' | 'STALE';
};
const REPOSITORY_SYNC_INTERVAL_MS = 90 * 60 * 1000;
const SOURCE_SHA = /^[a-f0-9]{40}$/;

export const RoadmapPanel: React.FC = () => {
  const [selectedOwners, setSelectedOwners] = React.useState<ProjectOwner[]>(
    () => PROJECT_OWNERS.map(project => project.id),
  );
  const [repositoryStatus, setRepositoryStatus] = React.useState<RepositoryStatus | null>(null);
  const [syncError, setSyncError] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [lastSyncAttempt, setLastSyncAttempt] = React.useState<number>(0);

  const syncRepository = React.useCallback(async (signal?: AbortSignal) => {
    setSyncing(true);
    try {
      const response = await fetch('/api/internal/repository-tools', {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal,
      });
      if (!response.ok) throw new Error('repository_unavailable');
      const data: unknown = await response.json();
      const payload = data as Record<string, unknown>;
      if (!payload || payload.schema !== 'CAPITAL_AI_REPOSITORY_TOOL_CATALOG@1' ||
          typeof payload.sourceSha !== 'string' || !SOURCE_SHA.test(payload.sourceSha) ||
          typeof payload.repository !== 'string' ||
          typeof payload.observedAt !== 'string' ||
          !['LIVE', 'CACHED', 'STALE'].includes(String(payload.freshness))) {
        throw new Error('invalid_repository_snapshot');
      }
      if (!signal?.aborted) {
        setRepositoryStatus({
          repository: payload.repository,
          sourceSha: payload.sourceSha,
          deployedSha: typeof payload.deployedSha === 'string' && SOURCE_SHA.test(payload.deployedSha)
            ? payload.deployedSha : null,
          observedAt: payload.observedAt,
          freshness: payload.freshness as RepositoryStatus['freshness'],
        });
        setSyncError(payload.freshness === 'STALE');
      }
    } catch {
      if (!signal?.aborted) setSyncError(true);
    } finally {
      if (!signal?.aborted) {
        setSyncing(false);
        setLastSyncAttempt(Date.now());
      }
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    void syncRepository(controller.signal);
    const interval = window.setInterval(() => {
      if (!document.hidden) void syncRepository(controller.signal);
    }, REPOSITORY_SYNC_INTERVAL_MS);
    const resume = () => {
      if (!document.hidden && Date.now() - lastAttempt.current >= REPOSITORY_SYNC_INTERVAL_MS) {
        void syncRepository(controller.signal);
      }
    };
    document.addEventListener('visibilitychange', resume);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [syncRepository]);

  const lastAttempt = React.useRef(0);
  React.useEffect(() => { lastAttempt.current = lastSyncAttempt; }, [lastSyncAttempt]);
  const toggleOwner = (id: ProjectOwner) =>
    setSelectedOwners(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  const [selectedStates, setSelectedStates] = React.useState<RoadmapEvidenceState[]>(
    () => Object.keys(STATES) as RoadmapEvidenceState[],
  );
  const toggleState = (value: RoadmapEvidenceState) =>
    setSelectedStates(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
  const [search, setSearch] = React.useState('');
  const packages = WORK_PACKAGES.filter(item =>
    selectedOwners.includes(item.owner) &&
    selectedStates.includes(item.evidenceState) &&
    `${item.id} ${item.title} ${item.description}`.toLocaleLowerCase('de').includes(search.toLocaleLowerCase('de'))
  );
  return <section aria-labelledby="roadmap-heading" className="my-6">
    <h2 id="roadmap-heading" className="text-xl font-bold">Roadmap · belegter Repo-Stand</h2>
    <div className="mt-3 space-y-2 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-white">Repository main:</span>
        {repositoryStatus
          ? <a href={`https://github.com/${repositoryStatus.repository}/commit/${repositoryStatus.sourceSha}`}
              className="text-cyan-300 underline underline-offset-2" target="_blank" rel="noopener noreferrer">
              {repositoryStatus.sourceSha.slice(0, 12)}
            </a>
          : <span className="text-amber-300">Noch nicht live verifiziert</span>}
        {repositoryStatus && <span className="text-xs">{repositoryStatus.freshness} · Quelle gelesen {new Date(repositoryStatus.observedAt).toLocaleString('de-DE')}</span>}
        <button type="button" disabled={syncing} onClick={() => void syncRepository()}
          className="ml-auto min-h-10 rounded-lg border border-slate-600 px-3 py-1.5 text-xs hover:bg-white/5 disabled:opacity-60">
          {syncing ? 'Aktualisiere …' : 'Jetzt abgleichen'}
        </button>
      </div>
      <p className="text-xs text-slate-400">Automatischer GitHub-Abgleich alle 90 Minuten, solange das Control Center geöffnet ist.
        Letzter Code-/Dokumentenabgleich: {mergeAudit.lastReconciledPr
          ? <a className="ml-1 text-cyan-300 underline underline-offset-2"
              href={`https://github.com/SvenKulessa/Capital-AI/pull/${mergeAudit.lastReconciledPr}`}>
              PR #{mergeAudit.lastReconciledPr}
            </a>
          : <span className="ml-1 text-amber-300">noch kein vollständiger 10er-Merge-Abgleich</span>}.
        Der Abgleich dokumentiert Quellen und Belegpfade; fachliche Abschlussbewertungen bleiben gesondert.
      </p>
      {repositoryStatus?.deployedSha && <p className="text-xs text-slate-400">Webservice: {repositoryStatus.deployedSha.slice(0, 12)}
        {repositoryStatus.deployedSha !== repositoryStatus.sourceSha && <span className="text-amber-300"> · Deployment weicht von main ab</span>}
      </p>}
      {syncError && <p role="alert" className="text-xs text-amber-300">GitHub-Abgleich fehlgeschlagen oder veraltet. Der letzte verifizierte Stand bleibt sichtbar.</p>}
      <p className="text-xs text-slate-500">Automatischer Abgleich nach jeweils 10 gemergten PRs, Änderungs-PR mit geprüftem Ergebnis.
        {mergeAudit.state === 'RECONCILED_CODE_AND_DOCUMENTS' && ` ${mergeAudit.unproven} Arbeitspakete mit offenen / nicht auflösbaren Referenzen.`}
        VERIFIED wird nicht aus einem GitHub-HEAD oder einer bloßen Datei-Existenz abgeleitet.</p>
    </div>
    <details className="my-4 rounded-xl border border-slate-700 bg-slate-950/70 p-3" aria-label="Roadmap Statusfilter">
      <summary className="cursor-pointer text-sm font-semibold text-white">
        Status auswählen · {selectedStates.length} von {Object.keys(STATES).length} <span className="text-slate-400">(Mehrfachauswahl)</span>
      </summary>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="min-h-10 rounded-lg border border-slate-600 px-3 text-xs hover:bg-slate-800"
          onClick={() => setSelectedStates(Object.keys(STATES) as RoadmapEvidenceState[])}>Alle wählen</button>
        <button type="button" className="min-h-10 rounded-lg border border-slate-600 px-3 text-xs hover:bg-slate-800"
          onClick={() => setSelectedStates([])}>Keine wählen</button>
      </div>
      <fieldset className="mt-3 grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">Roadmap-Status filtern</legend>
        {(Object.keys(STATES) as RoadmapEvidenceState[]).map(key => (
          <label key={key} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${STATES[key].style}`}>
            <input type="checkbox" checked={selectedStates.includes(key)} onChange={() => toggleState(key)}
              className="h-4 w-4 accent-amber-400" />
            <span>{STATES[key].label} · {WORK_PACKAGES.filter(item => item.evidenceState === key).length}</span>
          </label>
        ))}
      </fieldset>
    </details>
    <details className="my-4 rounded-xl border border-slate-700 bg-slate-950/70 p-3" aria-label="CAPITAL-AI Roadmap Domains">
      <summary className="cursor-pointer text-sm font-semibold text-white">
        Domains auswählen · {selectedOwners.length} von {PROJECT_OWNERS.length} <span className="text-slate-400">(Mehrfachauswahl)</span>
      </summary>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="min-h-10 rounded-lg border border-slate-600 px-3 text-xs text-white hover:bg-slate-800"
          onClick={() => setSelectedOwners(PROJECT_OWNERS.map(project => project.id))}>Alle wählen</button>
        <button type="button" className="min-h-10 rounded-lg border border-slate-600 px-3 text-xs text-white hover:bg-slate-800"
          onClick={() => setSelectedOwners([])}>Keine wählen</button>
      </div>
      <fieldset className="mt-3 grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">Domains filtern</legend>
        {PROJECT_OWNERS.map(project => (
          <label key={project.id} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-700 px-3 py-2 text-sm ${selectedOwners.includes(project.id) ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>
            <input type="checkbox" checked={selectedOwners.includes(project.id)}
              onChange={() => toggleOwner(project.id)} className="h-4 w-4 accent-amber-400" />
            <img src={project.badgeAsset} alt="" aria-hidden="true" className="h-8 w-8" />
            {project.label}
          </label>
        ))}
      </fieldset>
    </details>
    <details className="text-sm text-slate-400 mb-4">
      <summary className="cursor-pointer">Phasen und Abschlussprüfung</summary>
      <ul className="mt-2 space-y-2">{ROADMAP_STAGES.map(phase => <li key={phase.id}>{phase.shortTitle}: Gesamt-Abnahme offen. {phase.description}</li>)}</ul>
    </details>
    <div className="grid gap-3 my-4">

      <label className="text-sm">Arbeitspaket suchen
        <input className="block w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl p-3" value={search} onChange={event => setSearch(event.target.value)} placeholder="Titel oder Kennung" />
      </label>
    </div>
    <p className="text-sm text-slate-400 mb-3" role="status">{packages.length} von {WORK_PACKAGES.length} Arbeitspaketen</p>
    <div className="grid gap-3 lg:grid-cols-2">
      {packages.map(item => {
        const project = PROJECT_OWNER_BY_ID.get(item.owner);
        return <article key={item.id} className="rounded-xl border border-slate-700 bg-slate-900 p-4 min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
            {project && <img
              src={project.badgeAsset}
              alt={`${project.label} Branding-Badge`}
              loading="lazy"
              className="h-20 w-20 shrink-0 sm:h-24 sm:w-24"
            />}
            <span className={`self-start text-xs rounded-full border px-2 py-1 ${STATES[item.evidenceState].style}`}>{STATES[item.evidenceState].label}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs text-slate-400">{project?.label ?? item.owner} · {item.id}</span>
          </div>
          <h3 className="font-semibold">{item.title}</h3>
          <p className="text-sm text-slate-400 mt-2">{item.description}</p>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-amber-300">Nächster Schritt und Nachweise</summary>
            <p className="mt-2">{item.nextStep}</p>
            {item.deliverables.length > 0 && <>
              <p className="mt-3 font-semibold text-slate-200">Arbeitspunkte · Reihenfolge wie in der Roadmap</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-300">
                {item.deliverables.map(deliverable => <li key={deliverable}>{deliverable}</li>)}
              </ol>
            </>}
            {item.evidenceRefs.length > 0 ? <ul className="mt-3 space-y-1">{item.evidenceRefs.map(ref => <li key={ref}>
              <a className="text-emerald-300 underline break-all" href={ref.startsWith('https://') ? ref : `https://github.com/${ROADMAP_SNAPSHOT.repository}/blob/${repositoryStatus?.sourceSha ?? ROADMAP_SNAPSHOT.sourceSha}/${ref}`}>{ref}</a>
            </li>)}</ul> : <p className="text-slate-400 mt-2">Für den vollständigen Zielumfang wurde in diesem Abgleich kein Abschlussnachweis zugeordnet.</p>}
            {item.dependencies && <p className="text-slate-400 mt-2">Abhängigkeiten: {item.dependencies.join(', ')}</p>}
          </details>
        </article>;
      })}
    </div>
    {packages.length === 0 && <p className="text-slate-400 p-4">Keine Arbeitspakete für diese Filter.</p>}
  </section>;
};
