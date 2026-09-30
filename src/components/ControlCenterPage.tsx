import React from 'react';
import { CANONICAL_50_COMPONENTS } from '../contracts/analysisComponentRegistry';
import { validateAnalysisComponentRegistry } from '../contracts/analysisComponentRegistryValidator';
import { ProviderStatusDashboard } from './ProviderStatusDashboard';
import { DataUnavailable } from './DataUnavailable';
import { useHubTab } from '../hooks/useHubTab';
export type ControlCenterTab = 'roadmap' | 'console' | 'cockpit' | 'team' | 'cost_center' | 'system';
const CONTROL_TABS: readonly ControlCenterTab[] = ['roadmap', 'console', 'cockpit', 'team', 'cost_center', 'system'];
interface ControlCenterPageProps { onBackToHome?: () => void; onNavigateLogin?: () => void; onNavigateTab?: (path: string) => void; initialTab?: ControlCenterTab; }
export const ControlCenterPage: React.FC<ControlCenterPageProps> = ({ onBackToHome, initialTab = 'roadmap' }) => {
 const [activeTab, setActiveTab] = useHubTab(CONTROL_TABS, initialTab);
 const [search, setSearch] = React.useState('');
 const report = validateAnalysisComponentRegistry();
 const components = CANONICAL_50_COMPONENTS.filter(c => `${c.componentId} ${c.displayName}`.toLowerCase().includes(search.toLowerCase()));
 return <div className="w-full text-slate-100 min-h-screen py-4 px-3 sm:px-6">
  <h1 className="text-2xl font-bold">Control Center</h1>
  <nav className="flex flex-wrap gap-2 my-4" aria-label="Control Center Tabs">{CONTROL_TABS.map(tab => <button key={tab} onClick={() => setActiveTab(tab)} aria-pressed={activeTab === tab} className={`px-3 py-2 rounded-xl ${activeTab === tab ? 'bg-amber-400 text-black' : 'bg-slate-800'}`}>{tab}</button>)}</nav>
  <ProviderStatusDashboard onBackToHome={onBackToHome} />
  <h2 className="text-xl font-bold mt-6">50 Analyse-Komponenten</h2>
  <p className="text-sm text-slate-400 my-3">{CANONICAL_50_COMPONENTS.filter(c => c.status === 'planned').length} geplant · {CANONICAL_50_COMPONENTS.filter(c => c.status === 'blocked').length} gesperrt. {report.issues.length} offene Referenz- und Aktivierungsprüfungen. Es gibt derzeit keinen produktiv freigegebenen Score.</p>
  <input aria-label="Komponente suchen" className="bg-slate-900 border border-slate-700 rounded-xl p-3 w-full my-3" value={search} onChange={e => setSearch(e.target.value)} placeholder="Analyse-Komponente suchen" />
  <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th>Komponente</th><th>Zustand</th><th>Daten</th></tr></thead><tbody>{components.map(c => <tr key={c.componentId} className="border-t border-slate-800"><td className="py-3"><details><summary className="cursor-pointer">{c.displayName}</summary><dl className="text-xs text-slate-400 my-3 space-y-2"><dt>Inputs</dt><dd>{c.inputContracts.join(', ')}</dd><dt>Output</dt><dd>{c.outputContract}</dd><dt>Features</dt><dd>{c.featureDependencies.join(', ')}</dd><dt>Provider</dt><dd>{c.providerDependencies.join(', ')}</dd><dt>Version</dt><dd>{c.calculationVersion}</dd><dt>Owner</dt><dd>{c.owner}</dd><dt>Letzte Validierung</dt><dd>{c.lastValidatedAt ?? 'ausstehend'}</dd></dl></details></td><td>{c.status}</td><td>{c.provenanceMode}</td></tr>)}</tbody></table></div>
  {!['console', 'system'].includes(activeTab) && <DataUnavailable title={activeTab} required="belegte Projekt-, Kosten- und Betriebsereignisse" />}
 </div>;
};
