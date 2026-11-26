import { BLOG_ARTICLES } from '../../../shared/blog-articles.mjs';
import { ArrowRight, Newspaper, ShieldCheck } from 'lucide-react';

/** Compact published editorial news; no new rights or redistribution implied. */
export function CompactSocialNews({ onNavigate }: { onNavigate: (path: string) => void }) {
  const items = BLOG_ARTICLES.slice(0, 2);
  return <section className="mx-auto my-5 max-w-7xl px-3 sm:px-6" aria-labelledby="social-blog-heading">
    <div className="rounded-2xl border border-pink-300/25 bg-[#0b1429] p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-pink-200"><Newspaper aria-hidden="true" className="h-4 w-4" /> Social Content Engine · News Blog</p>
          <h2 id="social-blog-heading" className="mt-1 text-xl font-bold text-white">Kurz & nachvollziehbar</h2>
          <p className="mt-1 text-sm text-slate-300">Eigene Redaktion, nachprüfbare Quellen und Rechte vor Veröffentlichung.</p></div>
        <button type="button" onClick={() => onNavigate('/social/news')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-pink-300/40 px-4 text-sm font-semibold text-pink-100">Social Hub öffnen <ArrowRight aria-hidden="true" className="h-4 w-4" /></button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{items.map(article => <article key={article.id} className="rounded-xl border border-slate-700/70 p-3">
        <p className="text-xs text-slate-400"><time dateTime={article.date}>{article.date}</time> · Eigene Redaktion</p>
        <h3 className="mt-1 text-sm font-semibold text-white"><a href={article.path} className="underline-offset-4 hover:underline">{article.title}</a></h3>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-300">{article.description}</p>
      </article>)}</div>
      <p className="mt-3 flex items-start gap-2 text-xs text-slate-400"><ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-300" /> Externe Beiträge, Grafiken und Provider-Medien werden nicht ohne Rechteprüfung übernommen.</p>
    </div>
  </section>;
}
