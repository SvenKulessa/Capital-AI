import { ArrowRight } from 'lucide-react';
import { MAIN_HUBS_CONFIG, type MainHubId } from './HubCatalog';
import { useLocale } from '../i18n/LocaleProvider';
interface Props { onNavigate:(path:string)=>void; onOpenModule:(id:string)=>void; onOpenSectorAnalysis:()=>void; onOpenPriceAlerts:()=>void; }
export function HomeHubDirectory({onNavigate}:Props) {
 const {tSection}=useLocale();
 return <section id="hub-directory" aria-labelledby="hub-directory-heading" className="mx-3 my-4 rounded-2xl border border-slate-800 bg-brand-canvas p-3 sm:mx-6 sm:p-4">
 <h2 id="hub-directory-heading" className="text-2xl font-bold text-white">{tSection('hubTitle')}</h2>
 <p className="mt-2 text-base text-slate-300">{tSection('hubDescription')}</p>
 <div className="mt-3 grid gap-2 sm:grid-cols-2">{(['marketscreener','learning','studio','documentation'] as MainHubId[]).map(id=>{const hub=MAIN_HUBS_CONFIG[id];return <a data-hub={id} key={id} href={hub.mainPath} onClick={e=>{if(e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();onNavigate(hub.mainPath);}}} className="hub-directory-card hub-switch flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-700 p-2 text-slate-100 hover:border-brand-gold focus-visible:outline-2 focus-visible:outline-brand-gold"><span aria-hidden="true">{hub.icon}</span><span className="flex-1 font-bold">{hub.name}</span><ArrowRight aria-hidden="true" className="h-5 w-5"/></a>;})}</div></section>;
}
