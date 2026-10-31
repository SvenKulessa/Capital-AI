import React from 'react';
import {
  ROADMAP_TOOL_WORKSTREAMS, routeRoadmapTools, repoPathsPresent,
  type RoadmapWorkstream,
} from '../data/roadmapToolOrchestration';

export function RoadmapSkillOrchestrationPanel({
  sourceSha, entryPaths, freshness,
}: {
  sourceSha: string;
  entryPaths: readonly string[];
  freshness: 'LIVE' | 'CACHED' | 'STALE';
}) {
  const [selected, setSelected] = React.useState<RoadmapWorkstream['id']>('social');
  const { workstream, candidates } = routeRoadmapTools(selected);
  const present = repoPathsPresent(workstream.sourcePaths, entryPaths);
  const sourcePrefix = 'https://github.com/SvenKulessa/Capital-AI/blob/' + encodeURIComponent(sourceSha) + '/';
  const evidenceReliable = freshness !== 'STALE';

  return (
    <section aria-labelledby="roadmap-tooling-title"
      className="space-y-4 rounded-2xl border border-amber-400/25 bg-slate-950/70 p-4 sm:p-5"
      data-roadmap-skill-orchestration="read-only">
      <header>
        <p className="text-xs font-mono uppercase tracking-wider text-amber-300">Roadmap → Skills → Orchestrierung → Nachweis</p>
        <h3 id="roadmap-tooling-title" className="mt-1 text-xl font-bold text-white">
          Open-Source-Orchestrierung und bestehende Skills
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Interaktiver Arbeitsweg aus dem bestehenden Roadmap- und Repository-Katalog. Er zeigt
          vorhandene Einstiegspunkte und mögliche kommerziell nutzbare Open-Source-Werkzeuge.
          Nur der vorhandene Node-Worker ist integriert; externe Kandidaten werden nicht installiert,
          gestartet oder als lizenzrechtlich abschließend freigegeben dargestellt.
        </p>
      </header>

      <label htmlFor="roadmap-tooling-workstream" className="block text-sm font-semibold text-slate-100">
        Arbeitspaket auswählen
      </label>
      <select id="roadmap-tooling-workstream" value={selected}
        onChange={event => setSelected(event.target.value as RoadmapWorkstream['id'])}
        className="min-h-11 w-full rounded-xl border border-slate-600 bg-slate-900 p-3 text-white focus-visible:outline-2 focus-visible:outline-amber-300">
        {ROADMAP_TOOL_WORKSTREAMS.map(item => (
          <option key={item.id} value={item.id}>{item.priority} · {item.label}</option>
        ))}
      </select>

      <div role="status" aria-live="polite"
        className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
          <span>Roadmap: <strong className="font-mono text-amber-200">{workstream.roadmapId}</strong></span>
          <span>Domain: <strong>{workstream.domain}</strong></span>
          <span>Quelle: main@{sourceSha.slice(0, 12)} · {freshness}</span>
        </div>
        <h4 className="mt-3 text-base font-semibold text-white">{workstream.label}</h4>
        <p className="mt-1 text-sm text-slate-300">{workstream.purpose}</p>
        <p className="mt-3 text-xs text-slate-300">
          Repository-Einträge im Katalog auffindbar: <strong>{present}/{workstream.sourcePaths.length}</strong>.
          {evidenceReliable
            ? ' Das ist nur Dateievidence, kein Funktions-, Lizenz- oder Produktionsnachweis.'
            : ' Repository-Katalog ist veraltet: aktueller Pfadstatus NOT_PROVEN.'}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <section aria-label="Vorhandene Fähigkeiten" className="space-y-3 rounded-xl border border-slate-700 p-4">
          <h4 className="font-semibold text-white">Vorhandene Skills und Codepfade</h4>
          <div className="flex flex-wrap gap-2">
            {workstream.skills.map(skill => (
              <a key={skill} href={sourcePrefix + '.agents/skills/' + encodeURIComponent(skill) + '/SKILL.md'}
                target="_blank" rel="noopener noreferrer"
                className="rounded-lg border border-cyan-500/30 px-2 py-1.5 text-xs text-cyan-200 underline underline-offset-2">
                {skill}
              </a>
            ))}
          </div>
          <ul className="space-y-2 text-xs text-slate-300">
            {workstream.sourcePaths.map(path => {
              const found = entryPaths.some(entry => entry === path || entry.startsWith(path + ' → '));
              return (
                <li key={path}>
                  <a href={sourcePrefix + path.split('/').map(encodeURIComponent).join('/')}
                    target="_blank" rel="noopener noreferrer"
                    className="break-all text-sky-200 underline underline-offset-2">{path}</a>
                  <span className="ml-2 text-slate-400">{found && evidenceReliable ? 'Katalogeintrag gefunden' : 'NOT_PROVEN im Katalog'}</span>
                </li>
              );
            })}
          </ul>
          <a href={workstream.destination}
            className="inline-flex min-h-11 items-center rounded-lg border border-amber-400/50 px-3 py-2 text-sm font-semibold text-amber-200 underline underline-offset-2">
            {workstream.destinationLabel}
          </a>
        </section>
        <section aria-label="Orchestrator-Kandidaten" className="space-y-3 rounded-xl border border-slate-700 p-4">
          <h4 className="font-semibold text-white">Orchestrator-Auswahl mit Lizenzkontext</h4>
          <ul className="space-y-3">
            {candidates.map(item => (
              <li key={item.id} className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-xs">
                <p className="font-semibold text-white">{item.name}</p>
                <p className="mt-1 text-slate-300">{item.role}</p>
                <p className="mt-1 text-slate-300">Status: <strong>{item.mode === 'EXISTING_REPO' ? 'Vorhandener Repo-Worker' : 'Kandidat, nicht installiert'}</strong></p>
                <a href={item.licenseUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-1 inline-block text-cyan-200 underline underline-offset-2">{item.license} · Quelle</a>
                <p className="mt-1 text-slate-400">{item.costBoundary}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section aria-label="Ausführung und Umsatzgrenzen"
        className="space-y-2 border-t border-slate-700 pt-4 text-sm text-slate-300">
        <p><strong className="text-white">Nächste technische Abnahme:</strong> {workstream.nextGate}</p>
        <p><strong className="text-white">Monetarisierung:</strong> {workstream.revenuePath}</p>
        <p className="text-xs text-amber-200">
          Planung und Navigation sind aktiv. Keine Ausführung externer Agenten, keine privaten API-Keys
          im Browser, kein Provider-/NATS-Enablement und keine Social-Veröffentlichung durch diese Ansicht.
          Vor einem späteren Runtime-Einsatz exakte Paketversion, transitive Lizenz, Notices,
          Security, CI und Kosten belegen.
        </p>
      </section>
    </section>
  );
}
