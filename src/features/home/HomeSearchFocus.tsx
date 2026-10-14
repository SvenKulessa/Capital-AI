import { PUBLIC_SEARCH_FOCUS } from '../../../shared/public-search-focus.mjs';
export function HomeSearchFocus() {
  return <section lang="de" aria-label="Learning, Blueprints und Scoring" className="mx-auto grid max-w-7xl gap-5 px-5 py-6 md:grid-cols-3">
    {PUBLIC_SEARCH_FOCUS.map(item => <article key={item.path} className="rounded-2xl border border-slate-700 bg-slate-950 p-5">
      <h2 className="text-xl font-bold text-white">{item.title}</h2>
      <p className="my-4 text-base leading-7 text-slate-200">{item.body}</p>
      <a href={item.path} className="inline-flex min-h-11 items-center text-amber-200 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300">{item.label}</a>
    </article>)}
  </section>;
}
