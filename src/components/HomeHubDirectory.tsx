import { ArrowRight } from 'lucide-react';
import { PUBLIC_BLUEPRINT_FOCUS } from '../../shared/public-search-focus.mjs';
import { MAIN_HUBS_CONFIG, type MainHubId } from './HubCatalog';
interface Props { onNavigate:(path:string)=>void; onOpenModule:(id:string)=>void; onOpenSectorAnalysis:()=>void; onOpenPriceAlerts:()=>void; }
const labels: Record<'learning' | 'marketscreener' | 'studio' | 'documentation' | 'social', string> = {
  learning: 'Lerninhalte erkunden', marketscreener: 'Marktanalysen erkunden',
  studio: 'Studio und Werkzeuge', documentation: 'Fachliche Dokumentation', social: 'Social Hub',
};
export function HomeHubDirectory({onNavigate}:Props) {
 return <section lang="de" id="hub-directory" aria-labelledby="hub-directory-heading" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
 <h2 id="hub-directory-heading" className="text-2xl font-bold text-white sm:text-3xl">Lernen und Analysieren</h2>
 <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">Entdecke Finanzwissen, Bewertungsmethoden und Datenqualität. Öffentliche Lernbeispiele sind keine verifizierten Live-Kurse oder Handlungssignale.</p>
 <div className="mt-5 grid gap-3 sm:grid-cols-2">{(['learning','marketscreener','studio','documentation','social'] as const).map(id=>{const hub=MAIN_HUBS_CONFIG[id as MainHubId];return <a data-hub={id} key={id} href={hub.mainPath} onClick={e=>{if(e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();onNavigate(hub.mainPath);}}} className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 p-3 text-slate-100 hover:border-brand-gold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-gold"><span className="flex-1 font-semibold">{labels[id]}</span><ArrowRight aria-hidden="true" className="h-5 w-5 shrink-0"/></a>;})}</div>
 <article className="mt-5 rounded-xl border border-slate-700 bg-slate-950 p-4">
  <h3 className="text-base font-semibold text-white">{PUBLIC_BLUEPRINT_FOCUS.title}</h3>
  <p className="mt-2 text-sm leading-6 text-slate-300">{PUBLIC_BLUEPRINT_FOCUS.body}</p>
  <a href={PUBLIC_BLUEPRINT_FOCUS.path} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-amber-200 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300">{PUBLIC_BLUEPRINT_FOCUS.label}</a>
 </article>
 </section>;
}
