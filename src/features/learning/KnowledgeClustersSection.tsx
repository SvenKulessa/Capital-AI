import React from 'react';
import { KNOWLEDGE_CLUSTERS } from '../../data/knowledgeClusters';

/** 
 * Draft Knowledge Clusters from Audit Content Backlog.
 * Educational only – DRAFT_ONLY. Not for production claims.
 */
export function KnowledgeClustersSection() {
  return (
    <section aria-labelledby="knowledge-clusters" className="space-y-6">
      <div className="p-4 rounded-xl border border-amber-400/30 bg-amber-400/5">
        <h2 id="knowledge-clusters" className="text-xl font-bold text-amber-200">
          Knowledge Clusters (Draft)
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          Redaktionelle Entwürfe aus dem Social Content Backlog v5.0. 
          Status: DRAFT_ONLY. Keine automatische Veröffentlichung, keine Anlageberatung.
          Quellenprüfung, Lizenzen und technische Wahrhaftigkeit erforderlich vor Abnahme.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {KNOWLEDGE_CLUSTERS.map((cluster) => (
          <article 
            key={cluster.id} 
            className="rounded-xl border border-slate-700 bg-[#090e21] p-5"
          >
            <h3 className="text-lg font-semibold text-white">{cluster.pillar}</h3>
            <p className="mt-2 text-sm text-slate-300">{cluster.summary}</p>
            <p className="mt-2 text-xs text-slate-500">
              Supporting: {cluster.supporting.join(' / ')} · Intent: {cluster.searchIntent}
            </p>
            <p className="mt-3 text-xs italic text-amber-300/80">{cluster.disclaimer}</p>
            <p className="mt-2 text-xs font-mono text-slate-500">
              Vorschlag Pfad: {cluster.internalPath}
            </p>
          </article>
        ))}
      </div>
      <aside className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-slate-300">
        Vollständige 30 SEO-Cluster und 100 Content-Ideen siehe CAPITAL-AI-SOCIAL-CONTENT-BACKLOG-v5.md.
        Nächster Schritt: Quellenprüfung → Copyright → technische Wahrhaftigkeit → redaktionelle Abnahme.
      </aside>
    </section>
  );
}
