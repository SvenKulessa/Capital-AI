import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { hubTabAccent } from '../../shared/hub-branding.mjs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { canonicalHubTarget, DOCUMENT_ROUTES } from '../../shared/hub-routes.mjs';
import { MAIN_HUBS_CONFIG, type MainHubId } from './HubCatalog';

/** Compact navigation links, not ARIA tabs: each item is a real route. */
export function HubNavigationPanel({ hubId, onNavigate }: { hubId: MainHubId; onNavigate: (path: string) => void }) {
  const hub = MAIN_HUBS_CONFIG[hubId];
  const strip = useRef<HTMLElement>(null);
  const hintId = useId();
  const [scrollState, setScrollState] = useState({ overflow: false, back: false, forward: false });
  const current = typeof window === 'undefined' ? '' : window.location.pathname.replace(/\/+$/, '') + window.location.search;
  const canonicalCurrent = canonicalHubTarget(current);
  const activePath = canonicalCurrent === hub.mainPath ? hub.subpages[0]?.path : canonicalCurrent;

  useEffect(() => {
    const element = strip.current;
    if (!element) return;
    const update = () => {
      const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
      setScrollState({
        overflow: maxScroll > 2,
        back: element.scrollLeft > 2,
        forward: element.scrollLeft < maxScroll - 2,
      });
    };
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(element);
    element.addEventListener('scroll', update, { passive: true });
    const active = element.querySelector<HTMLElement>('[aria-current="page"]');
    if (active) element.scrollLeft = Math.max(0, active.offsetLeft - element.offsetLeft - 12);
    update();
    return () => {
      observer?.disconnect();
      element.removeEventListener('scroll', update);
    };
  }, [hubId, canonicalCurrent]);

  function scroll(direction: number) {
    const element = strip.current;
    if (!element) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollBy({ left: direction * element.clientWidth * 0.75, behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  return (
    <div data-hub={hubId} className="hub-navigation mx-auto my-4 w-full min-w-0 max-w-5xl">
      <p id={hintId} className="sr-only">Weitere Bereiche sind horizontal scrollbar. Auf Touchgeräten wischen, mit der Tastatur zu den Links navigieren.</p>
      {scrollState.overflow && (
        <div className="mb-1 hidden items-center justify-end gap-1 sm:flex">
          <button type="button" className="hub-scroll-button" aria-label={`${hub.name}: Bereiche nach links scrollen`} disabled={!scrollState.back} onClick={() => scroll(-1)}>
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <button type="button" className="hub-scroll-button" aria-label={`${hub.name}: Bereiche nach rechts scrollen`} disabled={!scrollState.forward} onClick={() => scroll(1)}>
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="hub-tab-viewport relative min-w-0">
        <nav ref={strip} aria-label={`${hub.name} Unterseiten`} aria-describedby={hintId} className="hub-tab-strip">
          {hub.subpages.map((page, index) => {
            const color = { '--tab-accent': hubTabAccent(hubId, index, page.id) } as CSSProperties;
            return page.badge === 'PENDING' ? (
              <span key={page.id} className="hub-tab text-slate-300" style={color}>
                <span aria-hidden="true">{page.icon}</span>{page.name}<strong className="text-xs">Pausiert</strong>
              </span>
            ) : (
              <a key={page.id} href={page.path} data-page={page.id}
                aria-current={activePath === canonicalHubTarget(page.path) ? 'page' : undefined}
                onClick={event => {
                  if (!Object.hasOwn(DOCUMENT_ROUTES, page.path) && !/\.(html|txt)$/.test(page.path) &&
                    event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                    event.preventDefault();
                    onNavigate(page.path);
                  }
                }}
                className="hub-tab" style={color}>
                <span aria-hidden="true">{page.icon}</span>{page.name}
              </a>
            );
          })}
        </nav>
        {scrollState.forward && <span aria-hidden="true" className="hub-tab-edge hub-tab-edge--right sm:hidden" />}
        {scrollState.back && <span aria-hidden="true" className="hub-tab-edge hub-tab-edge--left sm:hidden" />}
      </div>
    </div>
  );
}
