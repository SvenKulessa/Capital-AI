import React from 'react';
import { LEARNING_ARTICLES, LEARNING_ARTICLE_DATE } from '../../data/learningArticles';
export function LearningArticles() {
 return <section aria-labelledby="public-learning-articles" className="space-y-4"><h2 id="public-learning-articles" className="text-2xl font-bold text-amber-200">Lernimpulse · Wissen für alle</h2>
   <p className="text-sm text-slate-300">Neue öffentliche Lerninhalte als Referenz für die Tagesfragen. Eigene Redaktion vom {LEARNING_ARTICLE_DATE}; Bildungsinhalte, keine aktuellen Marktberichte.</p>
   {LEARNING_ARTICLES.map(article=><article id={article.id} key={article.id} className="rounded-xl border border-amber-400/20 bg-[#090e21] p-5"><h3 className="text-lg font-bold text-white">{article.title}</h3><p className="mt-3 text-sm leading-relaxed text-slate-300">{article.body}</p></article>)}
 </section>;
}
