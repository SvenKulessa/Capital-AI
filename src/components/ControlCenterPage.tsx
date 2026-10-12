import { HubNavigationPanel } from './HubNavigationPanel';
import React from 'react';
import { AnalysisComponentExplorer } from '../features/analysis/AnalysisComponentExplorer';
import { PipelineConfiguratorConsole } from '../features/analysis/PipelineConfiguratorConsole';
import { analysisUiEnabled } from '../features/analysis/analysisUiFlags';
import { RoadmapPanel } from './RoadmapPanel';
import { ProviderStatusDashboard } from './ProviderStatusDashboard';
import { DataUnavailable } from './DataUnavailable';
import { LicenseEnginePanel } from './LicenseEnginePanel';
import { ComponentInventoryDashboard } from './ComponentInventoryDashboard';
import { RepositoryToolCatalogDashboard } from './RepositoryToolCatalogDashboard';
import { ControlCenterNewsPanel } from './ControlCenterNewsPanel';
import { ObservabilityDashboard } from './ObservabilityDashboard';
import { MAIN_HUBS_CONFIG } from './HubCatalog';
import { APP_NAVIGATION_EVENT, CONTROL_CENTER_SECTION_IDS, navigateAppLocation, readHubTab } from '../utils/appNavigation';

export type ControlCenterTab = (typeof CONTROL_CENTER_SECTION_IDS)[number];

const SECTIONS = MAIN_HUBS_CONFIG['control-center'].subpages;

function readSection(fallback: ControlCenterTab): ControlCenterTab {
  if (typeof window === 'undefined') return fallback;
  const prefix = '/control-center/';
  const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, '');
  const section = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : '';
  return CONTROL_CENTER_SECTION_IDS.find((id) => id === section)
    ?? readHubTab(window.location.search, CONTROL_CENTER_SECTION_IDS, fallback);
}

interface ControlCenterPageProps {
  onBackToHome?: () => void;
  onNavigateLogin?: () => void;
  onNavigateTab?: (path: string) => void;
  initialTab?: ControlCenterTab;
}

/**
 * Dedicated client routes share this owner-gated shell. The server must enforce
 * the same owner policy for every /control-center/* document request.
 */
export const ControlCenterPage: React.FC<ControlCenterPageProps> = ({
  onBackToHome,
  onNavigateTab,
  initialTab = 'roadmap',
}) => {
  const [ownerAccess, setOwnerAccess] = React.useState<'checking' | 'allowed' | 'denied'>('checking');
  const [activeTab, setActiveTab] = React.useState<ControlCenterTab>(() => readSection(initialTab));
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const hasShownSection = React.useRef(false);

  React.useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/session', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((session) => {
        if (controller.signal.aborted) return;
        const allowed = session?.authenticated === true && session?.account?.iamRole === 'owner';
        setOwnerAccess(allowed ? 'allowed' : 'denied');
        if (!allowed) onBackToHome?.();
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setOwnerAccess('denied');
        onBackToHome?.();
      });
    return () => controller.abort();
  }, [onBackToHome]);

  React.useEffect(() => {
    const sync = () => setActiveTab(readSection(initialTab));
    sync();
    window.addEventListener('popstate', sync);
    window.addEventListener(APP_NAVIGATION_EVENT, sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener(APP_NAVIGATION_EVENT, sync);
    };
  }, [initialTab]);

  React.useEffect(() => {
    if (ownerAccess !== 'allowed') return;
    if (hasShownSection.current) headingRef.current?.focus();
    hasShownSection.current = true;
  }, [activeTab, ownerAccess]);

  const navigateSection = (value: string) => {
    const section = CONTROL_CENTER_SECTION_IDS.find((id) => id === value);
    if (!section) return;
    const target = '/control-center/' + section;
    if (onNavigateTab) onNavigateTab(target);
    else navigateAppLocation(target);
  };

  if (ownerAccess !== 'allowed') return null;

  const currentSection = SECTIONS.find((section) => section.id === activeTab);
  const sectionTitle = currentSection?.name ?? 'Roadmap';

  return (
    <div className="min-h-screen w-full px-3 py-5 text-slate-100 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-red-300 sm:text-3xl">Control Center</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
          Geschützter Verwaltungsbereich. Jeder Bereich besitzt eine direkt aufrufbare Unterseite.
        </p>
      </header>

      <HubNavigationPanel hubId="control-center" onNavigate={path => onNavigateTab ? onNavigateTab(path) : navigateAppLocation(path)} />
      <div className="min-w-0">
        <section id="control-center-content" aria-labelledby="control-center-section-title" className="min-w-0">
          <div className="mb-5 border-b border-slate-700 pb-4">
            <h2
              id="control-center-section-title"
              ref={headingRef}
              tabIndex={-1}
              className="text-xl font-bold leading-snug text-white outline-none sm:text-2xl"
            >
              {sectionTitle}
            </h2>
            {currentSection && <p className="mt-2 text-sm leading-relaxed text-slate-300">{currentSection.shortDesc}</p>}
          </div>

          {activeTab === 'roadmap' && <RoadmapPanel />}
          {activeTab === 'components' && <><ComponentInventoryDashboard />{analysisUiEnabled('components') && <AnalysisComponentExplorer compact />}</>}
          {activeTab === 'tools' && <RepositoryToolCatalogDashboard />}
          {activeTab === 'observability' && <ObservabilityDashboard />}
          {activeTab === 'news' && <ControlCenterNewsPanel />}
          {activeTab === 'licenses' && <LicenseEnginePanel />}

          {activeTab === 'console' && <PipelineConfiguratorConsole />}
          {activeTab === 'cockpit' && (
            <>
              <ProviderStatusDashboard onBackToHome={onBackToHome} />
              <DataUnavailable title="Executive Cockpit" required="belegte Projekt-, SLA- und Betriebskennzahlen" />
            </>
          )}
          {activeTab === 'team' && (
            <DataUnavailable title="Team & Rollen" required="belegte Verantwortlichkeits- und Berechtigungsdaten" />
          )}
          {activeTab === 'cost_center' && (
            <DataUnavailable title="Cost Center" required="belegte Kosten-, Budget- und Abrechnungsereignisse" />
          )}
          {activeTab === 'system' && (
            <>
              <ProviderStatusDashboard onBackToHome={onBackToHome} />
              {analysisUiEnabled('components') && <AnalysisComponentExplorer compact />}
              <DataUnavailable title="Systemoptionen" required="verifizierte Systemkonfiguration und Runtime-Evidence" />
            </>
          )}
        </section>
      </div>
    </div>
  );
};
