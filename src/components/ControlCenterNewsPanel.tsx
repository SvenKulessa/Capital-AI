import React from 'react';
import news from '../data/controlCenterNews.json';

/** Owner-only container is enforced by ControlCenterPage; content is draft-only. */
export function ControlCenterNewsPanel() {
  return (
    <section className="mx-auto max-w-5xl space-y-4" aria-labelledby="control-news-heading">
      <header className="rounded-2xl border border-slate-700 bg-slate-950/75 p-5">
        <p className="text-xs font-mono uppercase tracking-wider text-cyan-300">Content Engine · Social Media Engine</p>
        <h2 id="control-news-heading" className="mt-2 text-xl font-bold">News aus dem Repository</h2>
        <p className="mt-2 text-sm text-slate-400">Nach jeweils 20 gemergten PRs entsteht ein quellengebundener Blogentwurf.
          Der Beitrag wird über einen separaten GitHub-PR zur Prüfung bereitgestellt, nicht automatisch veröffentlicht.</p>
        <p className="mt-3 text-sm text-amber-300" role="status">
          {news.lastBatchPr ? `Letzter News-Abgleich: PR #${news.lastBatchPr}` : 'Noch kein geprüfter News-Batch importiert'}
        </p>
      </header>
      {news.state === 'DRAFT_NOT_PUBLISHED' && news.article
        ? <article className="rounded-2xl border border-slate-700 bg-slate-950/70 p-5">
            <h3 className="text-lg font-semibold">{news.title}</h3>
            <p className="mt-2 text-xs text-amber-300">Entwurf · Nicht veröffentlicht · Quelle: {news.sourceSha?.slice(0, 12)}</p>
            <pre className="mt-4 whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-300">{news.article}</pre>
            <p className="mt-4 text-xs text-slate-400">Publisher-Status: INTEGRATION_PENDING · Social-Media-Distribution nicht aktiviert</p>
          </article>
        : <p className="rounded-xl border border-slate-700 bg-slate-950/60 p-5 text-sm text-slate-400">
            Noch kein Blogbeitrag zur Prüfung vorhanden. Die nächste vollständige 20er-Mergegruppe erzeugt einen Draft-PR.
          </p>}
    </section>
  );
}
