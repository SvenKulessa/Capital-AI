import { useId, useState } from 'react';
import { BookOpen, ChevronRight } from 'lucide-react';
import { calculateMethodology, METHODOLOGY_EXAMPLE, METHODOLOGY_SOURCE_SHA, METHODOLOGY_BANDS } from './scorerMethodology';
const number = (value: number) => value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function ScorerMethodologyDemo() {
  const id = useId();
  const [scenario, setScenario] = useState('complete');
  const values = scenario === 'empty' ? {} : scenario === 'partial' ? { trend: 80, momentum: 60 } : METHODOLOGY_EXAMPLE;
  const result = calculateMethodology(values);
  const circumference = 2 * Math.PI * 64;
  return <section data-hub="marketscreener" className="scorer-methodology rounded-2xl border border-slate-600 bg-slate-950 p-4 sm:p-6" aria-labelledby={`${id}-title`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="hub-heading text-sm font-bold">Enterprise Scorer · Methodik-Demo</p><h2 id={`${id}-title`} className="mt-2 text-2xl font-bold text-white">Bewertung verstehen. Faktoren vergleichen.</h2></div>
      <span className="hub-role-accent rounded-full border px-3 py-2 text-sm font-bold">SYNTHETISCH · keine Live-Bewertung</span>
    </div>
    <p className="mt-3 text-base leading-7 text-slate-200">Ein frei erfundenes Krypto-Rechenbeispiel nach der Methodik vom 16.08.2026. Es bewertet kein ausgewähltes Asset und nutzt keine Kurse aus den Übersichtskarten. Kein Ranking oder Handelssignal.</p>
    <label className="mt-4 block text-base font-semibold text-slate-200" htmlFor={`${id}-scenario`}>Rechenbeispiel<select id={`${id}-scenario`} className="mt-2 block min-h-11 w-full rounded-xl border border-slate-500 bg-slate-900 p-3 text-base text-white" value={scenario} onChange={e => setScenario(e.target.value)}>
      <option value="complete">Alle zehn Faktoren</option><option value="partial">Nur Trend und Momentum</option><option value="empty">Keine Faktoren verfügbar</option>
    </select></label>
    <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="min-w-0 rounded-xl border border-slate-700 p-4">
        <h3 className="text-lg font-bold text-white">Demo-Modellwert</h3>
        <div aria-hidden="true" className="mx-auto max-w-56"><svg viewBox="0 0 180 180" className="w-full"><circle cx="90" cy="90" r="64" fill="none" stroke="currentColor" strokeWidth="12" className="text-slate-700"/><circle cx="90" cy="90" r="64" fill="none" stroke="var(--hub-accent)" strokeWidth="12" strokeDasharray={`${circumference * (result.score ?? 0) / 100} ${circumference}`} transform="rotate(-90 90 90)"/><text x="90" y="88" textAnchor="middle" fill="currentColor" className="text-white" fontSize={result.score === null ? 16 : 30} fontWeight="700">{result.score === null ? 'Nicht verfügbar' : number(result.score)}</text><text x="90" y="114" textAnchor="middle" fill="currentColor" className="text-slate-200" fontSize="16">/ 100</text></svg></div>
        <p role="status" aria-live="polite" className="text-base text-white">{result.score === null ? 'Demo-Modellwert: nicht verfügbar.' : `Demo-Modellwert: ${number(result.score)} von 100. ${result.band}.`}</p>
        <dl className="mt-4 space-y-3 text-base text-slate-200"><div><dt>Faktorabdeckung</dt><dd className="font-semibold text-white">{result.availableCount} von 10 Faktoren · {number(result.weightCoverage * 100)} % des nominalen Gewichts</dd></div><div><dt>Kalibrierte Modellkonfidenz</dt><dd>Nicht ermittelt. Datenabdeckung ist keine Erfolgswahrscheinlichkeit.</dd></div><div><dt>Aktuelle Marktbewertung</dt><dd>Nicht verfügbar in dieser Methodik-Demo.</dd></div></dl>
      </div>
      <div className="min-w-0"><h3 className="text-lg font-bold text-white">Vollständiges Faktorprofil</h3><p className="mt-2 text-base leading-7 text-slate-200">Qualitätsskala 0–100: höher wirkt positiv. Beim Datenrisiko bedeutet ein höherer Eingang mehr Risiko; die Qualität ist 100 minus Risikowert.</p>
        <ul className="mt-4 space-y-3">{result.factors.map(f => <li key={f.id} className="rounded-xl border border-slate-700 p-3">
          <div className="flex flex-wrap justify-between gap-2 text-base"><span className="font-semibold text-white">{f.label}</span><span className="text-slate-200">{f.quality === null ? 'Nicht verfügbar' : `${number(f.quality)} / 100 Qualität`}</span></div>
          <meter min={0} max={100} value={f.quality ?? 0} aria-label={`${f.label}: ${f.quality === null ? 'nicht verfügbar' : `${f.quality} Qualitätspunkte`}`} className="mt-2 h-3 w-full" />
          <p className="mt-2 text-sm leading-6 text-slate-200">Eingang: {f.input === null ? 'fehlt' : number(f.input)}{f.inverted && f.input !== null ? ` → Qualität: 100 − ${number(f.input)} = ${number(f.quality!)}` : ''} · Gewicht: {number(f.weight * 100)} % nominal / {number(f.effectiveWeight * 100)} % effektiv · Beitrag: {f.contribution === null ? '—' : `${number(f.contribution)} Punkte`}</p>
        </li>)}</ul>
      </div>
    </div>
    <div className="mt-6 rounded-xl border border-slate-600 p-4"><h3 className="text-lg font-bold text-white">Warum dieser Wert?</h3><p className="mt-2 text-base leading-7 text-slate-200">{result.complete ? 'Die zehn gewichteten Qualitätswerte ergeben 74,08 Punkte. Trend trägt 16,40 Punkte bei; Exchange-Liquidität 2,96 Punkte. Datenrisiko 10 wird zu Qualität 90 und trägt 3,60 Punkte bei.' : result.score === null ? 'Ohne Faktoren gibt es keinen Modellwert. Fehlende Werte werden niemals als Nullbewertung veröffentlicht.' : 'Nur Trend 80 und Momentum 60 sind vorhanden: (0,20 × 80 + 0,16 × 60) / 0,36 = 71,11. Die übrigen Faktoren fehlen. Dieser Teilwert ist nicht direkt mit dem vollständigen Beispiel vergleichbar.'}</p></div>
    <details className="mt-4 rounded-xl border border-slate-700 p-4"><summary className="hub-heading min-h-11 cursor-pointer text-base font-semibold">Berechnung, Schwellen und Herkunft ansehen</summary><p className="mt-3 break-words text-base leading-7 text-slate-200">Effektives Gewicht = nominales Gewicht / Summe der verfügbaren nominalen Gewichte. Modellwert = Summe aus Qualität × effektivem Gewicht. Die Schwellen beschreiben ausschließlich Modellpunkte; sie sind keine Kauf- oder Verkaufsempfehlung.</p><ul className="mt-3 list-inside list-disc text-base leading-7 text-slate-200">{METHODOLOGY_BANDS.map(b => <li key={b.min}>{b.label}</li>)}</ul><p className="mt-3 break-all text-sm leading-6 text-slate-300">Version: {result.version} · Finance-Quelle: {METHODOLOGY_SOURCE_SHA} · Historische Nicht-Meme-Krypto-Gewichte; getrennt von der heutigen Engine mit sechs Score-Familien.</p></details>
    <div className="mt-5 flex flex-wrap gap-3"><a href="/learning?tab=glossar" className="scorer-methodology-link hub-role-accent inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-3 text-base font-semibold"><BookOpen aria-hidden="true" className="h-5 w-5 shrink-0"/>Kennzahlen kostenlos lernen</a><a href="/learning?tab=glossar#learning-offer" className="scorer-methodology-link inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-500 px-4 py-3 text-base font-semibold text-white">Learning-Angebot ansehen<ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0"/></a></div>
    <p className="mt-3 text-sm leading-6 text-slate-200">Kostenlose Vorschau. Das bestehende Learning-Angebot enthält Übungskarteikarten und Quizzes; zusätzliche Chart-Module haben eigene Zugangsbedingungen. Kauf und Freischaltung erfolgen im Learning Hub.</p>
  </section>;
}
