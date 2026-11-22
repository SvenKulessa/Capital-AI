import React, { useState } from 'react';
import lifecycle from './newsLifecycleIndex.json';
import { newsBiCsv, publishedNews } from '../../../shared/news-lifecycle.mjs';
import { marketImpactAdmitted } from '../../../shared/news-archive-rights.mjs';

type NewsItem = {
  id: string; title: string; topic: string; summary: string; publishedAt: string;
  retiredAt: string; category: string; archivePath: string;
  source: { url: string; name: string };
  rights: { status: string; evidenceRef: string | null };
  graphic?: { kind: 'network' | 'status' | 'flow'; caption: string; center?: string; labels?: string[]; rows?: {label: string; outcome: string}[] };
  context?: string;
  marketImpact: { status: string; verifiedScore?: number | null };
};

const data = lifecycle as { version: number; overview: NewsItem[]; archive: NewsItem[] };
const dateLabel = (date: string) => new Intl.DateTimeFormat('de-DE', {
  day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
}).format(new Date(date + 'T12:00:00Z'));
function NewsCard({ item }: { item: NewsItem }) {
  const verified = marketImpactAdmitted(item);
  return <article className="rounded-2xl border border-cyan-300/20 bg-slate-950/60 p-4 sm:p-5">
    <div className="flex flex-wrap items-center gap-2 text-xs text-cyan-200">
      <span className="rounded-full border border-cyan-300/30 px-2 py-1">{item.category}</span>
      <time dateTime={item.publishedAt}>{dateLabel(item.publishedAt)}</time>
    </div>
    <h3 className="mt-3 text-lg font-bold text-white">{item.title}</h3>
    <p className="mt-2 text-sm leading-6 text-slate-200">{item.summary}</p>
    {item.graphic && <details className="mt-3 rounded-xl border border-cyan-300/20 p-3 text-sm text-slate-200">
      <summary className="min-h-11 cursor-pointer font-semibold text-cyan-100">Infografik und Einordnung</summary>
      <figure className="mt-3" aria-label={item.graphic.caption}>
        <figcaption className="font-semibold">{item.graphic.caption}</figcaption>
        {item.graphic.kind === 'network' && <div className="mt-2 flex flex-wrap gap-2">
          <strong className="rounded-lg border border-cyan-300/40 p-2">{item.graphic.center}</strong>
          {item.graphic.labels?.map(label => <span className="rounded-lg border border-slate-600 p-2" key={label}>{label}</span>)}
        </div>}
        {item.graphic.kind === 'flow' && <ol className="mt-2 list-inside list-decimal space-y-2">
          {item.graphic.labels?.map(label => <li key={label}>{label}</li>)}
        </ol>}
        {item.graphic.kind === 'status' && <dl className="mt-2 space-y-2">
          {item.graphic.rows?.map(row => <div key={row.label} className="flex flex-wrap justify-between gap-2">
            <dt>{row.label}</dt><dd className="font-semibold">{row.outcome}</dd></div>)}
        </dl>}
      </figure>
      {item.context && <p className="mt-2 text-xs text-slate-300">{item.context}</p>}
    </details>}
    <p className="mt-3 text-xs text-slate-300">Nachträglicher Marktimpact: {verified
      ? `${item.marketImpact.verifiedScore}/100 (belegte Beobachtung, keine Kausalität)`
      : 'NOT_PROVEN – keine verifizierte Bewertung'}</p>
    <a className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-amber-200 underline hover:text-amber-100"
      href={item.source.url} target="_blank" rel="noopener noreferrer">Originalquelle: {item.source.name}</a>
  </article>;
}
export function AnalyticsNewsOverview() {
  const items = publishedNews(data.overview).slice(0, 3) as NewsItem[];
  return <section aria-labelledby="analytics-news-overview" className="rounded-3xl border border-cyan-300/25 bg-[#081726] p-4 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-cyan-200">Marktnews verstehen · Rückblick</p>
        <h2 id="analytics-news-overview" className="mt-2 text-2xl font-bold text-white">Frühere Marktnews</h2>
        <p className="mt-2 text-sm text-slate-300">Bis zu drei verdrängte Homepage-News, danach im News-Archiv.</p></div>
      <a href="/marketscreener/news-archiv" className="inline-flex min-h-11 items-center rounded-xl border border-cyan-300/40 px-4 text-sm text-cyan-100">News-Archiv öffnen</a>
    </div>
    {items.length ? <div className="mt-5 grid gap-4 lg:grid-cols-3">{items.map(item => <NewsCard key={item.id} item={item} />)}</div>
      : <p role="status" className="mt-4 text-sm text-slate-300">Noch keine freigegebenen früheren Meldungen vorhanden.</p>}
  </section>;
}
export function AnalyticsNewsArchive() {
  const [query, setQuery] = useState('');
  const [date, setDate] = useState('');
  const items = (publishedNews(data.archive) as NewsItem[])
    .filter(item => (!date || item.publishedAt === date) &&
      (!query || `${item.title} ${item.topic} ${item.category}`.toLocaleLowerCase('de').includes(query.toLocaleLowerCase('de'))));
  const categories = [...new Set(items.map(item => item.category))].sort();
  const csv = newsBiCsv(items);
  return <section aria-labelledby="analytics-news-archive" className="rounded-3xl border border-cyan-300/25 bg-[#081726] p-4 sm:p-7">
    <p className="text-xs font-semibold uppercase tracking-widest text-cyan-200">Analytics Hub</p>
    <h1 id="analytics-news-archive" className="mt-2 text-3xl font-bold text-white">News-Archiv</h1>
    <p className="mt-2 text-sm leading-6 text-slate-300">Kategorien und Veröffentlichungsdatum bilden die Ordnerstruktur.
      Marktreaktionen werden nur nach belegter Prüfung bewertet; Preisänderungen beweisen keine Nachrichtenursache.</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <label className="text-sm text-slate-200">Archiv durchsuchen
        <input className="mt-2 block min-h-11 w-full rounded-xl border border-slate-500 bg-slate-950 px-3 text-white"
          value={query} onChange={event => setQuery(event.target.value)} placeholder="Thema, Kategorie …" /></label>
      <label className="text-sm text-slate-200">Erscheinungsdatum
        <input type="date" className="mt-2 block min-h-11 w-full rounded-xl border border-slate-500 bg-slate-950 px-3 text-white"
          value={date} onChange={event => setDate(event.target.value)} /></label>
    </div>
    <a className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-cyan-300/40 px-4 text-sm text-cyan-100"
      href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} download="capital-ai-news-archiv-bi.csv">
      BI-Metadaten als CSV exportieren</a>
    <div className="mt-5 space-y-3">
      {categories.map(category => <details key={category} className="rounded-2xl border border-slate-600 p-3" open>
        <summary className="min-h-11 cursor-pointer font-semibold text-cyan-100">{category}</summary>
        {[...new Set(items.filter(item => item.category === category).map(item => item.publishedAt.slice(0, 4)))].sort().reverse().map(year =>
          <details key={year} className="ml-2 mt-2 border-l border-cyan-300/30 pl-3 sm:ml-4" open>
            <summary className="min-h-11 cursor-pointer text-slate-100">{year}</summary>
            {[...new Set(items.filter(item => item.category === category && item.publishedAt.startsWith(year)).map(item => item.publishedAt.slice(5, 7)))].sort().reverse().map(month =>
              <details key={month} className="ml-2 border-l border-slate-700 pl-3" open>
                <summary className="min-h-11 cursor-pointer text-slate-200">Monat {month}</summary>
                {[...new Set(items.filter(item => item.category === category && item.publishedAt.startsWith(year + '-' + month)).map(item => item.publishedAt))].sort().reverse().map(publishedAt =>
                  <details key={publishedAt} className="ml-2 border-l border-slate-700 pl-3">
                    <summary className="min-h-11 cursor-pointer text-sm text-slate-200">{dateLabel(publishedAt)}</summary>
                    <div className="grid gap-3 py-3 lg:grid-cols-2">{items.filter(item => item.category === category && item.publishedAt === publishedAt).map(item =>
                      <NewsCard key={item.id} item={item} />)}</div>
                  </details>)}
              </details>)}
          </details>)}
      </details>)}
      {!items.length && <p role="status" className="text-sm text-slate-300">Keine freigegebenen Nachrichten für die ausgewählten Filter.</p>}
    </div>
  </section>;
}
