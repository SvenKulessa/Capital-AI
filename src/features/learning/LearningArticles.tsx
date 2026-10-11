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
      <p className="text-base leading-7 text-slate-300"><a href="/learning#learning-methodology" className="inline-flex min-h-11 items-center text-cyan-200 underline underline-offset-4">Spread, Normalisierung, Scoring und Backtesting in sechs Lernschritten verstehen</a>.</p>
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
        <a href="/learning?tab=glossar#learning-offer" className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-amber-400/50 px-4 text-sm font-bold text-amber-200 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-amber-200">
          Learning-Portal-Angebot und Zugang ansehen
        </a>
      </aside>
    </section>
  );
}
