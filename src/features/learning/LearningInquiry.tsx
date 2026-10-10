import { CONTROLLER } from '../../privacy/privacyPolicy';

export function LearningInquiry() {
  const subject = encodeURIComponent('Capital-AI Learning-/Kursanfrage');
  return <section aria-labelledby="learning-inquiry" className="my-6 rounded-2xl border border-amber-400/30 bg-slate-950 p-5 sm:p-6">
    <h2 id="learning-inquiry" className="text-xl font-semibold text-white">Welcher Lerninhalt passt zu deinem Ziel?</h2>
    <p className="mt-3 max-w-3xl text-base leading-6 text-slate-300">Du möchtest Finanzbegriffe verstehen, Chartmuster einordnen oder Fragen zum Learning-Zugang klären? Beschreibe uns dein Lernziel und deinen bisherigen Kenntnisstand.</p>
    <a href={`mailto:${CONTROLLER.supportEmail}?subject=${subject}`} className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-amber-400 px-5 py-3 text-base font-semibold text-slate-950 hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300">Learning-/Kursanfrage per E-Mail stellen</a>
    <p className="mt-3 text-sm leading-6 text-slate-400">Öffnet dein E-Mail-Programm. Deine Anfrage wird erst durch Absenden der E-Mail übermittelt. Bitte keine Zugangsdaten oder sensiblen Finanzinformationen senden.</p>
    <a href="/datenschutz" className="mt-2 inline-flex min-h-11 items-center text-sm text-amber-200 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300">Datenschutzhinweise</a>
  </section>;
}
