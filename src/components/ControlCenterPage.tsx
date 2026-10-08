import React from 'react';
import { RoadmapPanel } from './RoadmapPanel';
import { CANONICAL_50_COMPONENTS } from '../contracts/analysisComponentRegistry';
import { validateAnalysisComponentRegistry } from '../contracts/analysisComponentRegistryValidator';
import { ProviderStatusDashboard } from './ProviderStatusDashboard';
import { DataUnavailable } from './DataUnavailable';
import { useHubTab } from '../hooks/useHubTab';
import { LicenseEnginePanel } from './LicenseEnginePanel';
import { ComponentInventoryDashboard } from './ComponentInventoryDashboard';
import { RepositoryToolCatalogDashboard } from './RepositoryToolCatalogDashboard';
import { ControlCenterNewsPanel } from './ControlCenterNewsPanel';
import { TokenomicsResearchPanel } from './TokenomicsResearchPanel';
import { ObservabilityDashboard } from './ObservabilityDashboard';
export type ControlCenterTab = 'roadmap' | 'components' | 'tools' | 'observability' | 'research' | 'news' | 'console' | 'cockpit' | 'team' | 'cost_center' | 'system' | 'licenses';
const CONTROL_TABS: readonly ControlCenterTab[] = ['roadmap', 'components', 'tools', 'observability', 'research', 'news', 'console', 'cockpit', 'team', 'cost_center', 'system', 'licenses'];
const CONTROL_TAB_LABELS: Record<ControlCenterTab, string> = {
  roadmap: 'Roadmap',
  components: 'Komponenten & CADS',
  tools: 'Tools & Anwendungen',
  observability: 'Observability',
  research: 'Research & Tokenomics',
  news: 'News',
  console: 'Console',
  cockpit: 'Cockpit',
  team: 'Team & Rollen',
  cost_center: 'Cost Center',
  system: 'System',
  licenses: 'Lizenzen & Nachweise',
};
interface ControlCenterPageProps { onBackToHome?: () => void; onNavigateLogin?: () => void; onNavigateTab?: (path: string) => void; initialTab?: ControlCenterTab; }
export const ControlCenterPage: React.FC<ControlCenterPageProps> = ({ onBackToHome, initialTab = 'roadmap' }) => {
 const [ownerAccess, setOwnerAccess] = React.useState<'checking' | 'allowed' | 'denied'>('checking');
 const [activeTab, setActiveTab] = useHubTab(CONTROL_TABS, initialTab);
 React.useEffect(() => {
   const controller = new AbortController();
   fetch('/api/auth/session', {
     credentials: 'same-origin',
     cache: 'no-store',
     headers: { Accept: 'application/json' },
     signal: controller.signal,
   })
     .then(response => response.ok ? response.json() : Promise.reject())
     .then(session => {
       const allowed = session?.authenticated === true && session?.account?.iamRole === 'owner';
       if (!controller.signal.aborted) setOwnerAccess(allowed ? 'allowed' : 'denied');
       if (!allowed && !controller.signal.aborted) onBackToHome?.();
     })
     .catch(() => {
       if (!controller.signal.aborted) {
         setOwnerAccess('denied');
         onBackToHome?.();
       }
     });
   return () => controller.abort();
 }, [onBackToHome]);
 const [search, setSearch] = React.useState('');
 if (ownerAccess !== 'allowed') return null;
 const report = validateAnalysisComponentRegistry();
 const components = CANONICAL_50_COMPONENTS.filter(c => `${c.componentId} ${c.displayName}`.toLowerCase().includes(search.toLowerCase()));
 return <div className="w-full text-slate-100 min-h-screen py-4 px-3 sm:px-6">
  <h1 className="text-2xl font-bold">Control Center</h1>
  <nav className="my-4 flex flex-wrap gap-2" aria-label="Control Center Tabs" role="tablist">{CONTROL_TABS.map(tab => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${activeTab === tab ? 'border-amber-300 bg-amber-400 text-black shadow-[0_0_16px_rgba(245,176,20,0.2)]' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600 hover:text-white'}`}>{CONTROL_TAB_LABELS[tab]}</button>)}</nav>
  {activeTab === 'licenses' && <LicenseEnginePanel />}
  {activeTab === 'roadmap' && <RoadmapPanel />}
  {activeTab === 'components' && <ComponentInventoryDashboard />}
  {activeTab === 'tools' && <RepositoryToolCatalogDashboard />}
  {activeTab === 'observability' && <ObservabilityDashboard />}
  {activeTab === 'news' && <ControlCenterNewsPanel />}
  {activeTab === 'research' && <TokenomicsResearchPanel />}
  {!['licenses', 'components', 'tools', 'observability', 'research', 'news'].includes(activeTab) && <>
  <ProviderStatusDashboard onBackToHome={onBackToHome} />
  <h2 className="text-xl font-bold mt-6">50 Analyse-Komponenten</h2>
  <p className="text-sm text-slate-400 my-3">{CANONICAL_50_COMPONENTS.filter(c => c.status === 'planned').length} geplant · {CANONICAL_50_COMPONENTS.filter(c => c.status === 'blocked').length} gesperrt. {report.issues.length} offene Referenz- und Aktivierungsprüfungen. Es gibt derzeit keinen produktiv freigegebenen Score.</p>
  <input aria-label="Komponente suchen" className="bg-slate-900 border border-slate-700 rounded-xl p-3 w-full my-3" value={search} onChange={e => setSearch(e.target.value)} placeholder="Analyse-Komponente suchen" />
  <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th>Komponente</th><th>Zustand</th><th>Daten</th></tr></thead><tbody>{components.map(c => <tr key={c.componentId} className="border-t border-slate-800"><td className="py-3"><details><summary className="cursor-pointer">{c.displayName}</summary><dl className="text-xs text-slate-400 my-3 space-y-2"><dt>Inputs</dt><dd>{c.inputContracts.join(', ')}</dd><dt>Output</dt><dd>{c.outputContract}</dd><dt>Features</dt><dd>{c.featureDependencies.join(', ')}</dd><dt>Provider</dt><dd>{c.providerDependencies.join(', ')}</dd><dt>Version</dt><dd>{c.calculationVersion}</dd><dt>Owner</dt><dd>{c.owner}</dd><dt>Letzte Validierung</dt><dd>{c.lastValidatedAt ?? 'ausstehend'}</dd></dl></details></td><td>{c.status}</td><td>{c.provenanceMode}</td></tr>)}</tbody></table></div>
  {!['roadmap', 'console', 'system', 'licenses'].includes(activeTab) && <DataUnavailable title={activeTab} required="belegte Projekt-, Kosten- und Betriebsereignisse" />}
  </>}
 </div>;
};
