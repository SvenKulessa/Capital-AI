import React, { useMemo } from 'react';
import { ArrowRight, GitBranch, ShieldAlert } from 'lucide-react';
import {
  CANONICAL_50_COMPONENTS,
  type AnalysisComponentRegistryEntry,
} from '../../contracts/analysisComponentRegistry';
import {
  ANALYSIS_FAMILIES,
  ASSET_LABELS,
  PRODUCT_CLASSES,
  LIFECYCLE_LABELS,
  DATA_LABELS,
  componentName,
  componentFamily,
  filterAnalysisComponents,
  registrySummary,
} from './analysisPresentation';
import { useAnalysisQuery } from './useAnalysisQuery';
import {
  DataStatusBadge,
  panelClass,
  inputClass,
  buttonClass,
} from './AnalysisUi';

export function ComponentDependencyView({
  component,
}: {
  component: AnalysisComponentRegistryEntry;
}) {
  const columns = [
    {
      label: '1 · Quellen / Provider-Abhängigkeiten',
      values: component.providerDependencies,
    },
    {
      label: '2 · Abgeleitete Features',
      values: component.featureDependencies,
    },
    {
      label: '3 · Modellauswertung',
      values: [componentName(component), `v${component.calculationVersion}`],
    },
    { label: '4 · Ergebnisvertrag', values: [component.outputContract] },
  ];
  return (
    <figure aria-label={`Abhängigkeiten von ${componentName(component)}`}>
      <div className="grid gap-3 md:grid-cols-4">
        {columns.map((col, i) => (
          <div
            key={col.label}
            className="min-w-0 rounded-xl border border-slate-700 bg-slate-950 p-3"
          >
            <p className="mb-3 flex items-center justify-between gap-2 text-xs font-semibold text-cyan-200">
              {col.label}
              {i < 3 && <ArrowRight aria-hidden="true" size={16} />}
            </p>
            <ul className="space-y-2 break-words text-xs text-slate-300">
              {col.values.map((value) => (
                <li key={value} className="rounded border border-slate-800 p-2">
                  {value}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <figcaption className="mt-3 text-xs text-slate-400">
        Deklarierte Abhängigkeiten. Eine Verbindung in dieser Ansicht belegt
        keinen verfügbaren Feed oder berechneten Score.
      </figcaption>
    </figure>
  );
}

export function AnalysisComponentExplorer({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [search, setSearch] = useAnalysisQuery('analysisSearch');
  const [family, setFamily] = useAnalysisQuery('family', 'all');
  const [assetClass, setAssetClass] = useAnalysisQuery('analysisClass', 'all');
  const [status, setStatus] = useAnalysisQuery('analysisStatus', 'all');
  const [data, setData] = useAnalysisQuery('analysisData', 'all');
  const [selectedId, select] = useAnalysisQuery('component');
  const summary = useMemo(registrySummary, []);
  const components = filterAnalysisComponents({
    search,
    family,
    assetClass,
    status,
    data,
  });
  const selected =
    CANONICAL_50_COMPONENTS.find((c) => c.componentId === selectedId) ??
    components[0];
  const issues = selected
    ? summary.report.issues.filter(
        (i) =>
          i.componentId === selected.componentId ||
          i.componentId === 'registry',
      )
    : [];
  const prefix = React.useId();
  return (
    <section
      className="space-y-5"
      aria-label="Analyse-Komponenten und Methoden"
    >
      <header
        className={panelClass + ' bg-gradient-to-r from-[#0d1633] to-[#090e21]'}
      >
        <p className="mb-2 flex items-center gap-2 text-xs font-mono tracking-widest text-amber-300">
          <GitBranch size={16} aria-hidden="true" />
          ANALYSE · METHODEN · EVIDENCE
        </p>
        <h2 className="text-xl font-bold text-white sm:text-2xl">
          50 Perspektiven auf den Markt
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
          Von Datenintegrität bis Rangbildung: Erkunden Sie die Inputs,
          Berechnungsversionen und Grenzen jeder Komponente. Verfügbarkeit und
          Ergebnisfreigabe sind getrennte Zustände.
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['Komponenten', summary.total],
            ['Aktiv', summary.counts.active],
            ['Geplant', summary.counts.planned],
            ['Gesperrt', summary.counts.blocked],
          ].map(([name, count]) => (
            <div key={name} className="border-l-2 border-amber-400/40 pl-3">
              <dt className="text-xs text-slate-400">{name}</dt>
              <dd className="mt-1 text-2xl font-mono text-white">{count}</dd>
            </div>
          ))}
        </dl>
      </header>
      {!compact && (
        <nav
          aria-label="Analysefamilien"
          className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
        >
          {ANALYSIS_FAMILIES.map((f) => (
            <button
              type="button"
              key={f.id}
              aria-pressed={family === f.id}
              onClick={() => setFamily(family === f.id ? 'all' : f.id)}
              className={`${panelClass} text-left focus-visible:outline-2 focus-visible:outline-amber-400 ${family === f.id ? 'border-amber-400' : 'hover:border-slate-400'}`}
            >
              <span className="flex justify-between gap-2 text-sm font-semibold text-slate-100">
                {f.name}
                <span className="text-amber-300">{f.end - f.start}</span>
              </span>
              <span className="mt-2 block text-xs leading-relaxed text-slate-400">
                {f.description}
              </span>
            </button>
          ))}
        </nav>
      )}
      <div className={panelClass}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className="text-xs text-slate-300">
            Suchen
            <input
              id={prefix + '-search'}
              type="search"
              className={inputClass + ' mt-1'}
              placeholder="Name, ID oder Provider"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="text-xs text-slate-300">
            Anlageklasse
            <select
              className={inputClass + ' mt-1'}
              value={assetClass}
              onChange={(e) => setAssetClass(e.target.value)}
            >
              <option value="all">Alle neun Klassen</option>
              {PRODUCT_CLASSES.map((id) => (
                <option key={id} value={id}>
                  {ASSET_LABELS[id]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-300">
            Lebenszyklus
            <select
              className={inputClass + ' mt-1'}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">Alle Zustände</option>
              {Object.entries(LIFECYCLE_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-300">
            Datenstatus
            <select
              className={inputClass + ' mt-1'}
              value={data}
              onChange={(e) => setData(e.target.value)}
            >
              <option value="all">Alle Datenzustände</option>
              {Object.entries(DATA_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-300">
            Analysefamilie
            <select
              className={inputClass + ' mt-1'}
              value={family}
              onChange={(e) => setFamily(e.target.value)}
            >
              <option value="all">Alle Familien</option>
              {ANALYSIS_FAMILIES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p role="status" className="mt-3 text-xs text-slate-400">
          {components.length} von {summary.total} Komponenten · Filter und
          Auswahl sind über die URL teilbar.
        </p>
      </div>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(17rem,1fr)_minmax(0,2fr)]">
        <div
          className="max-h-[42rem] space-y-1 overflow-y-auto rounded-xl border border-slate-700 p-2"
          aria-label="Komponentenliste"
        >
          {components.map((entry, i) => (
            <button
              type="button"
              key={entry.componentId}
              aria-pressed={selected?.componentId === entry.componentId}
              onClick={() => select(entry.componentId)}
              className={`min-h-16 w-full rounded-lg border p-3 text-left focus-visible:outline-2 focus-visible:outline-amber-400 ${selected?.componentId === entry.componentId ? 'border-amber-400/60 bg-amber-400/10' : 'border-transparent hover:bg-slate-800/40'}`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <span className="font-mono text-xs text-slate-500">
                  {String(CANONICAL_50_COMPONENTS.indexOf(entry) + 1).padStart(
                    2,
                    '0',
                  )}
                </span>
                {componentName(entry)}
              </span>
              <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                {LIFECYCLE_LABELS[entry.status]}
                <DataStatusBadge mode={entry.provenanceMode} />
              </span>
            </button>
          ))}
          {!components.length && (
            <p className="p-4 text-sm text-slate-300">
              Keine Komponenten für diese Filter. Die Registry weist für ETFs
              und Optionen noch keinen Scope aus.
            </p>
          )}
        </div>
        {selected ? (
          <article
            className={panelClass + ' min-w-0 space-y-5'}
            aria-label={`Details: ${componentName(selected)}`}
          >
            <header>
              <p className="text-xs text-cyan-300">
                {componentFamily(selected).name} · {selected.domain}
              </p>
              <h3 className="mt-1 text-xl font-semibold text-white">
                {componentName(selected)}
              </h3>
              <p className="mt-2 break-all font-mono text-xs text-slate-400">
                {selected.componentId}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <DataStatusBadge mode={selected.provenanceMode} />
                <span>{LIFECYCLE_LABELS[selected.status]}</span>
                <span className="text-rose-200">
                  {selected.weightPolicy.isEligibleGate
                    ? 'Eligibility-Gate'
                    : 'Modellkomponente'}
                  {selected.weightPolicy.isVetoOverride ? ' · Veto' : ''}
                </span>
              </div>
            </header>
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-sm text-amber-100">
              <ShieldAlert className="mb-2" size={18} aria-hidden="true" />
              Kein verifizierter Ausführungsnachweis für diese Komponente.
              Aktuelle Marktwerte und Score sind nicht verfügbar.
            </div>
            <ComponentDependencyView component={selected} />
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              {[
                ['Berechnungsversion', selected.calculationVersion],
                [
                  'Refresh-Policy',
                  `${selected.refreshPolicy.frequency} · maximal ${selected.refreshPolicy.maxStalenessSeconds} s alt`,
                ],
                [
                  'Standardgewicht (Policy)',
                  `${selected.weightPolicy.defaultWeight * 100}% · kein ausgeführter Beitrag`,
                ],
                [
                  'Mindest-Datenabdeckung',
                  `${selected.confidencePolicy.minimumDataSufficiencyRatio * 100}%`,
                ],
                [
                  'Risiko-Policy',
                  `max. ${selected.riskPolicy.penaltyCeiling} Punkte · ${selected.riskPolicy.blocksActionableRank ? 'Rang kann gesperrt werden' : 'kein eigenständiges Rang-Veto'}`,
                ],
                [
                  'Konfidenzverfall',
                  `Halbwertszeit ${selected.confidencePolicy.confidenceDecayHalfLifeHours} h`,
                ],
                ['Owner (Registry)', selected.owner],
                [
                  'Letzte Validierung',
                  selected.lastValidatedAt ?? 'Nicht nachgewiesen',
                ],
                [
                  'Anlageklassen (Registry)',
                  selected.assetClassScope.join(', '),
                ],
                ['Input-Verträge', selected.inputContracts.join(', ')],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-slate-400">{label}</dt>
                  <dd className="mt-1 break-words text-slate-200">{value}</dd>
                </div>
              ))}
            </dl>
            <details>
              <summary className="cursor-pointer py-2 text-sm font-semibold text-cyan-200 focus-visible:outline-2 focus-visible:outline-amber-400">
                Reason-Code-Katalog · mögliche Zustände
              </summary>
              <p className="my-2 text-xs text-slate-400">
                Policy-Beschreibungen, keine Feststellungen zu einem Asset.
              </p>
              <ul className="space-y-2 text-xs">
                {selected.reasonCodeCatalog.map((r) => (
                  <li
                    key={r.code}
                    className="rounded border border-slate-700 p-3"
                  >
                    <code className="break-all text-cyan-200">{r.code}</code>
                    <p className="mt-1 text-slate-300">{r.descriptionDe}</p>
                    <span className="text-slate-400">
                      Schweregrad: {r.severity}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
            <details>
              <summary className="cursor-pointer py-2 text-sm font-semibold text-amber-200 focus-visible:outline-2 focus-visible:outline-amber-400">
                Offene Abhängigkeiten ({issues.length})
              </summary>
              <ul className="mt-2 space-y-2 text-xs">
                {issues.map((issue, i) => (
                  <li
                    key={i}
                    className="break-words border-l border-amber-400/50 pl-3"
                  >
                    <code>{issue.code}</code>
                    <p className="mt-1 text-slate-400">{issue.reference}</p>
                  </li>
                ))}
              </ul>
            </details>
            <p className="border-t border-slate-700 pt-4 text-xs leading-relaxed text-slate-400">
              Konfidenz beschreibt Datenabdeckung und Konsistenz, keine
              Vorhersagewahrscheinlichkeit. Modellsignale sind indikativ und
              keine Anlageberatung.
            </p>
          </article>
        ) : (
          <div className={panelClass}>Keine Auswahl verfügbar.</div>
        )}
      </div>
    </section>
  );
}
