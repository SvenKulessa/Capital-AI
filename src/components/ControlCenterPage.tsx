import React from 'react';
import { RoadmapPanel } from './RoadmapPanel';
import { CANONICAL_50_COMPONENTS } from '../contracts/analysisComponentRegistry';
import { validateAnalysisComponentRegistry } from '../contracts/analysisComponentRegistryValidator';
import { ProviderStatusDashboard } from './ProviderStatusDashboard';
import { DataUnavailable } from './DataUnavailable';
import { LicenseEnginePanel } from './LicenseEnginePanel';
import { ComponentInventoryDashboard } from './ComponentInventoryDashboard';
import { RepositoryToolCatalogDashboard } from './RepositoryToolCatalogDashboard';
import { ControlCenterNewsPanel } from './ControlCenterNewsPanel';
import { ObservabilityDashboard } from './ObservabilityDashboard';
import { MAIN_HUBS_CONFIG } from './HubSidebarDrawer';
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

/** Read-only canonical component inventory, shown only in the relevant operational sections. */
function AnalysisRegistryStatus() {
  const [search, setSearch] = React.useState('');
  const report = validateAnalysisComponentRegistry();
  const components = CANONICAL_50_COMPONENTS.filter((component) =>
    (component.componentId + ' ' + component.displayName).toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section className="mt-6 min-w-0" aria-labelledby="control-analysis-heading">
      <h3 id="control-analysis-heading" className="text-lg font-semibold text-white">Analyse-Komponenten</h3>
      <p className="my-3 text-sm leading-relaxed text-slate-300">
        {CANONICAL_50_COMPONENTS.filter((component) => component.status === 'planned').length} geplant ·{' '}
        {CANONICAL_50_COMPONENTS.filter((component) => component.status === 'blocked').length} gesperrt ·{' '}
        {report.issues.length} offene Referenz- und Aktivierungsprüfungen. Es gibt derzeit keinen produktiv freigegebenen Score.
      </p>
      <label htmlFor="control-analysis-search" className="block text-sm font-medium text-slate-200">
        Analyse-Komponente suchen
      </label>
      <input
        id="control-analysis-search"
        type="search"
        className="my-2 min-h-11 w-full rounded-md border border-slate-600 bg-slate-900 p-3 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Name oder Komponenten-ID"
      />
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <caption className="sr-only">Status und Provenienz der Analyse-Komponenten</caption>
          <thead>
            <tr className="border-b border-slate-600 text-slate-200">
              <th scope="col" className="px-2 py-3">Komponente</th>
              <th scope="col" className="px-2 py-3">Zustand</th>
              <th scope="col" className="px-2 py-3">Daten</th>
            </tr>
          </thead>
          <tbody>
            {components.map((component) => (
              <tr key={component.componentId} className="border-b border-slate-800">
                <th scope="row" className="px-2 py-3 align-top font-medium">
                  <details>
                    <summary className="cursor-pointer text-left text-slate-100 focus-visible:outline-2 focus-visible:outline-amber-400">
                      {component.displayName}
                    </summary>
                    <dl className="mt-3 space-y-1 break-words text-xs font-normal text-slate-300">
                      <dt className="font-semibold">Inputs</dt><dd>{component.inputContracts.join(', ')}</dd>
                      <dt className="font-semibold">Output</dt><dd>{component.outputContract}</dd>
                      <dt className="font-semibold">Features</dt><dd>{component.featureDependencies.join(', ')}</dd>
                      <dt className="font-semibold">Provider</dt><dd>{component.providerDependencies.join(', ')}</dd>
                      <dt className="font-semibold">Version</dt><dd>{component.calculationVersion}</dd>
                      <dt className="font-semibold">Owner</dt><dd>{component.owner}</dd>
                      <dt className="font-semibold">Letzte Validierung</dt><dd>{component.lastValidatedAt ?? 'ausstehend'}</dd>
                    </dl>
                  </details>
                </th>
                <td className="px-2 py-3 align-top">{component.status}</td>
                <td className="px-2 py-3 align-top">{component.provenanceMode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {components.length === 0 && <p role="status" className="mt-3 text-sm text-slate-300">Keine Komponenten gefunden.</p>}
    </section>
  );
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
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Control Center</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
          Geschützter Verwaltungsbereich. Jeder Bereich besitzt eine direkt aufrufbare Unterseite.
        </p>
      </header>

      <div className="mb-5 lg:hidden">
        <label htmlFor="control-center-section" className="mb-2 block text-sm font-semibold text-slate-100">
          Unterseite auswählen
        </label>
        <select
          id="control-center-section"
          value={activeTab}
          onChange={(event) => navigateSection(event.target.value)}
          className="min-h-12 w-full rounded-md border border-slate-500 bg-slate-900 px-3 py-2 text-base text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        >
          {SECTIONS.map((section) => (
            <option key={section.id} value={section.id}>{section.name}</option>
          ))}
        </select>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label="Control Center Unterseiten" className="hidden self-start border-l border-slate-700 lg:sticky lg:top-5 lg:block">
          <ul className="space-y-0.5">
            {SECTIONS.map((section) => {
              const isActive = activeTab === section.id;
              return (
                <li key={section.id}>
                  <a
                    href={section.path}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={(event) => {
                      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                      event.preventDefault();
                      navigateSection(section.id);
                    }}
                    className={
                      isActive
                        ? 'flex min-h-11 items-center gap-2 border-l-4 border-amber-400 bg-amber-400/15 px-3 py-2 text-sm font-semibold text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400'
                        : 'flex min-h-11 items-center gap-2 border-l-4 border-transparent px-3 py-2 text-sm text-slate-200 transition-colors hover:border-slate-500 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400'
                    }
                  >
                    <span aria-hidden="true" className="shrink-0">{section.icon}</span>
                    <span className="min-w-0">{section.name}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

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
          {activeTab === 'components' && <ComponentInventoryDashboard />}
          {activeTab === 'tools' && <RepositoryToolCatalogDashboard />}
          {activeTab === 'observability' && <ObservabilityDashboard />}
          {activeTab === 'news' && <ControlCenterNewsPanel />}
          {activeTab === 'licenses' && <LicenseEnginePanel />}

          {activeTab === 'console' && (
            <>
              <ProviderStatusDashboard onBackToHome={onBackToHome} />
              <AnalysisRegistryStatus />
            </>
          )}
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
              <AnalysisRegistryStatus />
              <DataUnavailable title="Systemoptionen" required="verifizierte Systemkonfiguration und Runtime-Evidence" />
            </>
          )}
        </section>
      </div>
    </div>
  );
};
