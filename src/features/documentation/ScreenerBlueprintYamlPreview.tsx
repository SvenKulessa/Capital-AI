import React, { useMemo, useState } from 'react';
import { Copy, RotateCcw, ShieldCheck, Workflow } from 'lucide-react';
import {
  DEMO_FACTOR_LABELS,
  SCREENER_BUNDLE_DEMO_YAML,
  parseScreenerBundleDemoYaml,
} from './screenerBlueprintDemo';

/**
 * Public YAML/diagram preview. No network, persistent storage, external YAML
 * parser, runtime scorer, entitlement mutation or market-data integration.
 */
export function ScreenerBlueprintYamlPreview() {
  const [yaml, setYaml] = useState(SCREENER_BUNDLE_DEMO_YAML);
  const [copyState, setCopyState] = useState('');
  const result = useMemo(() => parseScreenerBundleDemoYaml(yaml), [yaml]);

  async function copyValidDemo() {
    if (!result.ok) return;
    try {
      await navigator.clipboard.writeText(yaml);
      setCopyState('Gültige Demo-YAML kopiert.');
    } catch {
      setCopyState('Zwischenablage nicht verfügbar; bitte YAML markieren.');
    }
  }

  return (
    <section id="screener-blueprint-bundle" aria-labelledby="screener-bundle-title"
      className="rounded-3xl border border-cyan-400/30 bg-[linear-gradient(125deg,#081a34,#09112b_60%,#160e32)] p-4 text-slate-100 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <img src="/branding/badges/screener-bundle-blueprint.svg" width="72" height="72"
          className="h-[72px] w-[72px] rounded-2xl border border-white/10"
          alt="Screener Blueprint Motiv: Datenknoten und Summensymbol" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-mono uppercase tracking-wider text-cyan-200">
            Kombiniertes Produktkonzept · YAML / Diagramm · Preview v0.1
          </p>
          <h2 id="screener-bundle-title" className="mt-1 text-xl font-black text-white sm:text-2xl">
            Screener Blueprint Bundle
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">
            Datenkonzept, Analyse-Playbooks und gewichtete Chartmuster – ein gemeinsamer Modell- und Architekturentwurf.
            Ein vollständiger grafischer Studio-Editor bleibt ein späteres Upgrade.
          </p>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-medium">
        <span className="rounded-full border border-amber-400/40 px-3 py-1 text-amber-200">
          Preview · nicht kaufbar
        </span>
        <span className="rounded-full border border-cyan-400/40 px-3 py-1 text-cyan-200">
          Nur synthetische Beispieldaten
        </span>
        <span className="rounded-full border border-slate-700 px-3 py-1 text-slate-300">
          Kein Provider- oder Scoring-Zugriff
        </span>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div>
          <label htmlFor="screener-bundle-yaml" className="block text-sm font-bold text-cyan-100">
            YAML-Demo bearbeiten
          </label>
          <p id="screener-bundle-yaml-help" className="mt-1 text-xs leading-relaxed text-slate-300">
            Sechs Demo-Gewichte (Summe 1,00) und Beispielsignale (0–100). Bitte keine API-Keys,
            echten Nutzerdaten oder URLs eingeben. Die Eingabe bleibt lokal in diesem Browser-Tab.
          </p>
          <textarea
            id="screener-bundle-yaml"
            value={yaml}
            maxLength={2048}
            aria-describedby="screener-bundle-yaml-help screener-bundle-yaml-status"
            aria-invalid={!result.ok}
            spellCheck={false}
            autoCapitalize="off"
            onChange={event => { setYaml(event.target.value); setCopyState(''); }}
            className="mt-3 min-h-[365px] w-full resize-y rounded-xl border border-slate-600 bg-[#030a19] p-3 font-mono text-xs leading-5 text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={!result.ok} onClick={() => void copyValidDemo()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2 text-xs font-bold text-[#04101e] hover:bg-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-40">
              <Copy aria-hidden="true" className="h-4 w-4" /> Demo-YAML kopieren
            </button>
            <button type="button" onClick={() => { setYaml(SCREENER_BUNDLE_DEMO_YAML); setCopyState(''); }}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-600 px-4 py-2 text-xs font-bold text-white hover:border-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
              <RotateCcw aria-hidden="true" className="h-4 w-4" /> Zurücksetzen
            </button>
          </div>
          <p id="screener-bundle-yaml-status" role="status" aria-live="polite"
            className={`mt-3 text-xs ${result.ok ? 'text-emerald-200' : 'text-amber-200'}`}>
            {result.ok ? 'DEMO_ONLY · gültige Gewichtung · keine Live-Berechnung' : `Ungültige YAML: ${result.errors.join(' ')}`}
            {copyState ? ` ${copyState}` : ''}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-bold text-white">Diagrammvorschau</h3>
          <p className="mt-1 text-xs text-slate-300">
            Feste Trust Boundaries; bei gültiger YAML werden nur die Demo-Faktorbeiträge aktualisiert.
          </p>
          <figure className="mt-3 rounded-2xl border border-slate-700 bg-[#030b1e] p-3 sm:p-4">
            <div className="grid gap-2 text-xs sm:grid-cols-2">
              <div className="rounded-xl border border-cyan-500/35 bg-cyan-500/10 p-3">
                <strong className="text-cyan-100">Öffentliche Quellen</strong>
                <p className="mt-1 text-slate-300">Rechteprüfung → Normalisierung → Data Quality</p>
              </div>
              <div className="rounded-xl border border-violet-500/35 bg-violet-500/10 p-3">
                <strong className="text-violet-100">Private BYOK-Grenze</strong>
                <p className="mt-1 text-slate-300">User / Tenant / Vault · keine öffentliche Datenfreigabe</p>
              </div>
            </div>
            <div className="mx-auto my-2 h-4 w-px bg-cyan-400/70" aria-hidden="true" />
            <div className="rounded-xl border border-slate-600 bg-slate-900/80 p-3 text-center text-xs">
              <strong>Feature Contracts · Asset-Taxonomie</strong>
              <p className="mt-1 text-slate-300">Analyse-Tools + separat gewichtete Pattern-Familie</p>
            </div>
            <div className="mx-auto my-2 h-4 w-px bg-cyan-400/70" aria-hidden="true" />
            <div className="rounded-xl border border-amber-300/35 bg-amber-300/10 p-3 text-center text-xs">
              <Workflow aria-hidden="true" className="mx-auto mb-1 h-5 w-5 text-amber-200" />
              <strong>Gewichtung → Explainability → Demo</strong>
              <div className="mt-2 text-2xl font-black tabular-nums text-amber-100">
                {result.ok ? `${result.preview.total.toFixed(2).replace('.', ',')} / 100` : '— / 100'}
              </div>
              <p className="mt-1 text-[11px] text-amber-100">Kein Live-Score und kein Anlagesignal</p>
            </div>
            <div className="mx-auto my-2 h-4 w-px bg-cyan-400/70" aria-hidden="true" />
            <div className="rounded-xl border border-rose-400/35 bg-rose-400/5 p-3 text-center text-xs text-rose-100">
              Käuferdateien, Entitlements und Production-Scoring: gesperrt
            </div>
            <figcaption className="mt-3 text-[11px] text-slate-400">
              Schematischer Datenfluss; keine gemessenen Latenzen oder Lizenz-/Compliance-Nachweise.
              Keine API-Aufrufe durch Änderungen im Editor.
            </figcaption>
          </figure>
          <h4 className="mt-4 text-xs font-bold text-slate-200">Gewichtete Faktorbeiträge</h4>
          {result.ok ? (
            <ul className="mt-2 space-y-2" aria-label="Synthetische Scoring-Faktorbeiträge">
              {result.preview.contributions.map(({ factor, signal, weight, contribution }) => (
                <li key={factor} className="rounded-lg border border-slate-800 p-2 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span>{DEMO_FACTOR_LABELS[factor]}</span>
                    <span className="tabular-nums text-cyan-100">
                      {(weight * 100).toFixed(0)}% · {signal.toFixed(0)} → {contribution.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800" aria-hidden="true">
                    <div className="h-full rounded-full bg-cyan-400"
                      style={{ width: `${Math.min(100, contribution)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p role="alert" className="mt-2 text-xs text-amber-200">
              Kein Score: ungültige Demo-Konfiguration.
            </p>
          )}
        </div>
      </div>

      <footer className="mt-5 flex gap-2 rounded-xl border border-slate-700 bg-slate-950/40 p-3 text-xs text-slate-300">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
        <p>Die Vorschau enthält keinen vollständigen Käufer-Blueprint und keinen Checkout.
          Für spätere Bestellungen sind serverseitige Entitlements, Lizenzrechte und private Auslieferung nötig.</p>
      </footer>
    </section>
  );
}
