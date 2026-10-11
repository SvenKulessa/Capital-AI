import React from 'react';
import { LEARNING_ARTICLES, LEARNING_ARTICLE_DATE } from '../../data/learningArticles';

/** Public, educational entry points only; checkout is handled by LearningPurchase. */
export function LearningArticles() {
  return (
    <section aria-labelledby="public-learning-articles" className="space-y-4">
      <h2 id="public-learning-articles" className="text-2xl font-bold text-amber-200">Lernimpulse · Wissen für alle</h2>
      <p className="text-sm leading-relaxed text-slate-300">
        Öffentliche Lerninhalte als Referenz für die Tagesfragen, redaktionell vom {LEARNING_ARTICLE_DATE}.
        Keine aktuellen Marktberichte, Handelssignale oder Anlageberatung.
      </p>
      <nav aria-label="Öffentliche Lernpfade" className="rounded-xl border border-cyan-400/20 bg-[#081126] p-4">
        <h3 className="text-lg font-semibold text-white">Vier Themen zum Einstieg</h3>
        <ul className="mt-3 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
          <li><strong className="text-white">Finanzwissen:</strong> <a className="text-cyan-200 underline underline-offset-4" href="/vocabulary/orderbuch">Orderbuch verstehen</a> und <a className="text-cyan-200 underline underline-offset-4" href="/vocabulary/bid-ask-spread">Geld-Brief-Spanne einordnen</a>.</li>
          <li><strong className="text-white">Datenqualität:</strong> Momentaufnahmen und Ausführung unterscheiden – <a className="text-cyan-200 underline underline-offset-4" href="/vocabulary/slippage">Slippage erklärt</a>.</li>
          <li><strong className="text-white">Mathematik:</strong> Gewichtete Faktoren als Lernbeispiel berechnen; <a className="text-cyan-200 underline underline-offset-4" href="/vocabulary/vwap">VWAP als eigenen Kennzahlentyp kennenlernen</a>.</li>
          <li><strong className="text-white">Research-Architektur:</strong> Quellen, Annahmen und historische Prüfung trennen – <a className="text-cyan-200 underline underline-offset-4" href="/vocabulary/backtesting">Backtesting erklärt</a>.</li>
        </ul>
      </nav>
      <article className="rounded-xl border border-amber-400/20 bg-[#090e21] p-5">
        <h3 className="text-lg font-bold text-white">Rechenbeispiel: Was bedeutet ein gewichteter Score?</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Drei fiktive Faktoren zwischen 0 und 1 werden mit den Gewichten 50 %, 30 % und 20 % kombiniert.
          Die Summe der Gewichte ist 100 %. Es handelt sich nicht um einen Live-Score und nicht um eine Prognose.
        </p>
        <p className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-3 font-mono text-sm text-cyan-200">
          0,50 × 0,80 + 0,30 × 0,40 + 0,20 × 0,60 = 0,64
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Das Ergebnis hängt von Skalierung, Faktorauswahl und Gewichten ab. Ohne validierte Daten
          und unabhängige Prüfung lässt sich daraus keine Rendite- oder Risikoprognose ableiten.
        </p>
      </article>
      <article className="rounded-xl border border-brand-gold/20 bg-brand-canvas p-5">
        <h3 className="text-xl font-bold">
          <a href="/blog/barrierefreie-finanzcharts" className="inline-flex min-h-11 items-center text-amber-200 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-brand-gold">
            Barrierefreie Finanzcharts: Vier Informationswege
          </a>
        </h3>
        <p className="mt-3 text-base leading-7 text-slate-300">
          Wie Textalternativen, Datenherkunft und Tastaturbedienung Finanzcharts verständlicher machen.
          Den vollständigen Beitrag kostenlos lesen.
        </p>
      </article>
      {LEARNING_ARTICLES.map(article => (
        <article id={article.id} key={article.id} className="rounded-xl border border-amber-400/20 bg-[#090e21] p-5">
          <h3 className="text-lg font-bold text-white">{article.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{article.body}</p>
        </article>
      ))}
      <aside className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
        <h3 className="font-bold text-amber-200">Vom kostenlosen Wissen zum Lernangebot</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Das öffentliche Glossar ist kostenlos zugänglich. Für weitere Begriffe und Quizzes
          bietet das Learning Portal einen separaten Einmalkauf; Zugang, Preis und Checkout
          können im interaktiven Glossar geprüft werden. Chart-Module können zusätzliche Abonnements erfordern.
        </p>
        <a href="/learning" className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-amber-400/50 px-4 text-sm font-bold text-amber-200 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-amber-200">
          Learning-Portal-Angebot und Zugang ansehen
        </a>
      </aside>
    </section>
  );
}
