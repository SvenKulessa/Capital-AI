import React from 'react';
import { CADS_COMMERCIAL_READINESS } from '../../data/cadsCommercialReadiness.ts';
import { CHART_LESSONS } from '../../data/chartLearning.ts';
import { ChartLessonGraphic } from '../learning/ChartLessonGraphic.tsx';

export function LearningCadsShowcase({ onNavigate, onPricing }: { onNavigate: (path: string)=>void; onPricing:()=>void }) {
  const verified = CADS_COMMERCIAL_READINESS.websiteCommerce.runtimeEvidenceVerified;
  return <section lang="de" aria-label="Chartwissen und CADS" className="mx-auto grid max-w-7xl gap-6 px-4 py-12 lg:grid-cols-2">
    <article className="rounded-2xl border border-cyan-400/20 bg-[#0b1020] p-5 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-widest text-cyan-200">Chartwissen zum Ausprobieren</p>
      <h2 className="mt-3 text-2xl font-bold text-white">Muster erkennen. Signale hinterfragen.</h2>
      <div className="mt-4"><ChartLessonGraphic lesson={CHART_LESSONS[0]} /></div>
      <p className="mt-4 text-sm leading-relaxed text-slate-200">Flags, Umkehrmuster, RSI und MACD: zwölf Beispiele erklären, was du siehst – und wann eine Interpretation scheitert.</p>
      <button type="button" onClick={()=>onNavigate('/learning?tab=patterns')} className="mt-5 rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-slate-950">Chart-Lernatlas öffnen</button>
    </article>
    <article className="rounded-2xl border border-amber-400/20 bg-[#0b1020] p-5 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-200">CADS Benchmark Engine</p>
      <h2 className="mt-3 text-2xl font-bold text-white">Technologie mit nachvollziehbaren Kriterien vergleichen.</h2>
      <p className="mt-4 text-sm leading-relaxed text-slate-200">Für Entwickler und Research-Teams: CADS strukturiert Komponentenbewertungen mit Kriterien, Gewichten und Evidence. So wird sichtbar, worauf ein Vergleich beruht und welche Nachweise fehlen.</p>
      <ul className="mt-5 space-y-3 text-sm text-slate-200"><li>Versionierte Bewertungsprofile statt undurchsichtiger Ranglisten.</li><li>Evidence-Referenzen für nachvollziehbare Entscheidungen.</li><li>Tarifabhängige Funktionen im bestehenden Preiskatalog vergleichen.</li></ul>
      <p className="mt-5 rounded-lg border border-amber-300/30 p-3 text-sm text-amber-100">{verified?'Runtime-Nachweise liegen vor.':'Produktvorschau: Kauf- und Ausführungsablauf noch nicht vollständig live nachgewiesen.'} GitHub Marketplace: noch nicht veröffentlicht.</p>
      <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={onPricing} className="rounded-lg bg-amber-300 px-5 py-3 font-semibold text-slate-950">Tarife & Leistungsumfang ansehen</button>
        <button type="button" onClick={()=>onNavigate('/learning?tab=guides')} className="rounded-lg border border-slate-500 px-5 py-3 text-slate-100">Analyse-Methodik kennenlernen</button></div>
      <p className="mt-4 text-xs text-slate-300">CADS bewertet Technologiekomponenten. Markt-Scores sind ein eigener Analysebereich. Ein Benchmark ist keine Security-, Lizenz- oder Production-Freigabe.</p>
    </article>
  </section>;
}
