import { PRODUCT_DISCLAIMERS, DISCLAIMER_LEGAL_SOURCES } from '../../shared/product-disclaimers.mjs';
export function ProductDisclaimer({kind = 'marketing', full = false}: {kind?: 'marketing' | 'commerce' | 'scoring'; full?: boolean}) {
  if (!full) return null;
  return <aside aria-label="Rechtlicher Hinweis" className="mt-4 rounded-xl border border-slate-600/60 bg-slate-950/70 p-3 text-xs leading-relaxed text-slate-300">
    {PRODUCT_DISCLAIMERS[kind]} <a href="/agb" className="text-amber-200 underline">Rechtliche Hinweise</a>
    <details className="mt-2"><summary className="cursor-pointer text-slate-200">Rechtliche Grundlagen</summary>
      <ul className="mt-2 space-y-1">{['§ 2 WpIG · Anlageberatung', '§ 312k BGB · Kündigung von Verbraucherverträgen', 'Urheberrecht und Nutzungsrechte'].map((label,index)=><li key={label}><a href={DISCLAIMER_LEGAL_SOURCES[index]} target="_blank" rel="noopener noreferrer" className="text-amber-200 underline">{label}</a></li>)}</ul>
    </details>
  </aside>;
}
