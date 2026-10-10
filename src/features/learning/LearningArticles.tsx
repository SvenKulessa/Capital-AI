import React from 'react';
import { LEARNING_ARTICLES, LEARNING_ARTICLE_DATE } from '../../data/learningArticles';
export function LearningArticles() {
 return <section aria-labelledby="public-learning-articles" className="space-y-4"><h2 id="public-learning-articles" className="text-2xl font-bold text-amber-200">Lernimpulse · Wissen für alle</h2>
   <p className="text-sm text-slate-300">Neue öffentliche Lerninhalte als Referenz für die Tagesfragen. Eigene Redaktion vom {LEARNING_ARTICLE_DATE}; Bildungsinhalte, keine aktuellen Marktberichte.</p>
   <article className="rounded-xl border border-brand-gold/20 bg-brand-canvas p-5"><h3 className="text-xl font-bold"><a href="/blog/barrierefreie-finanzcharts" className="inline-flex min-h-11 items-center text-amber-200 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-brand-gold">Barrierefreie Finanzcharts: Vier Informationswege</a></h3><p className="mt-3 text-base leading-7 text-slate-300">Wie Textalternativen, Datenherkunft und Tastaturbedienung Finanzcharts verständlicher machen. Den vollständigen Beitrag kostenlos lesen.</p></article>
   {LEARNING_ARTICLES.map(article=><article id={article.id} key={article.id} className="rounded-xl border border-amber-400/20 bg-[#090e21] p-5"><h3 className="text-lg font-bold text-white">{article.title}</h3><p className="mt-3 text-sm leading-relaxed text-slate-300">{article.body}</p></article>)}
 </section>;
}
