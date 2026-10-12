import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { canonicalHubTarget, DOCUMENT_ROUTES } from '../../shared/hub-routes.mjs';
import { MAIN_HUBS_CONFIG, type MainHubId } from './HubCatalog';
export function HubNavigationPanel({hubId,onNavigate}:{hubId:MainHubId;onNavigate:(path:string)=>void}) {
  const hub = MAIN_HUBS_CONFIG[hubId];
  const strip = useRef<HTMLElement>(null);
  const [overflow, setOverflow] = useState(false);
  const current = typeof window === 'undefined' ? '' : window.location.pathname.replace(/\/+$/, '') + window.location.search;
  const canonicalCurrent = canonicalHubTarget(current);
  const activePath = canonicalCurrent === hub.mainPath ? hub.subpages[0]?.path : canonicalCurrent;
  useEffect(() => {
    const element = strip.current;
    if (!element) return;
    const update = () => setOverflow(element.scrollWidth > element.clientWidth + 1);
    const observer = new ResizeObserver(update);
    observer.observe(element); update();
    element.querySelector('[aria-current="page"]')?.scrollIntoView({block:'nearest',inline:'nearest'});
    return () => observer.disconnect();
  }, [canonicalCurrent]);
  function scroll(direction:number) {
    const element = strip.current;
    if (element) element.scrollBy({left:direction * element.clientWidth * .75,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  return <div data-hub={hubId} className="hub-navigation mx-auto my-5 w-full max-w-5xl min-w-0">
    {overflow && <div className="flex items-center justify-between gap-3 px-1 text-sm text-slate-300"><span>Weitere Bereiche durch Wischen oder Scrollen</span><div className="flex shrink-0 gap-1"><button type="button" className="hub-scroll-button" aria-label="Unterseiten nach links scrollen" onClick={() => scroll(-1)}><ChevronLeft aria-hidden="true" /></button><button type="button" className="hub-scroll-button" aria-label="Unterseiten nach rechts scrollen" onClick={() => scroll(1)}><ChevronRight aria-hidden="true" /></button></div></div>}
    <nav ref={strip} aria-label={`${hub.name} Unterseiten`} className="hub-tab-strip">
      {hub.subpages.map(page => page.badge === 'PENDING' ? <span key={page.id} className="hub-tab text-slate-300"><span aria-hidden="true">{page.icon}</span>{page.name}<strong className="text-xs">Pausiert</strong></span> : <a key={page.id} href={page.path} aria-current={activePath === canonicalHubTarget(page.path)?'page':undefined} onClick={e => {if(!Object.hasOwn(DOCUMENT_ROUTES,page.path)&&!/\.(html|txt)$/.test(page.path)&&e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();onNavigate(page.path);}}} className="hub-tab"><span aria-hidden="true">{page.icon}</span>{page.name}</a>)}
    </nav>
  </div>;
}
