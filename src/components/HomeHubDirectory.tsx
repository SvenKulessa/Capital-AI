import { ArrowRight } from 'lucide-react';
import { MAIN_HUBS_CONFIG, type MainHubId } from './HubCatalog';
import { useLocale } from '../i18n/LocaleProvider';
interface Props { onNavigate:(path:string)=>void; onOpenModule:(id:string)=>void; onOpenSectorAnalysis:()=>void; onOpenPriceAlerts:()=>void; }
export function HomeHubDirectory({onNavigate}:Props) {
 const {tSection}=useLocale();
 return <section id="hub-directory" aria-labelledby="hub-directory-heading" className="mx-3 my-8 rounded-3xl border border-slate-800 bg-brand-canvas p-5 sm:mx-6 sm:p-7">
 <h2 id="hub-directory-heading" className="text-2xl font-bold text-white">{tSection('hubTitle')}</h2>
 <p className="mt-2 text-base text-slate-300">{tSection('hubDescription')}</p>
 <div className="mt-5 grid gap-4 sm:grid-cols-2">{(['marketscreener','learning','studio','documentation'] as MainHubId[]).map(id=>{const hub=MAIN_HUBS_CONFIG[id];return <a key={id} href={hub.mainPath} onClick={e=>{if(e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();onNavigate(hub.mainPath);}}} className="flex min-h-16 items-center gap-3 rounded-2xl border border-slate-700 p-4 text-slate-100 hover:border-brand-gold focus-visible:outline-2 focus-visible:outline-brand-gold"><span aria-hidden="true">{hub.icon}</span><span className="flex-1 font-bold">{hub.name}</span><ArrowRight aria-hidden="true" className="h-5 w-5"/></a>;})}</div></section>;
}
