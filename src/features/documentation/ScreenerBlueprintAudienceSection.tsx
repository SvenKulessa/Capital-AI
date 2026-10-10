import React from 'react';

const audiences = [
  { title: 'FinTech- & Quant-Builder', subtitle: 'Von API-Rohdaten zu versionierten Faktoren', benefit: 'Kanonische Datenverträge, Quality-Gates, YAML-Beispiele und Integrations-Playbooks.' },
  { title: 'Research- & Analyse-Teams', subtitle: 'Scores erklären statt nur anzeigen', benefit: 'Gewichtungen, Risikoflaggen, Pattern-Evidenz und nachvollziehbare Shadow-Modelle.' },
  { title: 'Screener- & Trading-Dashboards', subtitle: 'Datenherkunft und Frische verstehen', benefit: 'Entkoppelte Streams, Feature-Verträge, Replays und Grenzen der Score-Berechtigung.' },
  { title: 'Agenturen & Legacy-Integratoren', subtitle: 'Schrittweise modernisieren', benefit: 'Adapter, Konfigurationsschema und risikoärmere Migration statt Big-Bang-Rewrite.' },
] as const;

const components = [
  { title: 'Data Blueprint', src: '/branding/badges/screener-data-blueprint.svg', detail: 'Quellen, Pipelines, Normalisierung, Rechte, DQ und Evidence.' },
  { title: 'Scoring Blueprint', src: '/branding/badges/screener-scoring-blueprint.svg', detail: 'Factor Tools, Patterns, Gewichtung, Risiko, Confidence und Replay.' },
  { title: 'Screener Bundle', src: '/branding/badges/screener-bundle-blueprint.svg', detail: 'Gemeinsames Konzept; YAML-Editor als Vorschau, Studio als spätere Erweiterung.' },
] as const;

export function ScreenerBlueprintAudienceSection() {
  return (
    <section aria-labelledby="screener-audience-heading" className="rounded-3xl border border-sky-400/25 bg-[#071228] p-4 text-slate-100 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-200">CAPITAL-AI · Screener Architecture Bundle</p>
      <h2 id="screener-audience-heading" className="mt-2 text-xl font-bold text-white sm:text-2xl">
        Baue einen Screener, der seine Bewertung erklären kann.
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
        Vom Datenvertrag über Analysewerkzeuge bis zur Score-Aufschlüsselung: Das kombinierte Blueprint-Konzept
        zeigt, wie du Datenquellen, Pattern-Signale und Risiko-Gates nachvollziehbar verbinden kannst.
        Die öffentlich sichtbare YAML-Demo ersetzt weder Live-Datenrechte noch eine produktive Implementierung.
      </p>
      <h3 className="mt-5 text-sm font-bold text-white">Für wen ist das Bundle gedacht?</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {audiences.map(audience => (
          <article key={audience.title} className="rounded-xl border border-slate-700 bg-[#0a1931] p-4">
            <h4 className="text-sm font-bold text-sky-100">{audience.title}</h4>
            <p className="mt-1 text-xs font-semibold text-slate-200">{audience.subtitle}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">{audience.benefit}</p>
          </article>
        ))}
      </div>
      <h3 className="mt-6 text-sm font-bold text-white">Drei Bausteine – ein kombiniertes Produktkonzept</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {components.map(component => (
          <div key={component.title} className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
            <img src={component.src} width="72" height="72" loading="lazy"
              alt={component.title + ': eigenständiges CAPITAL-AI Produktmotiv, keine Zertifizierung'}
              className="h-[72px] w-[72px] rounded-xl" />
            <h4 className="mt-3 text-sm font-bold text-white">{component.title}</h4>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{component.detail}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-xs leading-relaxed text-amber-100">
        Vorschau / nicht kaufbar · kein bestätigter Live-Score · kein fertiges Studio · keine mitverkauften Providerrechte.
        Die vollständigen Kundenunterlagen und der Kaufprozess sind noch nicht freigegeben.
      </p>
    </section>
  );
}
