import { useEffect, useState } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { MAIN_HUBS_CONFIG } from './HubSidebarDrawer';
import { useLocale } from '../i18n/LocaleProvider';
import type { SectionKey } from '../i18n/landingSectionCopy';
import type { MainHubId, HubSubpageConfig } from './HubSidebarDrawer';

interface HomeHubDirectoryProps {
  onNavigate: (path: string) => void;
  onOpenModule: (moduleId: string) => void;
  onOpenSectorAnalysis: () => void;
  onOpenPriceAlerts: () => void;
}

/** Homepage and HubSidebarDrawer use the same canonical destination catalog. */
export function HomeHubDirectory({
  onNavigate,
  onOpenModule,
  onOpenSectorAnalysis,
  onOpenPriceAlerts,
}: HomeHubDirectoryProps) {
  const {locale, tSection} = useLocale();
  const [expandedHub, setExpandedHub] = useState<MainHubId | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/session', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(session => {
        if (!controller.signal.aborted) {
          setIsOwner(session?.authenticated === true && session?.account?.iamRole === 'owner');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setIsOwner(false);
      });
    return () => controller.abort();
  }, []);

  const summaries: Record<MainHubId, SectionKey> = {
    marketscreener:'hubMarketDescription', studio:'hubStudioDescription',
    learning:'hubLearningDescription', documentation:'hubDocsDescription',
    'control-center':'hubControlDescription'
  };
  // Three focused public hub entries on the landing page. All others stay in the main menu.
  const homepageHubIds: MainHubId[] = ['marketscreener', 'learning', 'studio'];
  const hubs = homepageHubIds
    .filter(hubId => hubId !== 'control-center' || isOwner);

  const openSubpage = (hubId: MainHubId, subpage: HubSubpageConfig) => {
    if (hubId === 'control-center' && !isOwner) return;
    if (hubId === 'marketscreener') {
      switch (subpage.id) {
        case 'buffett':
          onOpenModule('buffett-value');
          return;
        case 'scorer':
          onOpenModule('enterprise-scorer');
          return;
        case 'sector':
          onOpenSectorAnalysis();
          return;
        case 'newsfeed':
          onOpenModule('ai-newsfeed');
          return;
        case 'alerts':
          onOpenPriceAlerts();
          return;
      }
    }
    if (/^\/(?:documentation\/.*\.html|downloads\/.*\.html|fonts\/.*\.txt)$/.test(subpage.path)) {
      window.location.assign(subpage.path);
      return;
    }
    onNavigate(subpage.path);
  };

  return (
    <section id="hub-directory" aria-labelledby="hub-directory-heading" className="mx-3 my-8 rounded-3xl border border-slate-800 bg-[#050b18] px-3 py-6 text-slate-100 sm:mx-6 sm:p-7">
      <div className="mb-5">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-amber-300">{tSection('hubOverline')}</p>
        <h2 id="hub-directory-heading" className="mt-2 text-2xl font-black sm:text-3xl">{tSection('hubTitle')}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          {tSection('hubDescription')}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {hubs.map(hubId => {
          const hub = MAIN_HUBS_CONFIG[hubId];
          const isExpanded = expandedHub === hubId;
          const panelId = `hub-directory-${hubId}`;
          return (
            <div key={hubId} className="min-w-0 rounded-2xl border border-slate-700/70 bg-[#090f24]" style={{ borderColor: isExpanded ? `${hub.color}80` : undefined }}>
              <button
                type="button"
                aria-expanded={isExpanded}
                aria-controls={panelId}
                onClick={() => setExpandedHub(isExpanded ? null : hubId)}
                className="flex min-h-16 w-full items-center gap-3 rounded-2xl p-4 text-left transition-colors hover:bg-white/5"
              >
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border" style={{ backgroundColor: `${hub.color}18`, borderColor: `${hub.color}55`, color: hub.color }}>{hub.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-white">{hub.name}</span>
                  <span className="mt-1 block text-xs text-slate-400">{hub.subpages.length} {tSection('hubSections')} · {tSection(summaries[hubId])}</span>
                </span>
                <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              <div id={panelId} hidden={!isExpanded} className="border-t border-slate-800 p-3">
                {isExpanded && (
                  <>
                    <nav aria-label={`${hub.name} ${tSection('hubTabs')}`} className="grid gap-2">
                      {hub.subpages.map(subpage => (
                        <button
                          key={subpage.id}
                          type="button"
                          onClick={() => openSubpage(hubId, subpage)}
                          className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-slate-800 bg-black/20 p-3 text-left transition-colors hover:border-slate-600 hover:bg-white/5"
                        >
                          <span aria-hidden="true" className="shrink-0" style={{ color: hub.color }}>{subpage.icon}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-semibold text-white">{subpage.name}</span>
                            <span lang={locale === 'de' ? undefined : 'de'} className="mt-1 block text-[11px] text-slate-400">{subpage.shortDesc}</span>
                          </span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                        </button>
                      ))}
                    </nav>
                    <button
                      type="button"
                      onClick={() => { if (hubId !== 'control-center' || isOwner) onNavigate(hub.mainPath); }}
                      className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition-colors hover:bg-white/10"
                      style={{ borderColor: `${hub.color}70`, color: hub.color }}
                    >
                      {tSection('hubOpen')} {hub.name} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
