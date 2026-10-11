import React, { useEffect } from 'react';
import { LEARNING_JOURNEY, LEARNING_NEXT_STEPS } from '../../../shared/learning-journey.mjs';

/** The same public lesson source is rendered by the server without JavaScript. */
export function LearningJourney() {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id === 'learning-methodology' || LEARNING_JOURNEY.some(lesson => lesson.id === id)) {
      document.getElementById(id)?.scrollIntoView();
    }
  }, []);
  return <section id="learning-methodology" aria-labelledby="learning-methodology-title" className="my-6 space-y-4">
    <h2 id="learning-methodology-title" className="text-2xl font-bold text-amber-200">Marktanalyse verstehen: sechs kostenlose Lernschritte</h2>
    <p className="text-base leading-7 text-slate-300">Für Lernende, Studierende und Fintech-Teams. Alle Rechenwerte sind synthetisch. Keine Handelssignale, Renditeprognosen oder Anlageberatung.</p>
    <div className="grid min-w-0 gap-3 md:grid-cols-2">
      {LEARNING_JOURNEY.map(lesson => <details id={lesson.id} key={lesson.id} className="min-w-0 rounded-xl border border-amber-400/20 bg-brand-canvas p-4">
        <summary className="min-h-11 cursor-pointer text-lg font-semibold text-amber-200 focus-visible:outline-2 focus-visible:outline-brand-gold">{lesson.title}</summary>
        <p className="mt-3 text-base leading-7 text-white"><strong>Lernziel:</strong> {lesson.goal}</p>
        {lesson.paragraphs.map(text => <p key={text} className="mt-3 text-base leading-7 text-slate-300">{text}</p>)}
        <p className="mt-3 break-words rounded-lg bg-slate-950 p-3 font-mono text-sm leading-6 text-cyan-200">{lesson.example}</p>
        <nav aria-label={`Weiterlernen: ${lesson.title}`} className="mt-3 flex flex-wrap gap-3">{lesson.links.map(link => <a key={link.href} href={link.href} className="inline-flex min-h-11 items-center text-cyan-200 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-brand-gold">{link.label}</a>)}</nav>
      </details>)}
    </div>
    <p className="text-sm text-slate-200"><a href="/architecture-hub?tab=learning" className="inline-flex min-h-11 items-center font-semibold text-cyan-200 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-amber-300">Interaktive Architecture Learning Journey öffnen →</a></p>
    <nav aria-label="Vom Lernbeispiel zum Angebot" className="grid gap-4 rounded-xl border border-amber-400/30 p-4 md:grid-cols-3">{LEARNING_NEXT_STEPS.map(step => <div key={step.href} className="min-w-0"><a href={step.href} className="inline-flex min-h-11 items-center text-base font-semibold text-amber-200 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-brand-gold">{step.label}</a><p className="mt-2 text-base leading-7 text-slate-300">{step.note}</p></div>)}</nav>
  </section>;
}
