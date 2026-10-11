import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BookOpen, Boxes, Compass, FileCheck2,
  GitBranch, Info, Layers3, Search, ShieldAlert,
} from 'lucide-react';
import { BLUEPRINT_EVIDENCE_CONTRACTS } from '../../data/blueprintEvidenceContracts';
import { BLUEPRINT_DETAILS } from '../documentation/blueprintDocumentationData';
import {
  ARCHITECTURE_BLUEPRINTS, ARCHITECTURE_COMPONENTS, ARCHITECTURE_LESSONS,
  DATA_FLOW_STAGES, blueprintEvidenceLabel, componentEvidenceLabel,
  filterArchitectureBlueprints, filterArchitectureComponents,
  type ArchitectureView, type EvidenceLabel,
} from './architectureViewModel';

type Props = { onNavigate?: (path: string) => void };
const SECTIONS: ReadonlyArray<{ id: ArchitectureView; label: string; description: string }> = [
  { id: 'overview', label: 'Architektur-Hub', description: 'Schichten und Vertrauensgrenzen' },
  { id: 'blueprints', label: 'Blueprint Explorer', description: 'Topologien und Nachweise' },
  { id: 'components', label: 'Komponentenbibliothek', description: '50 kanonische Verträge' },
  { id: 'learning', label: 'Learning Journey', description: 'Vier interaktive Lernstationen' },
  { id: 'explainability', label: 'Explainability', description: 'Faktoren, Quellen, Score-Gates' },
];

const surface = 'rounded-2xl border border-slate-700/80 bg-[#0a1630]/90 p-4 sm:p-5';
const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';
const action = `min-h-11 rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-cyan-300 ${focus}`;

function EvidenceState({ value }: { value: EvidenceLabel }) {
  return <span className="inline-flex rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-xs font-bold tracking-wide text-amber-100">{value}</span>;
}

function DataFlow() {
  const [activeStage, setActiveStage] = useState<(typeof DATA_FLOW_STAGES)[number]['id']>('provider');
  const detail = DATA_FLOW_STAGES.find((stage) => stage.id === activeStage) ?? DATA_FLOW_STAGES[0];
  return (
    <section className={surface} aria-labelledby="architecture-data-flow">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="architecture-data-flow" className="text-xl font-bold">Datenfluss · Source to Evidence</h2>
        <span className="text-xs text-slate-300">Architekturmodell · kein Live-Stream</span>
      </div>
      <ol className="mt-5 grid gap-2 sm:grid-cols-5" aria-label="Datenverarbeitung in fünf Schritten">
        {DATA_FLOW_STAGES.map((stage, index) => <li key={stage.id} className="min-w-0">
          <button type="button" onClick={() => setActiveStage(stage.id)} aria-pressed={activeStage === stage.id}
            className={`w-full min-h-20 rounded-xl border px-3 py-3 text-left text-sm ${focus} ${activeStage === stage.id ? 'border-cyan-300 bg-cyan-300/15 text-white' : 'border-slate-600 bg-slate-900 text-slate-200 hover:border-amber-300'}`}>
            <span className="block text-xs text-amber-200">0{index + 1}</span><span className="mt-1 block font-semibold">{stage.title}</span>
          </button>
          {index < DATA_FLOW_STAGES.length - 1 && <span className="sr-only">führt zu </span>}
        </li>)}
      </ol>
      <div className="mt-4 rounded-xl border border-cyan-400/25 bg-slate-950/60 p-4" aria-live="polite">
        <p className="font-semibold text-cyan-200">{detail.title} <span className="font-normal text-slate-400">· {detail.contract}</span></p>
        <p className="mt-2 text-sm leading-6 text-slate-200">{detail.description}</p>
      </div>
    </section>
  );
}

