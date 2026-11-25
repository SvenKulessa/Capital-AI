import { BRAND_COLORS } from '../../../shared/hub-branding.mjs';
import { LEARNING_ARTICLES, latestLearningArticles } from '../../data/learningArticles';
import { getLicensedLearningGraphic } from './homeLearningGraphics';
import { VerifiedEditorialImage } from './VerifiedEditorialImage';
import { InteractiveArticleScene } from './InteractiveArticleScene';

const teasers: Record<string, { title: string; summary: string }> = {
  'portfolio-risiko-korrelation': {
    title: 'Wann Streuung dein Portfoliorisiko senken kann',
    summary: 'Mehr Positionen allein reichen nicht aus. Entscheidend ist auch, wie ähnlich sie sich bewegen und wie stark sie gewichtet sind.',
  },
  'liquiditaet-spread': {
    title: 'Warum der angezeigte Kurs vom Handelspreis abweichen kann',
    summary: 'Spread, Ordergröße und Markttiefe beeinflussen, zu welchem Preis eine Order ausgeführt werden kann.',
  },
  quellenzeit: {
    title: 'Ist die Meldung neu oder nur neu veröffentlicht?',
    summary: 'Prüfe, wann das Ereignis stattfand, wann die Meldung erschien und ob die Originalquelle sie später korrigiert hat.',
  },
};

/** Latest curated, already public editorial learning content only; no repository news. */
export function HomeLatestLearning({ onNavigate }: { onNavigate: (path: string) => void }) {
  const articles = latestLearningArticles(LEARNING_ARTICLES).slice(0, 3);
  return <section aria-labelledby="home-latest-learning-heading" lang="de" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-cyan-300">Aus dem Learning Hub</p>
        <h2 id="home-latest-learning-heading" className="mt-1 text-xl font-bold text-white">Aktuelle Lernbeiträge</h2>
      </div>
      <a href="/learning?tab=news" onClick={event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onNavigate('/learning?tab=news');
      }}
        className="inline-flex min-h-11 items-center rounded-xl border border-amber-400/35 px-3 text-sm font-bold text-amber-200 hover:bg-amber-400/10 focus-visible:outline-2 focus-visible:outline-amber-300">
        Alle Lernbeiträge ansehen
      </a>
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      {articles.map((article, index) => { const graphic = getLicensedLearningGraphic(article); return <article key={article.id} style={{ borderTopColor: [BRAND_COLORS.blue, BRAND_COLORS.green, BRAND_COLORS.pink][index] }} className="flex min-w-0 flex-col rounded-2xl border border-t-[3px] border-slate-700 bg-slate-950 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span className="rounded-md bg-cyan-400/10 px-2 py-1 text-cyan-200">{{ learning: "Finanzwissen", marketscreener: "Marktanalyse", studio: "Methoden und Werkzeuge" }[article.hub]}</span>
          <time dateTime={article.publishedAt}>{new Intl.DateTimeFormat('de-DE').format(new Date(article.publishedAt+'T12:00:00Z'))}</time>
        </div>
        {graphic && <figure className="mt-3 overflow-hidden rounded-xl border border-slate-700 [&_img]:block [&_img]:h-auto [&_img]:w-full">
          <VerifiedEditorialImage graphic={graphic} />
          <figcaption className="px-3 py-2 text-xs leading-5 text-slate-300">{graphic.caption} · Eigene Illustration, KI-unterstützt</figcaption>
        </figure>}
        <h3 className="mt-3 text-sm font-bold leading-6 text-white">{teasers[article.id]?.title ?? article.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-6 text-slate-300">{teasers[article.id]?.summary ?? article.body}</p>
        <InteractiveArticleScene articleId={article.id} />
        <a href={`/learning?tab=news#${article.id}`}
          className="mt-3 inline-flex min-h-11 items-center text-xs font-semibold text-amber-200 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-amber-300">
          {`Lesen: ${teasers[article.id]?.title ?? article.title}`} <span aria-hidden="true" className="ml-1">→</span>
        </a>
      </article>; })}
    </div>
  </section>;
}
