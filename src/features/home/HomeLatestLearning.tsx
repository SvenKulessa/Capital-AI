import { LEARNING_ARTICLES, latestLearningArticles } from '../../data/learningArticles';

/** Latest curated, already public editorial learning content only; no repository news. */
export function HomeLatestLearning({ onNavigate }: { onNavigate: (path: string) => void }) {
  const articles = latestLearningArticles(LEARNING_ARTICLES);
  return <section aria-labelledby="home-latest-learning-heading" className="mx-3 mb-4 rounded-3xl border border-cyan-400/20 bg-[#071526] px-4 py-5 sm:mx-6 sm:px-6">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-cyan-300">Neu aus unseren Hubs</p>
        <h2 id="home-latest-learning-heading" className="mt-1 text-xl font-bold text-white">Aktuelle Lernbeiträge</h2>
      </div>
      <button type="button" onClick={() => onNavigate('/learning?tab=news')}
        className="min-h-11 rounded-xl border border-amber-400/35 px-3 text-xs font-bold text-amber-200 hover:bg-amber-400/10 focus-visible:outline-2 focus-visible:outline-amber-300">
        Alle Beiträge
      </button>
    </div>
    <div className="grid gap-3 md:grid-cols-3">
      {articles.map(article => <article key={article.id} className="rounded-2xl border border-slate-700/70 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
          <span className="rounded-md bg-cyan-400/10 px-2 py-1 text-cyan-200">Learning Hub</span>
          <time dateTime={article.publishedAt}>{new Intl.DateTimeFormat('de-DE').format(new Date(article.publishedAt+'T12:00:00Z'))}</time>
        </div>
        <h3 className="mt-3 line-clamp-2 text-sm font-bold leading-6 text-white">{article.title}</h3>
        <p className="mt-2 line-clamp-3 text-xs leading-6 text-slate-300">{article.body}</p>
        <button type="button" onClick={() => onNavigate('/learning?tab=news')}
          className="mt-3 min-h-11 text-xs font-semibold text-amber-200 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-amber-300">
          Beitrag lesen →
        </button>
      </article>)}
    </div>
  </section>;
}
