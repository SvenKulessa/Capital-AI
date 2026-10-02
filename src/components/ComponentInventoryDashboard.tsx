import React from 'react';
import { EXTERNAL_COMPONENT_INVENTORY, CADS_PROFILE_V2, COMPONENT_LIFECYCLE } from '../data/externalComponentInventory';

const domainClasses: Record<string, string> = {
  PRODUCT: 'border-pink-500/30 bg-pink-950/20',
  MARKET: 'border-teal-500/30 bg-teal-950/20',
  PLATFORM: 'border-violet-500/30 bg-violet-950/20',
  TRUST: 'border-slate-400/30 bg-slate-900/60',
  GROWTH: 'border-amber-500/30 bg-amber-950/20',
};

export const ComponentInventoryDashboard: React.FC = () => {
  const [domain, setDomain] = React.useState('ALL');
  const items = EXTERNAL_COMPONENT_INVENTORY.filter(item => domain === 'ALL' || item.domain === domain);

  return <section aria-labelledby="component-inventory-title" className="space-y-5">
    <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
      <h2 id="component-inventory-title" className="text-xl font-bold">External Component & Dependency Dashboard</h2>
      <p className="mt-2 text-sm text-slate-400">
        Public-safe Documentary projection. Secret values are prohibited. CADS values are provisional until a reproducible workload benchmark promotes them.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {['ALL','PRODUCT','MARKET','PLATFORM','TRUST','GROWTH'].map(value =>
          <button key={value} type="button" onClick={() => setDomain(value)}
            className={`rounded-full border px-3 py-1.5 text-xs ${domain === value ? 'border-amber-300 bg-amber-400 text-black' : 'border-slate-700 bg-slate-900 text-slate-300'}`}>
            {value}
          </button>)}
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="CADS profile">
      {Object.entries(CADS_PROFILE_V2.normalizedWeights).map(([key, value]) =>
        <div key={key} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <div className="flex justify-between text-xs"><span className="capitalize text-slate-300">{key}</span><span className="font-mono text-amber-300">{value}%</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded bg-slate-800"><div className="h-full bg-amber-300" style={{ width: `${value}%` }} /></div>
        </div>)}
    </div>

    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <h3 className="text-sm font-bold">Lifecycle</h3>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {COMPONENT_LIFECYCLE.map((stage, index) => <React.Fragment key={stage}>
          <span className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">{stage}</span>
          {index < COMPONENT_LIFECYCLE.length - 1 && <span className="text-slate-500">→</span>}
        </React.Fragment>)}
      </div>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      {items.map(item => <article key={item.id} className={`rounded-2xl border p-4 ${domainClasses[item.domain] ?? 'border-slate-700'}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">{item.domain} · {item.kind}</p>
            <h3 className="text-base font-bold">{item.name}</h3>
            <p className="mt-1 text-xs text-slate-400">{item.functionSummary}</p>
          </div>
          <div className="min-w-24 text-right">
            <div className="text-2xl font-black font-mono text-amber-300">{item.cadsScore.toFixed(1)}</div>
            <div className="text-[10px] text-slate-500">CADS / 100</div>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded bg-slate-800" aria-label={`CADS ${item.cadsScore} von 100`}>
          <div className="h-full bg-emerald-400" style={{ width: `${item.cadsScore}%` }} />
        </div>
        <dl className="mt-4 grid grid-cols-[9rem_1fr] gap-x-3 gap-y-2 text-xs">
          <dt className="text-slate-500">Lifecycle</dt><dd>{item.lifecycle} · {item.scoreState}</dd>
          <dt className="text-slate-500">Installiert</dt><dd>{item.installedAt ?? 'nicht belegt'}</dd>
          <dt className="text-slate-500">Aktiv</dt><dd>{item.activeVersion ?? 'nicht aktiv'}</dd>
          <dt className="text-slate-500">Pipeline</dt><dd>{item.pipelineVersion ?? 'keine'}</dd>
          <dt className="text-slate-500">Web-App</dt><dd>{item.webAppBinding}</dd>
          <dt className="text-slate-500">Lizenz</dt><dd>{item.license}</dd>
          <dt className="text-slate-500">Abhängigkeiten</dt><dd>{item.dependencies.length ? item.dependencies.join(' → ') : 'keine'}</dd>
        </dl>
        <details className="mt-4 rounded-xl border border-slate-800 bg-black/20 p-3">
          <summary className="cursor-pointer text-xs font-semibold">3 OSS-Kandidaten</summary>
          <ul className="mt-2 space-y-1 text-xs text-slate-400">
            {item.alternatives.map(candidate => <li key={candidate.name}>{candidate.name} · {candidate.role} · {candidate.license}</li>)}
          </ul>
        </details>
      </article>)}
    </div>
    <p className="text-[11px] text-slate-500">Die Visualisierung ist first-party UI-Code dieses Repositories; es wird kein fremdes Grafik-Asset eingebunden.</p>
  </section>;
};
