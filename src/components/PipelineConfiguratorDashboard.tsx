import React from 'react';
import { CANONICAL_50_COMPONENTS } from '../contracts/analysisComponentRegistry';
import { ProviderRegistryService } from '../config/providers/providerRegistry';
import { SHADOW_SCORE_CONFIG_V1 } from '../config/shadowScoreConfig';
import {
  PIPELINE_CONFIGURATOR_VIEWS,
  PIPELINE_PRODUCTION_APPROVAL_GATES,
  type PipelineConfiguratorView,
} from '../services/pipelineConfigurator';

const EMPTY_VIEW_COPY: Partial<Record<PipelineConfiguratorView, string>> = {
  'Data Freshness Monitor': 'Keine produktiv zugelassenen Provider-Telemetriedaten verfügbar.',
  'Data Quality Monitor': 'Keine produktiv zugelassenen Quality-Messreihen verfügbar.',
  'Run History': 'Keine produktive Run-History für diese Shadow-Konfiguration verfügbar.',
  'Replay Inspector': 'Replay benötigt eine vorhandene content-addressed EVD-ID.',
  'Configuration Diff': 'Konfigurations-Diffs werden erst aus persistierten Revisionen angezeigt.',
  'Shadow vs Active Benchmark': 'Kein Active-vs-Shadow Benchmark ohne produktiv zugelassenen Active-Pfad.',
};

function StatusBadge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] font-semibold text-slate-300">{children}</span>;
}

export const PipelineConfiguratorDashboard: React.FC = () => {
  const [view, setView] = React.useState<PipelineConfiguratorView>('Pipeline Overview');
  const providers = ProviderRegistryService.getSelectableProviders();
  const admittedProviders = ProviderRegistryService.getProductionAdmittedProviders();
  const blockedComponents = CANONICAL_50_COMPONENTS.filter(component => component.status === 'blocked');
  const shadowComponents = CANONICAL_50_COMPONENTS.filter(component => component.status === 'shadow');
  const activeComponents = CANONICAL_50_COMPONENTS.filter(component => component.status === 'active');

  return <section aria-labelledby="pipeline-configurator-heading" className="rounded-3xl border border-slate-800 bg-[#071025] p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="pipeline-configurator-heading" className="text-xl font-bold text-white">Pipeline Configurator</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Read-only Control Plane für PART 2. Registry-Metadaten sind keine Provider-, Lizenz- oder Runtime-Evidence.
          Shadow-Ausgaben bleiben nicht publizierbar.
        </p>
      </div>
      <div className="flex gap-2">
        <StatusBadge>SHADOW</StatusBadge>
        <StatusBadge>NON-AUTHORIZING</StatusBadge>
      </div>
    </div>

    <nav className="mt-5 flex gap-2 overflow-x-auto pb-2" aria-label="Pipeline Configurator Views" role="tablist">
      {PIPELINE_CONFIGURATOR_VIEWS.map(item => <button
        key={item}
        type="button"
        role="tab"
        aria-selected={view === item}
        onClick={() => setView(item)}
        className={`min-h-11 shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold ${view === item
          ? 'border-amber-300 bg-amber-400 text-black'
          : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'}`}
      >{item}</button>)}
    </nav>

    {view === 'Pipeline Overview' && <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><div className="text-xs text-slate-500">Stages</div><div className="mt-1 text-2xl font-black text-white">{SHADOW_SCORE_CONFIG_V1.stages.length}</div><div className="text-xs text-slate-400">kanonische Reihenfolge</div></article>
      <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><div className="text-xs text-slate-500">Provider admitted</div><div className="mt-1 text-2xl font-black text-white">{admittedProviders.length}</div><div className="text-xs text-slate-400">Production-Routing bleibt fail-closed</div></article>
      <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><div className="text-xs text-slate-500">Komponenten</div><div className="mt-1 text-2xl font-black text-white">{CANONICAL_50_COMPONENTS.length}</div><div className="text-xs text-slate-400">{activeComponents.length} active · {shadowComponents.length} shadow · {blockedComponents.length} blocked</div></article>
      <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><div className="text-xs text-slate-500">Production Gates</div><div className="mt-1 text-2xl font-black text-white">{PIPELINE_PRODUCTION_APPROVAL_GATES.length}</div><div className="text-xs text-slate-400">alle mit Evidence erforderlich</div></article>
      <ol className="md:col-span-2 xl:col-span-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{SHADOW_SCORE_CONFIG_V1.stages.map((stage, index) => <li key={stage} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs"><span className="font-mono text-amber-300">{String(index + 1).padStart(2, '0')}</span><span className="ml-2 text-slate-300">{stage}</span></li>)}</ol>
    </div>}

    {view === 'Provider Registry' && <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead><tr className="text-slate-500"><th className="py-2">Provider</th><th>ID</th><th>Runtime Admission</th><th>Protokolle</th></tr></thead>
        <tbody>{providers.map(provider => <tr key={provider.id} className="border-t border-slate-800">
          <td className="py-3 text-white">{provider.name}</td>
          <td className="font-mono text-xs text-slate-400">{provider.id}</td>
          <td><StatusBadge>{provider.productionAdmission ?? 'BLOCKED'}</StatusBadge></td>
          <td className="text-slate-400">{provider.capabilities.protocols.join(', ')}</td>
        </tr>)}</tbody>
      </table>
      <p className="mt-3 text-xs text-amber-200">Hinweis: angezeigte Registry-Metadaten sind Konfigurationskandidaten. Nur explizit zugelassene Provider dürfen produktiv geroutet werden.</p>
    </div>}

    {view === 'Component Registry' && <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead><tr className="text-slate-500"><th className="py-2">Komponente</th><th>Domain</th><th>Status</th><th>Version</th></tr></thead>
        <tbody>{CANONICAL_50_COMPONENTS.map(component => <tr key={component.componentId} className="border-t border-slate-800">
          <td className="py-3 text-white">{component.displayName}</td><td className="text-slate-400">{component.domain}</td>
          <td><StatusBadge>{component.status}</StatusBadge></td><td className="font-mono text-xs text-slate-400">{component.calculationVersion}</td>
        </tr>)}</tbody>
      </table>
    </div>}

    {view === 'Feature Dependency Graph' && <div className="mt-4 grid gap-3 md:grid-cols-2">
      {CANONICAL_50_COMPONENTS.map(component => <article key={component.componentId} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
        <div className="text-sm font-semibold text-white">{component.displayName}</div>
        <div className="mt-2 text-xs text-slate-500">Features</div>
        <div className="mt-1 text-xs text-slate-300">{component.featureDependencies.length ? component.featureDependencies.join(' → ') : 'keine registriert'}</div>
      </article>)}
    </div>}

    {EMPTY_VIEW_COPY[view] && <div className="mt-4 rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-5">
      <div className="text-sm font-semibold text-slate-200">{view}</div>
      <p className="mt-2 text-sm text-slate-400">{EMPTY_VIEW_COPY[view]}</p>
      <p className="mt-2 text-xs text-slate-500">Es werden keine Live-, Quality-, Latency- oder Replay-Werte erfunden.</p>
    </div>}
  </section>;
};
