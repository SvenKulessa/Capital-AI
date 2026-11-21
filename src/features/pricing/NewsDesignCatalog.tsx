import { useId, useState } from 'react';
import { NEWS_DESIGN_OFFER } from '../../data/pricingCatalog';

const layouts = [
  { id: 'hero', name: 'Titelbild', use: 'Für Produktstarts und einzelne Leitmeldungen',
    headline: 'Ein neuer Zahlungsweg', labels: ['Bank', 'Abwicklung', 'Empfang'], graphic: 'NETZWERK' },
  { id: 'briefing', name: 'Kurzbriefing', use: 'Für Änderungen an APIs, Regeln und Handelsplätzen',
    headline: 'Eine Schnittstelle ändert sich', labels: ['Betroffen', 'Auswirkung', 'Nächste Prüfung'], graphic: 'STATUS' },
  { id: 'timeline', name: 'Zeitachse', use: 'Für Rollouts, Fristen und angekündigte Ereignisse',
    headline: 'Ein Rollout in drei Schritten', labels: ['Ankündigung', 'Pilot', 'Freigabe'], graphic: 'ABLAUF' },
  { id: 'comparison', name: 'Vergleich', use: 'Für Methoden, Produkte und geänderte Bedingungen',
    headline: 'Zwei Abwicklungsmodelle', labels: ['Modell A', 'Modell B'], graphic: 'GEGENÜBERSTELLUNG' },
] as const;

export function NewsDesignCatalog() {
  const headingId = useId();
  const choiceId = useId();
  const [id, setId] = useState<string>(layouts[0].id);
  const item = layouts.find(layout => layout.id === id) ?? layouts[0];
  const figure = (
    <figure className="rounded-xl border border-slate-600 bg-slate-950 p-3">
      <figcaption className="mb-2 text-sm font-semibold tracking-wide text-cyan-200">{item.graphic}</figcaption>
      <ol className={`grid gap-2 ${item.id === 'comparison' ? 'grid-cols-2' :
        item.id === 'briefing' ? 'grid-cols-1' : 'sm:grid-cols-3'}`}>
        {item.labels.map((label, index) => (
          <li key={label} className={`min-w-0 break-words rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm
            ${item.id === 'hero' && index === 1 ? 'border-cyan-400 text-cyan-100' : 'text-slate-100'}`}>
            {item.id === 'timeline' && <span className="mr-1 text-amber-200">{index + 1}.</span>}{label}
          </li>
        ))}
      </ol>
    </figure>
  );
  const imageFirst = item.id === 'hero' || item.id === 'timeline';
  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-amber-400/40 bg-brand-canvas p-4 text-slate-100 sm:p-6">
      <h3 id={headingId} className="text-2xl font-bold text-amber-100">{NEWS_DESIGN_OFFER.label}</h3>
      <p className="mt-2 text-base">{NEWS_DESIGN_OFFER.deliverables}</p>
      <p className="mt-1 text-base text-amber-200">{NEWS_DESIGN_OFFER.pricing} · Individuelles Angebot</p>
      <label htmlFor={choiceId} className="mt-4 block text-base font-semibold">Artikel-Design auswählen</label>
      <select id={choiceId} value={item.id} onChange={event => setId(event.target.value)}
        className="mt-2 min-h-11 w-full rounded-lg border border-slate-500 bg-slate-900 px-2 text-base text-white focus-visible:outline-2 focus-visible:outline-cyan-300">
        {layouts.map(layout => <option key={layout.id} value={layout.id}>{layout.name}</option>)}
      </select>
      <article aria-label="Designvorschau" className="mt-3 grid gap-3 rounded-xl border border-slate-700 bg-slate-900 p-3 sm:p-4">
        <p className="text-sm font-semibold text-cyan-200">Musterartikel · {item.use}</p>
        <h4 className="text-xl font-bold">{item.headline}</h4>
        {imageFirst && figure}
        <p className="text-base leading-relaxed">Einordnung, betroffene Bereiche und ein Link zum ursprünglichen Bericht.</p>
        {!imageFirst && figure}
        <p className="border-t border-slate-600 pt-2 text-sm text-slate-300">Quellen- und Bildnachweis</p>
      </article>
      <a className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-amber-300 px-3 text-base font-semibold text-amber-100 focus-visible:outline-2 focus-visible:outline-cyan-300"
        href={`mailto:support@capital-ai.online?subject=${encodeURIComponent('FinTech News Design Studio · ' + item.name)}`}>
        Angebot für {item.name} anfragen
      </a>
    </section>
  );
}
