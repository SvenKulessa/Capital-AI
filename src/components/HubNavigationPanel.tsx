import { DOCUMENT_ROUTES } from '../../shared/hub-routes.mjs';
import { MAIN_HUBS_CONFIG, type MainHubId } from './HubCatalog';
export function HubNavigationPanel({hubId,onNavigate}:{hubId:MainHubId;onNavigate:(path:string)=>void}) {
 const hub=MAIN_HUBS_CONFIG[hubId];
 const current=typeof window==='undefined'?'':window.location.pathname.replace(/\/+$/,'')+window.location.search;
 return <nav aria-label={`${hub.name} Unterseiten`} className="mx-auto my-5 flex w-full max-w-5xl flex-wrap justify-center gap-2 rounded-2xl border border-slate-800 bg-brand-canvas p-3">
 {hub.subpages.map(page=>page.badge==='PENDING'?<span key={page.id} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-300"><span aria-hidden="true">{page.icon}</span>{page.name}<strong className="rounded-full border border-brand-gold px-2 py-1 text-xs text-brand-gold">PENDING</strong></span>:<a key={page.id} href={page.path} aria-current={current===page.path?'page':undefined} onClick={e=>{if(!Object.hasOwn(DOCUMENT_ROUTES,page.path)&&!/\.(html|txt)$/.test(page.path)&&e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();onNavigate(page.path);}}} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand-gold ${current===page.path?'border-brand-gold bg-brand-gold/10 text-brand-gold':'border-transparent text-slate-200 hover:bg-white/5'}`}><span aria-hidden="true">{page.icon}</span>{page.name}</a>)}
 </nav>;
}
