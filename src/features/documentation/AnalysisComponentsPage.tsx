import { ArrowLeft, ArrowRight, Layers3 } from 'lucide-react';
import { analysisArticles } from '../../../shared/analysis-documentation.mjs';

export function AnalysisComponentsPage() {
  return <main className="hub-universe hub-universe--documentation min-h-screen px-3 py-6 text-slate-100 sm:px-6">
    <div className="mx-auto max-w-5xl space-y-6">
      <a href="/dokumentation" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-300/40 px-4 font-semibold text-violet-100 focus-visible:outline-2 focus-visible:outline-violet-200">
        <ArrowLeft size={16} aria-hidden="true" /> Dokumentation Hub
      </a>
      <header className="rounded-3xl border border-violet-300/40 bg-gradient-to-br from-violet-900/55 to-slate-950 p-5 sm:p-8">
        <Layers3 size={28} className="text-violet-200" aria-hidden="true" />
        <h1 className="mt-3 text-3xl font-black text-violet-100 sm:text-5xl">Analyse Komponenten</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-200">Lesen, wie CAPITAL-AI Daten einordnet, Analysemerkmale berechnet und Ergebnisse nachvollziehbar dokumentiert.</p>
      </header>
      <nav aria-label="Artikel" className="flex flex-wrap gap-2">
        {analysisArticles.map(article => <a key={article.id} href={'#' + article.id}
          className="inline-flex min-h-11 items-center rounded-xl bg-violet-300/10 px-3 text-sm font-semibold text-violet-100 focus-visible:outline-2 focus-visible:outline-violet-200">{article.title}</a>)}
      </nav>
      {analysisArticles.map(article => <article key={article.id} id={article.id} aria-labelledby={article.id + '-heading'}
        className="scroll-mt-24 space-y-4 rounded-3xl border border-violet-300/30 bg-brand-canvas p-5 sm:p-8">
        <h2 id={article.id + '-heading'} className="text-2xl font-semibold text-violet-100">{article.title}</h2>
        <p className="leading-7 text-violet-200">{article.subtitle}</p>
        <figure className="rounded-2xl border border-violet-300/30 bg-violet-950/30 p-3 sm:p-4">
          <ol className="grid gap-3 sm:grid-cols-3">
            {article.rows.map((row, index) => <li key={row.title} className="relative min-w-0 rounded-xl border border-violet-300/40 p-3">
              <p className="font-bold text-violet-100">{row.title}</p>
              {row.lines.map(line => <p className="mt-1 text-sm text-slate-200" key={line}>{line}</p>)}
              {index < article.rows.length - 1 && <ArrowRight aria-hidden="true" size={18} className="absolute -right-4 top-3 hidden text-violet-200 sm:block" />}
            </li>)}
          </ol>
        </figure>
        {article.paragraphs.map(paragraph => <p key={paragraph} className="max-w-prose leading-7 text-slate-200">{paragraph}</p>)}
      </article>)}
    </div>
  </main>;
}
