import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  FileText,
  KeyRound,
  Layers3,
  Presentation,
  Search,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import { STUDIO_BLUEPRINTS } from '../../data/studioData';
import { BLUEPRINT_EVIDENCE_CONTRACTS } from '../../data/blueprintEvidenceContracts';

import { BLUEPRINT_DETAILS, VERIFIED_COMMERCE_STATE } from './blueprintDocumentationData';
import { ByokArchitectureDiagram, SocialMediaArchitectureDiagram } from './ArchitectureGraphics';
import { ScreenerBlueprintYamlPreview } from './ScreenerBlueprintYamlPreview';

type BlueprintDocumentationPageProps = {
  onNavigate?: (path: string) => void;
};

function SectionList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-[#081126]/80 p-4">
      <h3 className="mb-3 text-sm font-bold text-white">{title}</h3>
      <ul className="space-y-2 text-sm text-slate-300">
        {items.map((item) => (
          <li key={item} className="flex gap-2 leading-relaxed">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export const BlueprintDocumentationPage: React.FC<BlueprintDocumentationPageProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(STUDIO_BLUEPRINTS[0]?.id ?? 'TIER_1_4_LIVE');
  const [privateEvidenceState, setPrivateEvidenceState] = useState<'idle' | 'checking' | 'verified-context' | 'unavailable'>('idle');

  const filteredBlueprints = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return STUDIO_BLUEPRINTS;
    return STUDIO_BLUEPRINTS.filter((blueprint) =>
      [blueprint.name, blueprint.id, blueprint.category, blueprint.primaryUseCase, ...blueprint.dataConceptsUsed]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [query]);

  const selected = STUDIO_BLUEPRINTS.find((blueprint) => blueprint.id === selectedId) ?? STUDIO_BLUEPRINTS[0];
  const detail = selected ? BLUEPRINT_DETAILS[selected.id] : undefined;
  const evidenceContract = selected ? BLUEPRINT_EVIDENCE_CONTRACTS[selected.id] : undefined;

  const verifyPrivateEvidenceContext = async () => {
    setPrivateEvidenceState('checking');
    try {
      const response = await fetch('/api/profile/provider-connections', {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        setPrivateEvidenceState('unavailable');
        return;
      }
      const payload = await response.json();
      const hasVerifiedContext = Array.isArray(payload?.connections)
        && payload.connections.some((connection: { status?: string }) => connection?.status === 'VERIFIED');
      setPrivateEvidenceState(hasVerifiedContext ? 'verified-context' : 'unavailable');
    } catch {
      setPrivateEvidenceState('unavailable');
    }
  };

  return (
    <main className="min-h-screen bg-[#030712] px-3 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1480px] space-y-5">
        <header className="rounded-3xl border border-amber-400/20 bg-[radial-gradient(circle_at_top_left,rgba(245,176,20,0.12),transparent_38%),#061024] p-5 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
                <button type="button" onClick={() => onNavigate?.('/marketscreener')} className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-3 py-1.5 hover:border-amber-400/60 hover:text-white">
                  <ArrowLeft className="h-3.5 w-3.5" /> Market Screener Hub
                </button>
                <span>/</span>
                <span className="font-bold text-amber-300">Dokumentation</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10">
                  <BookOpen className="h-6 w-6 text-amber-300" />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Dokumentations-Hub</h1>
                  <p className="mt-1 text-sm text-slate-300">7 kanonische Datenkonzept-Blueprints · Architektur-Grafiken · BYOK-Konzept · Presentation</p>
                </div>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:w-[430px]">
              <a href="/downloads/CAPITAL-AI_BYOK_2026-10-05.md" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 text-sm font-bold text-cyan-200 hover:bg-cyan-400/15">
                <KeyRound className="h-4 w-4" /> BYOK Dokumentation
              </a>
              <a href="/downloads/capital-ai-byok-presentation.html" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-purple-400/30 bg-purple-400/10 px-4 text-sm font-bold text-purple-200 hover:bg-purple-400/15">
                <Presentation className="h-4 w-4" /> BYOK Presentation
              </a>
            </div>
          </div>
        </header>

        <ScreenerBlueprintYamlPreview />

        <section className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4">
          <div className="flex gap-3">
            <ShoppingBag className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <h2 className="text-sm font-bold text-amber-200">Verifizierter Kaufstatus · {VERIFIED_COMMERCE_STATE.checkedAt}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">{VERIFIED_COMMERCE_STATE.note}</p>
              <p className="mt-2 text-xs font-mono text-slate-500">Standalone Blueprint SKUs: {VERIFIED_COMMERCE_STATE.standaloneProducts} · Quelle: Stripe Live Read + src/data/pricingCatalog.ts</p>
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
            <label className="relative block">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Blueprint oder Datenkonzept suchen" className="h-11 w-full rounded-xl border border-slate-800 bg-[#071127] pl-10 pr-3 text-sm text-white outline-none focus:border-amber-400/50" />
            </label>
            <div className="space-y-2">
              {filteredBlueprints.map((blueprint) => (
                <button key={blueprint.id} type="button" onClick={() => setSelectedId(blueprint.id)} className={`w-full rounded-2xl border p-3 text-left transition ${selected?.id === blueprint.id ? 'border-amber-400/50 bg-amber-400/10' : 'border-slate-800 bg-[#071127]/80 hover:border-slate-700'}`}>
                  <div className="text-[10px] font-mono text-amber-300">{blueprint.badge}</div>
                  <div className="mt-1 text-sm font-bold text-white">{blueprint.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{blueprint.category}</div>
                </button>
              ))}
            </div>
          </aside>

          {selected && detail ? (
            <article className="space-y-4">
              <section className="overflow-hidden rounded-3xl border border-slate-800 bg-[#061024]">
                <SocialMediaArchitectureDiagram title={selected.name} nodes={selected.topologyNodes} />
                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                    <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-amber-200">{selected.id}</span>
                    <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-cyan-200">{selected.category}</span>
                    <span className="rounded-full border border-slate-700 px-2.5 py-1 text-slate-400">Designziel {selected.targetLatency}</span>
                    <span className="rounded-full border border-slate-700 px-2.5 py-1 text-slate-400">SLA-Ziel {selected.sla}</span>
                  </div>
                  <h2 className="mt-4 text-xl font-black text-white sm:text-2xl">{selected.name}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{selected.description}</p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">{detail.architecture}</p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-800 bg-black/20 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-500">Use Case</div><div className="mt-1 text-sm text-white">{selected.primaryUseCase}</div></div>
                    <div className="rounded-xl border border-slate-800 bg-black/20 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-500">Plan-Kosten</div><div className="mt-1 text-sm text-white">{selected.monthlyCostEur.toFixed(2)} € / Monat</div><div className="mt-1 text-[11px] text-slate-500">kein gemessener Ist-Wert</div></div>
                    <div className="rounded-xl border border-slate-800 bg-black/20 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-500">Kaufstatus</div><div className="mt-1 text-sm text-amber-200">kein separates Stripe-SKU verifiziert</div></div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {selected.dataConceptsUsed.map((concept) => <span key={concept} className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-2 py-1 text-xs text-cyan-200">{concept}</span>)}
                  </div>

                  <div className="mt-5 rounded-2xl border border-cyan-400/25 bg-cyan-400/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-cyan-200">Blueprint Evidence Gate</div>
                        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
                          Vollständiger Blueprint-Code und Dateien bleiben gesperrt, solange kein Blueprint-spezifisches
                          Evidence-Set, kein separates Entitlement und kein freigegebener Commerce-Pfad vorliegen.
                          Ein verifizierter privater Key-Vault-Kontext ist nur ein Eingangsbeleg und keine Production-Freigabe.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void verifyPrivateEvidenceContext()}
                        disabled={privateEvidenceState === 'checking'}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 text-sm font-bold text-cyan-100 hover:bg-cyan-400/15 disabled:cursor-wait disabled:opacity-60"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {privateEvidenceState === 'checking' ? 'Privaten Kontext prüfen…' : 'Private Evidence prüfen'}
                      </button>
                    </div>
                    {evidenceContract && (
                      <div className="mt-3 rounded-xl border border-slate-800 bg-black/25 p-3">
                        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-300">
                          {evidenceContract.schemaVersion} · {evidenceContract.requirements.length} Pflichtnachweise
                        </div>
                        <ul className="mt-2 grid gap-1 text-[11px] text-slate-400 sm:grid-cols-2">
                          {evidenceContract.requirements.map(requirement => (
                            <li key={requirement.id}>• {requirement.label}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-3 text-xs font-mono">
                      {privateEvidenceState === 'idle' && <span className="text-slate-500">Status: OFFEN</span>}
                      {privateEvidenceState === 'verified-context' && (
                        <span className="text-emerald-300">
                          PRIVATE_CONTEXT_VERIFIED · Blueprint-Download bleibt bis Blueprint-Evidence + Entitlement gesperrt.
                        </span>
                      )}
                      {privateEvidenceState === 'unavailable' && (
                        <span className="text-amber-300">
                          PRIVATE_CONTEXT_UNAVAILABLE · Key Vault oder verifizierte Provider-Verbindung fehlt.
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled
                      title="Blueprint-Datei erst nach Evidence-, Entitlement- und Commerce-Freigabe"
                      className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-xl bg-slate-800 px-4 text-sm font-bold text-slate-500"
                    >
                      <FileText className="h-4 w-4" /> Blueprint-Datei gesperrt
                    </button>
                    <a href="/studio?tab=blueprints" onClick={(event) => { event.preventDefault(); onNavigate?.('/studio?tab=blueprints'); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 text-sm font-bold text-cyan-200 hover:bg-cyan-400/15"><Layers3 className="h-4 w-4" /> Blueprint im Studio</a>
                  </div>
                </div>
              </section>

              <div className="grid gap-4 md:grid-cols-2">
                <SectionList title="Voraussetzungen" items={detail.prerequisites} />
                <SectionList title="Trust- & Datenrechte-Grenzen" items={detail.trustBoundaries} />
                <SectionList title="Betrieb & Observability" items={detail.operations} />
                <SectionList title="Fehlermodi" items={detail.failureModes} />
              </div>
              <SectionList title="Technische Abnahmekriterien" items={detail.acceptanceCriteria} />

              <section className="rounded-2xl border border-slate-800 bg-[#081126]/80 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white"><FileText className="h-4 w-4 text-amber-300" /> Topologie</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {selected.topologyNodes.map((node) => <div key={node.id} className="rounded-xl border border-slate-800 bg-black/20 p-3"><div className="text-[10px] font-mono text-cyan-300">{node.tier} · {node.type}</div><div className="mt-1 text-xs font-semibold text-slate-200">{node.name}</div></div>)}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-slate-500">Latenz-, SLA-, Kosten- und Compliance-Angaben aus dem Studio-Katalog sind Design-/Planwerte. Sie sind weder Runtime-Messung noch Zertifizierung oder regulatorische Freigabe.</p>
              </section>
            </article>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-[#071127] p-8 text-center text-slate-400">Kein Blueprint gefunden.</div>
          )}
        </div>

        <section className="rounded-3xl border border-cyan-400/20 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.1),transparent_35%),#061024] p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-300"><KeyRound className="h-4 w-4" /> BYOK · Bring Your Own Key</div>
              <h2 className="mt-2 text-xl font-black text-white">Private Provider-Credentials bleiben außerhalb des öffentlichen Market-Data-Pfads.</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">Der aktuelle Kraken-Prototyp verwendet authentifizierte same-origin Requests, serverseitige Signaturerzeugung und Supabase Vault. Er erlaubt private Kontoabfragen, erweitert aber weder Public-Display-, Cache-, JetStream-, Scoring- noch Redistribution-Rechte.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href="/downloads/CAPITAL-AI_BYOK_2026-10-05.md" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 text-sm font-bold text-cyan-200"><ShieldCheck className="h-4 w-4" /> Dokumentation öffnen</a>
                <a href="/downloads/capital-ai-byok-presentation.html" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-purple-400/30 bg-purple-400/10 px-4 text-sm font-bold text-purple-200"><ExternalLink className="h-4 w-4" /> Presentation öffnen</a>
              </div>
            </div>
            <ByokArchitectureDiagram />
          </div>
        </section>
      </div>
    </main>
  );
};