function BlueprintExplorer({ onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(ARCHITECTURE_BLUEPRINTS[0]?.id ?? '');
  const results = useMemo(() => filterArchitectureBlueprints(query), [query]);
  const selected = results.find((entry) => entry.id === selectedId) ?? results[0];
  const contract = selected ? BLUEPRINT_EVIDENCE_CONTRACTS[selected.id] : undefined;
  const detail = selected ? BLUEPRINT_DETAILS[selected.id] : undefined;
  return <section aria-label="Blueprint Explorer" className="grid min-w-0 gap-4 lg:grid-cols-[minmax(240px,0.75fr)_minmax(0,1.5fr)]">
    <div className={surface}>
      <label htmlFor="architecture-blueprint-search" className="block font-semibold">Blueprint suchen</label>
      <div className="relative mt-3"><Search size={17} aria-hidden="true" className="absolute left-3 top-3.5 text-slate-400" />
        <input id="architecture-blueprint-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, Datenkonzept, Einsatz…" className={`min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950 pl-10 pr-3 text-sm text-white ${focus}`} />
      </div>
      <p role="status" className="mt-3 text-xs text-slate-300">{results.length} von {ARCHITECTURE_BLUEPRINTS.length} Architektur-Blueprints</p>
      <div className="mt-3 space-y-2">
        {results.map((entry) => <button key={entry.id} type="button" aria-pressed={selected?.id === entry.id}
          onClick={() => setSelectedId(entry.id)}
          className={`w-full rounded-xl border p-3 text-left ${focus} ${selected?.id === entry.id ? 'border-amber-300 bg-amber-400/10' : 'border-slate-700 bg-slate-900 hover:border-cyan-300'}`}>
          <span className="block text-xs text-cyan-200">{entry.category}</span>
          <span className="mt-1 block text-sm font-semibold text-white">{entry.name}</span>
        </button>)}
        {results.length === 0 && <p className="text-sm text-slate-200">Keine Treffer. Suchbegriff anpassen.</p>}
      </div>
    </div>
    <div className={surface}>
      {selected ? <>
        <div className="flex flex-wrap items-start justify-between gap-2"><h2 className="text-xl font-bold">{selected.name}</h2><EvidenceState value={blueprintEvidenceLabel(selected.id)} /></div>
        <p className="mt-3 text-sm leading-6 text-slate-200">{detail?.architecture ?? selected.primaryUseCase}</p>
        <p className="mt-3 text-sm text-amber-100">Latenz, SLA und Preise aus dem Katalog sind Planwerte, keine Laufzeitmessung oder verifizierten Angebote.</p>
        <h3 className="mt-5 font-semibold text-cyan-200">Topologie (Konzept)</h3>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2">
          {selected.topologyNodes.map((node, index) => <li key={node.id} className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm">
            <span className="text-xs text-amber-200">{index + 1} · {node.tier} · {node.type}</span>
            <p className="mt-1 font-semibold">{node.name}</p>
          </li>)}
        </ol>
        <h3 className="mt-5 font-semibold text-cyan-200">Benötigte Evidenz</h3>
        {contract ? <ul className="mt-2 space-y-2">
          {contract.requirements.map((requirement) => <li key={requirement.id} className="flex gap-2 text-sm text-slate-200"><ShieldAlert size={17} className="mt-0.5 shrink-0 text-amber-200" aria-hidden="true" /><span>{requirement.label}</span></li>)}
        </ul> : <p className="mt-2 text-sm text-amber-200">Kein Evidence-Vertrag vorhanden. Blueprint gesperrt.</p>}
        <p className="mt-4 text-xs text-slate-300">Nur öffentliche Architekturansicht. Download, Entitlement und Production-Freigabe erfolgen nicht über diesen Explorer.</p>
        <button type="button" className={`${action} mt-4 inline-flex items-center gap-2`} onClick={() => onNavigate?.('/marketscreener/dokumentation')}>
          Vollständige Dokumentationsansicht <ArrowRight size={16} aria-hidden="true" />
        </button>
      </> : <p role="status" className="text-slate-200">Noch kein Blueprint im Katalog.</p>}
    </div>
  </section>;
}

function ComponentLibrary({ onExplain }: { onExplain: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('all');
  const [selectedId, setSelectedId] = useState(ARCHITECTURE_COMPONENTS[0]?.componentId ?? '');
  const domains = useMemo(() => [...new Set(ARCHITECTURE_COMPONENTS.map((item) => item.domain))].sort(), []);
  const results = useMemo(() => filterArchitectureComponents(query, domain), [query, domain]);
  const current = results.find((entry) => entry.componentId === selectedId) ?? results[0];
  return <section aria-label="Komponentenbibliothek" className="space-y-4">
    <div className={surface}>
      <h2 className="text-xl font-bold">Kanonische Analysekomponenten</h2>
      <p className="mt-2 text-sm text-slate-200">Die Registry beschreibt Schnittstellen, Abhängigkeiten und Gewichtungsrichtlinien. Sie garantiert keine aktive Ausführung.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">Komponente suchen
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ID, Feature oder Provider"
            className={`mt-2 block min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 text-white ${focus}`} />
        </label>
        <label className="text-sm font-semibold">Fachdomäne
          <select value={domain} onChange={(event) => setDomain(event.target.value)}
            className={`mt-2 block min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 text-white ${focus}`}>
            <option value="all">Alle Domänen</option>{domains.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
          </select>
        </label>
      </div>
      <p role="status" className="mt-3 text-sm text-slate-300">{results.length} von {ARCHITECTURE_COMPONENTS.length} Komponenten</p>
    </div>
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(250px,0.85fr)_minmax(0,1.5fr)]">
      <div className={`${surface} max-h-[36rem] overflow-y-auto`} aria-label="Komponenten auswählen">
        {results.map((entry) => <button key={entry.componentId} type="button" onClick={() => setSelectedId(entry.componentId)}
          aria-pressed={current?.componentId === entry.componentId}
          className={`mb-2 w-full rounded-lg border px-3 py-3 text-left text-sm ${focus} ${current?.componentId === entry.componentId ? 'border-cyan-300 bg-cyan-300/10' : 'border-slate-700 bg-slate-950 hover:border-amber-300'}`}>
          <span className="block font-semibold">{entry.displayName}</span>
          <span className="mt-1 block text-xs text-slate-300">{entry.domain} · {entry.status}</span>
        </button>)}
        {results.length === 0 && <p role="status" className="text-sm text-slate-300">Keine Komponenten gefunden.</p>}
      </div>
      <div className={surface}>{current ? <>
        <div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-xl font-semibold">{current.displayName}</h3><p className="mt-1 break-all font-mono text-xs text-slate-400">{current.componentId}</p></div><EvidenceState value={componentEvidenceLabel(current)} /></div>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-cyan-200">Input-Datenverträge</dt><dd className="mt-1 break-words text-slate-200">{current.inputContracts.join(', ')}</dd></div>
          <div><dt className="text-cyan-200">Output-Vertrag</dt><dd className="mt-1 break-words text-slate-200">{current.outputContract}</dd></div>
          <div><dt className="text-cyan-200">Features</dt><dd className="mt-1 break-words text-slate-200">{current.featureDependencies.join(', ') || 'Keine spezifiziert'}</dd></div>
          <div><dt className="text-cyan-200">Provider-Abhängigkeiten (nicht Live-Nutzung)</dt><dd className="mt-1 break-words text-slate-200">{current.providerDependencies.join(', ') || 'Nicht spezifiziert'}</dd></div>
          <div><dt className="text-cyan-200">Modellversion</dt><dd className="mt-1">{current.calculationVersion}</dd></div>
          <div><dt className="text-cyan-200">Default-Gewichtung (kein Echtzeit-Beitrag)</dt><dd className="mt-1">{(current.weightPolicy.defaultWeight * 100).toFixed(0)} %</dd></div>
        </dl>
        <button type="button" onClick={() => onExplain(current.componentId)} className={`${action} mt-5 inline-flex items-center gap-2`}>Score-Einfluss erklären <ArrowRight size={16} aria-hidden="true" /></button>
      </> : <p role="status" className="text-sm text-slate-200">Keine Komponentendaten hinterlegt.</p>}</div>
    </div>
  </section>;
}

function ExplainabilitySystem({ componentId, onNavigate }: { componentId: string } & Props) {
  const [selectedId, setSelectedId] = useState(componentId || ARCHITECTURE_COMPONENTS[0]?.componentId || '');
  const selected = ARCHITECTURE_COMPONENTS.find((entry) => entry.componentId === selectedId);
  return <section className="space-y-4" aria-label="Explainability System">
    <div className={surface}>
      <div className="flex items-center gap-3"><FileCheck2 size={24} aria-hidden="true" className="text-cyan-300" /><h2 className="text-xl font-bold">Warum existiert dieser Score?</h2></div>
      <p className="mt-2 text-sm leading-6 text-slate-200">Die Erklärung trennt registrierte Modellabsicht von einer tatsächlich berechneten Score-Instanz. Ein Score entsteht nur bei gültigem Input, erfüllten Gates und prüfbarer Ergebnis-Evidence.</p>
      <label className="mt-4 block text-sm font-semibold" htmlFor="explain-component">Zu erklärende Komponente</label>
      <select id="explain-component" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}
        className={`mt-2 min-h-11 w-full max-w-xl rounded-xl border border-slate-600 bg-slate-950 px-3 text-white ${focus}`}>
        {ARCHITECTURE_COMPONENTS.map((entry) => <option key={entry.componentId} value={entry.componentId}>{entry.displayName}</option>)}
      </select>
    </div>
    {selected ? <div className="grid gap-4 md:grid-cols-2">
      <article className={surface}>
        <h3 className="font-bold text-amber-200">Zweck &amp; mathematischer Vertrag</h3>
        <p className="mt-3 text-sm leading-6">Ziel: <strong>{selected.outputContract}</strong> aus {selected.inputContracts.join(', ')}.</p>
        <p className="mt-3 text-sm leading-6 text-slate-200">Berechnungsmodell: Version {selected.calculationVersion}. Eine konkrete Formel ist in diesem Registry-Eintrag nicht spezifiziert; eine formale Herleitung muss aus dem jeweiligen Engine-/Ergebnisvertrag stammen.</p>
        <p className="mt-3 text-sm leading-6 text-slate-200">DefaultWeight: {(selected.weightPolicy.defaultWeight * 100).toFixed(0)} % · Eligibility-Gate: {selected.weightPolicy.isEligibleGate ? 'Ja' : 'Nein'} · Veto: {selected.weightPolicy.isVetoOverride ? 'Ja' : 'Nein'}.</p>
        <p className="mt-3 text-sm leading-6 text-slate-200">Minimale Datenabdeckung: {(selected.confidencePolicy.minimumDataSufficiencyRatio * 100).toFixed(0)} % · maximale Datenalterung: {selected.refreshPolicy.maxStalenessSeconds} s (Konfiguration).</p>
      </article>
      <article className={surface}>
        <h3 className="font-bold text-cyan-200">Welche Faktoren und Quellen?</h3>
        <h4 className="mt-3 text-sm font-semibold">Feature-Abhängigkeiten</h4>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">{selected.featureDependencies.length ? selected.featureDependencies.map((feature) => <li key={feature}>{feature}</li>) : <li>Keine Features spezifiziert</li>}</ul>
        <h4 className="mt-4 text-sm font-semibold">Konfigurierte Provider (keine Provenienz)</h4>
        <p className="mt-2 text-sm text-slate-200">{selected.providerDependencies.join(', ') || 'Nicht spezifiziert'}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2"><EvidenceState value={componentEvidenceLabel(selected)} /><span className="text-xs text-slate-200">Tatsächlich genutzte Quelle: NOT_PROVEN – kein FeatureValue/ScoreResult an diesen Katalog gebunden.</span></div>
      </article>
      <article className={surface}>
        <h3 className="font-bold text-cyan-200">Mögliche Reason Codes</h3>
        {selected.reasonCodeCatalog.length > 0 ? <ul className="mt-3 space-y-3">{selected.reasonCodeCatalog.map((reason) => <li key={reason.code} className="border-l-2 border-amber-400 pl-3 text-sm"><strong className="block">{reason.code}</strong><span className="text-slate-200">{reason.descriptionDe} · {reason.severity}</span></li>)}</ul>
          : <p className="mt-2 text-sm text-slate-300">Keine Codes registriert. Kein Grund ausgedacht.</p>}
      </article>
      <article className={surface}>
        <h3 className="font-bold text-amber-200">Evidence &amp; Actionability</h3>
        <p className="mt-3 text-sm leading-6 text-slate-200">Die tatsächliche Score-Herleitung benötigt FinalRankResult, FeatureValue.provenance, angewendete Gewichte, Reason Codes, Modellversion, Evidence-ID sowie eine Frische-/Eligibility-Prüfung.</p>
        <p className="mt-3 text-sm text-slate-200">Registrystatus: <strong>{selected.status}</strong> · letztmalige Validierung: {selected.lastValidatedAt ?? 'NOT_PROVEN'}. Ohne diese Runtime-Verträge keine Zahl und keine Anlageempfehlung.</p>
        <button type="button" className={`${action} mt-4 inline-flex items-center gap-2`} onClick={() => onNavigate?.('/marketscreener')}>
          Zum Scorer mit bestehendem Explainability-Drawer <ArrowRight size={16} aria-hidden="true" />
        </button>
      </article>
    </div> : <p role="alert">Kein Komponentenvertrag verfügbar.</p>}
  </section>;
}

function InteractiveLearning({ onNavigate }: Props) {
  const [step, setStep] = useState(0);
  const current = ARCHITECTURE_LESSONS[step];
  const [finished, setFinished] = useState(false);
  return <section className={surface} aria-labelledby="architecture-learning-title">
    <div className="flex items-center gap-3"><BookOpen className="text-amber-200" size={24} aria-hidden="true" /><h2 id="architecture-learning-title" className="text-xl font-bold">Interactive Learning Journey</h2></div>
    <p className="mt-2 text-sm text-slate-200">Kostenlose interaktive Einführung. Fortschritt ist nur für diese Ansicht gespeichert, nicht im Nutzerprofil. Keine Zertifizierung oder Anlageberatung.</p>
    <ol className="mt-4 grid gap-2 sm:grid-cols-4">
      {ARCHITECTURE_LESSONS.map((lesson, index) => <li key={lesson.id}><button type="button" aria-current={step === index ? 'step' : undefined}
        onClick={() => {setStep(index);setFinished(false);}}
        className={`w-full min-h-11 rounded-xl border p-3 text-left text-xs font-semibold ${focus} ${step === index ? 'border-amber-300 bg-amber-300/15 text-white' : 'border-slate-600 text-slate-200 hover:border-cyan-300'}`}>
        {lesson.title}
      </button></li>)}
    </ol>
    <article className="mt-5 rounded-xl border border-slate-600 bg-slate-950 p-5" aria-live="polite">
      <p className="text-xs font-semibold text-cyan-200">Lernstation {step + 1} / {ARCHITECTURE_LESSONS.length}</p>
      <h3 className="mt-2 text-lg font-bold">{current.goal}</h3>
      <p className="mt-3 leading-7 text-slate-200">{current.detail}</p>
      {finished && <p role="status" className="mt-4 rounded-lg border border-cyan-300/40 bg-cyan-300/10 p-3 text-sm">Lernpfad durchlaufen. Die nächste Übung führt in die vollständige Learning-Plattform.</p>}
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" disabled={step === 0} className={`${action} disabled:cursor-not-allowed disabled:opacity-40`} onClick={() => {setStep((value) => Math.max(0, value - 1));setFinished(false);}}><ArrowLeft className="mr-2 inline" size={16} aria-hidden="true" />Zurück</button>
        <button type="button" className={action} onClick={() => {
          if (step === ARCHITECTURE_LESSONS.length - 1) setFinished(true);
          else setStep((value) => value + 1);
        }}>{step === ARCHITECTURE_LESSONS.length - 1 ? 'Lernpfad abschließen' : 'Nächste Station'} <ArrowRight className="ml-2 inline" size={16} aria-hidden="true" /></button>
        <button type="button" className={action} onClick={() => onNavigate?.('/learning')}>Learning Portal öffnen</button>
      </div>
    </article>
  </section>;
}

/** Public read-only discovery: no provider calls, private data or commercial entitlements. */
export function IntelligenceArchitectureHub({ onNavigate }: Props) {
  const initialTab = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : null;
  const [view, setView] = useState<ArchitectureView>(SECTIONS.some((item) => item.id === initialTab) ? initialTab as ArchitectureView : 'overview');
  const [explainId, setExplainId] = useState('');
  const choose = (next: ArchitectureView) => {
    setView(next);
    if (typeof window !== 'undefined') window.history.replaceState(null, '', `/architecture-hub?tab=${next}`);
  };
  const explain = (id: string) => { setExplainId(id); choose('explainability'); };
  return <main className="hub-universe hub-universe--studio min-h-screen bg-[#061025] px-3 py-6 text-slate-100 sm:px-6">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-3xl border border-cyan-400/20 bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.15),transparent_65%)] p-5 sm:p-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-cyan-200"><Compass size={18} aria-hidden="true" /> CAPITAL AI · FINANCIAL INTELLIGENCE ARCHITECTURE</div>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Architektur sichtbar machen</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">Erkunde den Weg von Datenquellen über Analyse und Scoring bis zur Evidence. Verträge und Konzepte stammen aus den bestehenden CAPITAL-AI-Registries; veröffentlichte Werte werden hier nicht simuliert.</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs"><span className="rounded-lg border border-cyan-400/40 p-2"><Boxes size={14} className="mr-1 inline" aria-hidden="true" /> {ARCHITECTURE_COMPONENTS.length} Komponenten-Verträge</span><span className="rounded-lg border border-amber-300/40 p-2"><Layers3 size={14} className="mr-1 inline" aria-hidden="true" /> {ARCHITECTURE_BLUEPRINTS.length} Blueprints</span><span className="rounded-lg border border-slate-600 p-2"><Info size={14} className="mr-1 inline" aria-hidden="true" /> Konfiguration ≠ Runtime-Evidence</span></div>
      </header>
      <nav className="flex gap-2 overflow-x-auto pb-2" aria-label="Bereiche im Architektur-Hub">
        {SECTIONS.map((section) => <button key={section.id} type="button" aria-pressed={view === section.id}
          onClick={() => choose(section.id)}
          className={`min-h-11 shrink-0 rounded-xl border px-4 py-2 text-sm font-bold ${focus} ${view === section.id ? 'border-cyan-300 bg-cyan-300/15 text-white shadow-[0_0_18px_rgba(34,211,238,.12)]' : 'border-slate-600 bg-slate-950 text-slate-200 hover:border-amber-300'}`}>
          {section.label}
        </button>)}
      </nav>
      {view === 'overview' && <>
        <DataFlow />
        <section aria-label="Architektur erkunden" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SECTIONS.filter((item) => item.id !== 'overview').map((item) => <button key={item.id} type="button" onClick={() => choose(item.id)} className={`${surface} ${focus} min-h-36 text-left hover:border-cyan-300`}>
            <span className="font-bold text-amber-200">{item.label}</span><span className="mt-2 block text-sm leading-6 text-slate-200">{item.description}</span><ArrowRight className="mt-4 text-cyan-200" size={18} aria-hidden="true" />
          </button>)}
        </section>
        <p className="text-sm text-slate-300">Architektur-Kataloge sind kein Nachweis für Runtime-Aktivierung, Datenlizenzen, aktuelle Kosten oder regulatorische Zulassung.</p>
      </>}
      {view === 'blueprints' && <BlueprintExplorer onNavigate={onNavigate} />}
      {view === 'components' && <ComponentLibrary onExplain={explain} />}
      {view === 'learning' && <InteractiveLearning onNavigate={onNavigate} />}
      {view === 'explainability' && <ExplainabilitySystem key={explainId} componentId={explainId} onNavigate={onNavigate} />}
      <footer className="border-t border-slate-700 py-5 text-sm text-slate-300">
        <p>Public-safe Architecture Explorer · Modell- und Planwerte sind kein Live-Scoring und keine Anlageberatung. Keine API-Keys oder privaten Provider-Daten im Browser.</p>
        <button type="button" onClick={() => onNavigate?.('/architecture')} className={`${action} mt-4 inline-flex items-center gap-2`}><GitBranch size={16} aria-hidden="true" /> Bestehende Pipeline-Architektur</button>
      </footer>
    </div>
  </main>;
}
