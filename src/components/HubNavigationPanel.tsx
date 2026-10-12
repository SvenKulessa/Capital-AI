import { DOCUMENT_ROUTES } from '../../shared/hub-routes.mjs';
import { MAIN_HUBS_CONFIG, type MainHubId } from './HubCatalog';

/**
 * Native links (different routes), not ARIA tabs. Horizontal scrolling is
 * pointer/touch- and keyboard-accessible, without wrapping on narrow screens.
 */
export function HubNavigationPanel({hubId,onNavigate}:{hubId:MainHubId;onNavigate:(path:string)=>void}) {
  const hub=MAIN_HUBS_CONFIG[hubId];
  const current=typeof window==='undefined'?'':window.location.pathname.replace(/\/+$/,'')+window.location.search;
  return (
    <nav
      aria-label={`${hub.name} Unterseiten`}
      data-hub-scroll-navigation={hubId}
      style={{borderColor: `${hub.color}55`}}
      className="mx-auto my-5 flex w-full max-w-5xl flex-nowrap items-center justify-start gap-2 overflow-x-auto overscroll-x-contain touch-pan-x scroll-smooth snap-x snap-proximity rounded-2xl border bg-brand-canvas p-3"
    >
      {hub.subpages.map(page=>page.badge==='PENDING'
        ? <span key={page.id} className="inline-flex min-h-11 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-300"><span aria-hidden="true">{page.icon}</span>{page.name}<strong className="rounded-full border border-slate-600 px-2 py-1 text-xs">PENDING</strong></span>
        : <a key={page.id} href={page.path}
            aria-current={current===page.path?'page':undefined}
            onFocus={event=>event.currentTarget.scrollIntoView({block:'nearest',inline:'nearest'})}
            onClick={e=>{if(!Object.hasOwn(DOCUMENT_ROUTES,page.path)&&!/\.(html|txt)$/.test(page.path)&&e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();onNavigate(page.path);}}}
            style={{outlineColor:hub.color,...(current===page.path?{borderColor:hub.color,color:hub.color,backgroundColor:`${hub.color}18`}:undefined)}}
            className={`inline-flex min-h-11 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 ${current===page.path?'':'border-transparent text-slate-200 hover:bg-white/5'}`}
          ><span aria-hidden="true">{page.icon}</span>{page.name}</a>)}
    </nav>
  );
}
