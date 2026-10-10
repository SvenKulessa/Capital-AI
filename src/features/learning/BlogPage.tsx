import React from 'react';
import { BLOG_ARTICLES, blogArticleForPath } from '../../../shared/blog-articles.mjs';

const linkStyle = 'inline-flex min-h-11 items-center text-amber-200 underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-brand-gold focus-visible:outline-offset-4';

/** Public, local editorial content: no login, billing or provider request. */
export function BlogPage({ path }: { path: string }) {
  const article = blogArticleForPath(path);
  return <div lang="de" className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12 text-slate-100 break-words">
    <nav aria-label="Blog-Navigation" className="mb-8 flex flex-wrap gap-x-6 gap-y-2">
      <a href="/" className={linkStyle}>Startseite</a>
      {article && <a href="/blog" className={linkStyle}>Alle Beiträge</a>}
      <a href="/learning" className={linkStyle}>Lernportal</a>
    </nav>
    {article ? <article aria-labelledby="blog-title">
      <header className="space-y-4">
        <p className="text-amber-200">CAPITAL AI · Wissen &amp; Lernen</p>
        <h1 id="blog-title" className="text-3xl font-bold leading-tight sm:text-4xl">{article.title}</h1>
        <p className="text-slate-300">Eigene Redaktion · <time dateTime={article.date}>10. Oktober 2026</time></p>
        <p className="text-base leading-7 text-slate-200">{article.intro}</p>
      </header>
      <figure className="my-8">
        <img src={article.image} alt={article.imageAlt} width="1200" height="630" className="h-auto w-full rounded-xl border border-brand-gold/20" />
        <figcaption className="mt-3 text-base leading-6 text-slate-300">Die vier Informationswege werden im folgenden Text erläutert. Eigene Illustration; keine realen Kursdaten.</figcaption>
      </figure>
      <div className="space-y-8">{article.sections.map(section => <section key={section.title}>
        <h2 className="mb-3 text-2xl font-semibold text-amber-200">{section.title}</h2>
        <p className="text-base leading-7 text-slate-200">{section.body}</p>
      </section>)}</div>
      <aside aria-label="Einordnung" className="my-8 border-l-4 border-brand-gold pl-4 text-base leading-7 text-slate-300">Dieser Artikel dient der technischen und didaktischen Information und ist keine Anlageberatung.</aside>
      <section aria-labelledby="blog-sources"><h2 id="blog-sources" className="text-2xl font-semibold">Quellen</h2>
        <ul className="mt-3 space-y-2">{article.sources.map(source => <li key={source.url}><a href={source.url} className={linkStyle}>{source.label}</a></li>)}</ul>
        <p className="mt-4 text-base leading-7 text-slate-300">Text und Illustration sind eigene redaktionelle Inhalte. Die verlinkten W3C-Dokumente werden als Quellen genannt; externe Bilder, eingebettete Fonts und Marktdaten werden nicht übernommen.</p>
      </section>
      <div className="mt-10 border-t border-brand-gold/20 pt-6"><a href="/learning?tab=news" className={linkStyle}>Weitere Lernimpulse entdecken</a></div>
    </article> : path === '/blog' ? <section aria-labelledby="blog-title">
      <h1 id="blog-title" className="text-3xl font-bold">Wissen &amp; Lernen</h1>
      <p className="mt-4 text-base leading-7 text-slate-300">Verständliche Beiträge zu Finanzwissen, Datenqualität und zugänglicher Marktanalyse.</p>
      <div className="mt-8 space-y-6">{BLOG_ARTICLES.map(item => <article key={item.id} className="rounded-xl border border-brand-gold/20 bg-brand-canvas p-5 sm:p-6">
        <h2 className="text-2xl font-semibold"><a href={item.path} className={linkStyle}>{item.title}</a></h2>
        <p className="mt-3 text-base leading-7 text-slate-300">{item.description}</p>
      </article>)}</div>
    </section> : <section><h1 className="text-3xl font-bold">Beitrag nicht gefunden</h1><p className="mt-4 text-base">Dieser Beitrag ist nicht verfügbar.</p><a href="/blog" className={linkStyle}>Zur Beitragsübersicht</a></section>}
  </div>;
}
