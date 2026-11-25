import { PUBLIC_SEARCH_FOCUS } from '../../../shared/public-search-focus.mjs';

export function HomeSearchFocus() {
  return <section lang="de" aria-labelledby="public-entry-title" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <h2 id="public-entry-title" className="text-2xl font-bold text-white sm:text-3xl">Drei Wege, Finanzmärkte besser zu verstehen</h2>
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {PUBLIC_SEARCH_FOCUS.slice(0, 3).map(item => <article key={item.path} className="flex min-w-0 flex-col rounded-2xl border border-slate-700 bg-slate-950 p-5">
        <h3 className="text-xl font-semibold text-white">{item.title}</h3>
        <p className="my-4 flex-1 text-base leading-7 text-slate-300">{item.body}</p>
        <a href={item.path} className="inline-flex min-h-11 items-center self-start rounded-md text-sm font-semibold text-amber-200 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300">{item.label}</a>
      </article>)}
    </div>
  </section>;
}
