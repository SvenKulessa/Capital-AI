import React from 'react';

const milestones = [
  {
    title: 'Nachweise und Sicherheitsgrenzen',
    window: 'November 2026',
    domain: 'TRUST · PLATFORM',
    outcome: 'Repo-Stand, Runtime, Artefaktrechte und Geräteabnahme getrennt belegen.',
    href: 'https://github.com/SvenKulessa/Capital-AI/issues/598',
    source: 'Roadmap-Nachweis #598',
  },
  {
    title: 'Erstes lieferbares Web-Angebot',
    window: 'November–Dezember 2026',
    domain: 'PRODUCT · MARKET · GROWTH',
    outcome: 'Ein bestehendes Learning- oder Blueprint-Angebot auf Rechte, SEO, Checkout und Auslieferung prüfen.',
    href: 'https://github.com/SvenKulessa/Capital-AI/pull/647',
    source: 'Commerce-Funnel #647',
  },
  {
    title: 'AI-DeviceCare und Smartphone',
    window: 'Dezember 2026–Januar 2027',
    domain: 'PRODUCT · TRUST',
    outcome: 'Lokale Batterie- und Berechtigungsanalyse auf Android 15 abnehmen. Der adaptive Scan folgt auf den Basis-PR.',
    href: 'https://github.com/SvenKulessa/AI-DeviceCare/pull/4',
    source: 'Gerätebasis #4',
  },
  {
    title: 'Governance-Pilot und Vertrieb',
    window: 'Januar–Februar 2027',
    domain: 'PLATFORM · GROWTH',
    outcome: 'Nachweisformat in zwei Repos erproben und Zahlungsbereitschaft für eine begleitete Einrichtung prüfen.',
    href: 'https://github.com/SvenKulessa/Capital-AI/blob/ae2f40b59c2358a32c3d8d953a096d1e2194f4b2/AGENTS.md',
    source: 'Repo-Regeln der Planungsbasis',
  },
] as const;

// This shareable brief is authored separately from authenticated application state.
const smartphoneBrief = [
  'CAPITAL-AI Ecosystem | Lesender Aufgabenauftrag für eine Smartphone-KI',
  '',
  'Prüfe öffentlich belegbare Quellen für die gewählte Aufgabe. Markiere jede Aussage als VERIFIED, BLOCKED oder NOT_PROVEN. Verwende keine Demo- oder Mock-Daten und erfinde keine Ergebnisse.',
  'Ausgabe: Architekturentscheidung, Risiken, Governance-Auswirkungen, betroffene Domänen, ADR-Empfehlung und ein kleinster prüfbarer nächster Schritt.',
  'Priorität: Security → Governance → Architektur → Produkt → Umsatz.',
  'Vorschläge bleiben Entwürfe. Keine externen Schreibaktionen, Downloads, Veröffentlichungen, Käufe oder Befehlsausführung.',
  'Öffentliche Referenz: https://github.com/SvenKulessa/Capital-AI',
].join('\n');

export function EcosystemRoadmapPanel() {
  const [copyResult, setCopyResult] = React.useState<'idle' | 'copied' | 'manual'>('idle');

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(smartphoneBrief);
      setCopyResult('copied');
    } catch {
      setCopyResult('manual');
    }
  }

  return (
    <section aria-labelledby="ecosystem-roadmap-heading" className="my-4 rounded-xl border border-amber-400/30 bg-slate-950/70 p-4">
      <h3 id="ecosystem-roadmap-heading" className="text-lg font-bold text-white">CAPITAL-AI Ecosystem · Modernisierung</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">
        Ein gemeinsamer Überblick über Webangebote, Governance und AI-DeviceCare. Die Meilensteine sind Planung.
        Ihre Quellen belegen den Ausgangspunkt. Betriebsbereitschaft und Vertrieb werden separat geprüft.
      </p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {milestones.map((milestone, index) => (
          <li key={milestone.title} className="min-w-0 rounded-lg border border-slate-700 bg-slate-900/80 p-3">
            <p className="text-xs font-semibold text-amber-200">{index + 1} · {milestone.window}</p>
            <h4 className="mt-1 text-sm font-semibold text-white">{milestone.title}</h4>
            <p className="mt-1 text-xs text-slate-300">{milestone.domain}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">{milestone.outcome}</p>
            <a href={milestone.href} className="mt-1 inline-flex min-h-11 items-center text-xs text-cyan-300 underline underline-offset-2">
              {milestone.source}
            </a>
          </li>
        ))}
      </ol>
      <a href="https://github.com/SvenKulessa/Capital-AI/blob/main/docs/platform/CAPITAL-AI-ECOSYSTEM-ROADMAP-2026-11-10.md"
        className="mt-2 inline-flex min-h-11 items-center text-sm text-cyan-300 underline underline-offset-2">
        Vollständige Roadmap und Architekturentscheidung
      </a>
      <details className="mt-4 rounded-lg border border-slate-700 p-3">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-white">
          Aufgabenbriefing für Smartphone-KI
        </summary>
        <p className="text-sm text-slate-300">Prüfe den Text und füge ihn bei Bedarf selbst in ChatGPT oder eine andere KI-App ein.</p>
        <label htmlFor="ecosystem-smartphone-brief" className="mt-3 block text-sm font-semibold text-white">Öffentlich teilbarer Text</label>
        <textarea id="ecosystem-smartphone-brief" readOnly rows={7} value={smartphoneBrief}
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 p-2 text-sm text-slate-100" />
        <button type="button" onClick={() => void copyBrief()}
          className="mt-2 min-h-11 rounded-lg border border-cyan-500/50 px-3 py-2 text-sm text-cyan-200">
          Aufgabenbriefing kopieren
        </button>
        <p role="status" className="mt-2 text-sm text-slate-200">
          {copyResult === 'copied' && 'Aufgabenbriefing kopiert.'}
          {copyResult === 'manual' && 'Zwischenablage nicht verfügbar. Wähle den Text im Feld aus und kopiere ihn manuell.'}
        </p>
      </details>
    </section>
  );
}
