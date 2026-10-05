import React from 'react';
import { PROJECT_OWNERS, ROADMAP_SNAPSHOT, ROADMAP_STAGES, WORK_PACKAGES } from '../data/roadmapData';
import type { ProjectOwner, RoadmapEvidenceState } from '../data/roadmapData';

const STATES: Record<RoadmapEvidenceState, { label: string; style: string }> = {
  VERIFIED: { label: 'VERIFIED · Repo umgesetzt', style: 'border-emerald-400/40 text-emerald-300' },
  OFFEN: { label: 'OFFEN · Prüfung / Umsetzung', style: 'border-amber-400/40 text-amber-300' },
  GEHALTEN: { label: 'GEHALTEN · Freigabe ausstehend', style: 'border-rose-400/40 text-rose-300' },
  UNGEKLÄRT: { label: 'UNGEKLÄRT · Backlog-Ziel', style: 'border-slate-600 text-slate-300' },
};

const PROJECT_OWNER_BY_ID = new Map<ProjectOwner, (typeof PROJECT_OWNERS)[number]>(
  PROJECT_OWNERS.map(project => [project.id, project]),
);

export const RoadmapPanel: React.FC = () => {
  const [owner, setOwner] = React.useState('');
  const [state, setState] = React.useState('');
  const [search, setSearch] = React.useState('');
  const packages = WORK_PACKAGES.filter(item =>
    (!owner || item.owner === owner) &&
    (!state || item.evidenceState === state) &&
    `${item.id} ${item.title} ${item.description}`.toLocaleLowerCase('de').includes(search.toLocaleLowerCase('de'))
  );
  return <section aria-labelledby="roadmap-heading" className="my-6">
    <h2 id="roadmap-heading" className="text-xl font-bold">Roadmap · belegter Repo-Stand</h2>
    <p className="text-sm text-slate-400 mt-2">
      Stand {ROADMAP_SNAPSHOT.reviewDate} · Main{' '}
      <a className="text-amber-300 underline" href={`https://github.com/${ROADMAP_SNAPSHOT.repository}/commit/${ROADMAP_SNAPSHOT.sourceSha}`}>{ROADMAP_SNAPSHOT.sourceSha.slice(0, 7)}</a>.
      {' '}VERIFIED bestätigt den beschriebenen Repo-Umfang. Produktive Abnahmen stehen separat in der Roadmap.
      Ungeklärte Ziele erhalten keine geschätzten Prozentwerte. Dieser Snapshot wird nach einem belegten Abgleich aktualisiert.
    </p>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-4">
      {(Object.keys(STATES) as RoadmapEvidenceState[]).map(key => <div key={key} className={`rounded-xl border p-3 bg-slate-900 ${STATES[key].style}`}>
        <p className="text-xl font-bold">{WORK_PACKAGES.filter(item => item.evidenceState === key).length}</p>
        <p className="text-xs">{STATES[key].label}</p>
      </div>)}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2 my-4" aria-label="CAPITAL-AI Roadmap Domains">
      {PROJECT_OWNERS.map(project => {
        const selected = owner === project.id;
        return <button
          key={project.id}
          type="button"
          aria-pressed={selected}
          onClick={() => setOwner(current => current === project.id ? '' : project.id)}
          className={`rounded-xl border bg-slate-950/70 p-2 text-left transition flex items-center justify-center ${project.badgeColor} ${selected ? 'ring-2 ring-current' : 'hover:bg-slate-900'}`}
          title={project.description}
        >
          <img
            src={project.badgeAsset}
            alt={`${project.label} Branding-Badge`}
            className="block h-24 w-24 sm:h-28 sm:w-28"
          />
        </button>;
      })}
    </div>
    <details className="text-sm text-slate-400 mb-4">
      <summary className="cursor-pointer">Phasen und Abschlussprüfung</summary>
      <ul className="mt-2 space-y-2">{ROADMAP_STAGES.map(phase => <li key={phase.id}>{phase.shortTitle}: Gesamt-Abnahme offen. {phase.description}</li>)}</ul>
    </details>
    <div className="grid gap-3 sm:grid-cols-3 my-4">
      <label className="text-sm">Domain
        <select className="block w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl p-3" value={owner} onChange={event => setOwner(event.target.value)}>
          <option value="">Alle Domains</option>
          {PROJECT_OWNERS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <label className="text-sm">Status
        <select className="block w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl p-3" value={state} onChange={event => setState(event.target.value)}>
          <option value="">Alle Zustände</option>
          {(Object.keys(STATES) as RoadmapEvidenceState[]).map(key => <option key={key} value={key}>{STATES[key].label}</option>)}
        </select>
      </label>
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
              <a className="text-emerald-300 underline break-all" href={ref.startsWith('https://') ? ref : `https://github.com/${ROADMAP_SNAPSHOT.repository}/blob/${ROADMAP_SNAPSHOT.sourceSha}/${ref}`}>{ref}</a>
            </li>)}</ul> : <p className="text-slate-400 mt-2">Für den vollständigen Zielumfang wurde in diesem Abgleich kein Abschlussnachweis zugeordnet.</p>}
            {item.dependencies && <p className="text-slate-400 mt-2">Abhängigkeiten: {item.dependencies.join(', ')}</p>}
          </details>
        </article>;
      })}
    </div>
    {packages.length === 0 && <p className="text-slate-400 p-4">Keine Arbeitspakete für diese Filter.</p>}
  </section>;
};
