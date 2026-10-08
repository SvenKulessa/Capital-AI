import React, { useState } from 'react';
import { Activity, Waves, ArrowUpRight } from 'lucide-react';
import {
  ANALYSIS_FAMILIES,
  ASSET_LABELS,
  PRODUCT_CLASSES,
} from './analysisPresentation';
import {
  AnalysisDialog,
  DataStatusBadge,
  EmptyMetric,
  panelClass,
  inputClass,
  buttonClass,
} from './AnalysisUi';
import { useAnalysisQuery } from './useAnalysisQuery';

export function SentimentIntelligencePanel({
  onStartAnalysis,
}: {
  onStartAnalysis?: () => void;
}) {
  const [assetClass, setAssetClass] = useAnalysisQuery('sentimentClass', 'all');
  const [methodology, setMethodology] = useState(false);
  return (
    <section
      id="market-sentiment-section"
      className="space-y-4 px-3 py-6 sm:px-5"
      aria-label="Market Sentiment Index"
    >
      <div
        className={
          panelClass + ' bg-gradient-to-br from-[#0d1633] to-[#070b19]'
        }
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-mono tracking-widest text-cyan-300">
              <Activity size={16} aria-hidden="true" />
              MARKET SENTIMENT INDEX
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              Stimmung verstehen. Quellen prüfen.
            </h2>
          </div>
          <DataStatusBadge mode="unavailable" />
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
          Nachrichten, Social-Signale und Preisreaktionen werden getrennt
          untersucht. Ein Stimmungsindex ist keine Kauf- oder Verkaufsanweisung.
        </p>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_2fr]">
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-5">
            <p className="text-sm text-slate-300">Gesamtmarkt-Sentiment</p>
            <p className="my-4 text-5xl font-mono text-slate-500">—</p>
            <p role="status" className="text-sm text-amber-200">
              Keine validierte Indexberechnung
            </p>
            <dl className="mt-4 space-y-2 text-xs text-slate-400">
              <div className="flex justify-between gap-2">
                <dt>Konfidenz</dt>
                <dd>Nicht verfügbar</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Datenabdeckung</dt>
                <dd>Nicht nachgewiesen</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Letzte Beobachtung</dt>
                <dd>Keine</dd>
              </div>
            </dl>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              ['News-Sentiment', 'Relevanz + Quellenautorität'],
              ['Social-Sentiment', 'Engagement + Bot-Prüfung'],
              ['Preisreaktion', 'Zeitlich zugeordnete Kursdaten'],
              ['Volatilitätsanpassung', 'Historie + Regime'],
              ['Sentiment-Geschwindigkeit', 'Vergleichbare Zeitfenster'],
              ['Streuung / Widerspruch', 'Mehrere unabhängige Quellen'],
            ].map(([label, required]) => (
              <EmptyMetric
                key={label}
                label={label}
                required={required + ' fehlen'}
              />
            ))}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="min-w-48 text-xs text-slate-300">
            Asset-Class-Sentiment
            <select
              className={inputClass + ' mt-1'}
              value={assetClass}
              onChange={(e) => setAssetClass(e.target.value)}
            >
              <option value="all">Gesamtmarkt</option>
              {PRODUCT_CLASSES.map((id) => (
                <option key={id} value={id}>
                  {ASSET_LABELS[id]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={buttonClass}
            onClick={() => setMethodology(true)}
          >
            Methodik & Datenbedarf
          </button>
          {onStartAnalysis ? (
            <button
              type="button"
              className={buttonClass}
              onClick={onStartAnalysis}
            >
              Analyse öffnen
            </button>
          ) : (
            <a
              className={buttonClass}
              href="/marketscreener?tab=components&family=news"
            >
              Analysekomponenten <ArrowUpRight className="inline" size={14} />
            </a>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          {ASSET_LABELS[assetClass as keyof typeof ASSET_LABELS] ??
            'Gesamtmarkt'}
          : Kein Index ohne Quelle, beobachteten Zeitstempel, Konfidenz und
          Abdeckungsnachweis. LIVE / DELAYED wird erst mit passender Provenienz
          angezeigt.
        </p>
      </div>
      <AnalysisDialog
        open={methodology}
        onClose={() => setMethodology(false)}
        title="Sentiment: Fakten, Features und Interpretation"
      >
        <ol className="space-y-4 text-sm text-slate-300">
          <li>
            <strong className="text-cyan-200">1 · Fakten:</strong>{' '}
            Veröffentlichte Texte mit Quelle, Zeitpunkt und belegbarer
            Asset-Zuordnung.
          </li>
          <li>
            <strong className="text-cyan-200">2 · Abgeleitete Features:</strong>{' '}
            Relevanz, Neuheitswert, Textpolarität, zeitliche Veränderung und
            Streuung.
          </li>
          <li>
            <strong className="text-cyan-200">3 · Provider-Signale:</strong>{' '}
            Externe Klassifikationen mit eigenem Datenstatus; keine kanonischen
            Markt-Fakten.
          </li>
          <li>
            <strong className="text-cyan-200">4 · Modellinterpretation:</strong>{' '}
            Aggregation mit versionierten Gewichten, Preisreaktionsprüfung und
            Volatilitätsanpassung.
          </li>
        </ol>
        <p className="text-sm text-amber-200">
          Konfidenz beschreibt Datenvollständigkeit und Konsistenz. Fear & Greed
          oder Textsentiment allein begründen keine Handelsentscheidung.
        </p>
        <a
          href="/marketscreener?tab=components&family=news"
          className={buttonClass + ' inline-block'}
        >
          Nachrichten-Komponenten prüfen
        </a>
      </AnalysisDialog>
    </section>
  );
}

export function WhaleIntelligencePanel({
  onOpenTerminal,
}: {
  onOpenTerminal?: () => void;
}) {
  const [methodology, setMethodology] = useState(false);
  return (
    <section
      id="whale-radar-section"
      className="space-y-4 px-3 py-6 sm:px-5"
      aria-label="Whale Radar"
    >
      <div
        className={panelClass + ' bg-gradient-to-r from-[#0d1633] to-[#070b19]'}
      >
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-mono tracking-widest text-cyan-300">
              <Waves size={16} aria-hidden="true" />
              WHALE RADAR · FLOW INTELLIGENCE
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              Beobachtete Transfers. Einordnbare Signale.
            </h2>
          </div>
          <DataStatusBadge mode="unavailable" />
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
          Transaktionsfakten und Modellinterpretation werden getrennt
          dargestellt. Ein einzelner Transfer oder Stablecoin-Mint belegt keine
          Ursache einer Marktrally.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <EmptyMetric
            label="Beobachtete Transfers"
            required="Keine verifizierten Transaktionen geladen"
          />
          <EmptyMetric
            label="Wallet-Label-Konfidenz"
            required="Keine belegte Wallet-Zuordnung"
          />
          <EmptyMetric
            label="Impact & Fehlalarmrisiko"
            required="Keine validierte Modellinterpretation"
          />
        </div>
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-700">
          <table className="min-w-[56rem] w-full text-left text-xs">
            <caption className="sr-only">
              Whale-Radar-Fakten und Modellinterpretationen
            </caption>
            <thead className="bg-slate-950 text-slate-300">
              <tr>
                {[
                  'Chain / Handelsplatz',
                  'Transaktions- / Provider-Referenz',
                  'Beobachtet',
                  'Wallet-Konfidenz',
                  'Flow-Typ',
                  'Impact-Score',
                  'Manipulation / Fehlalarm',
                  'Fakt / Interpretation',
                ].map((label) => (
                  <th scope="col" className="p-3" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-400">
                  Keine belegten Flows verfügbar. Es werden keine Transaktionen,
                  Gegenparteien oder Dark-Pool-Werte ergänzt.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className={buttonClass}
            onClick={() => setMethodology(true)}
          >
            Belege & Interpretationsgrenzen
          </button>
          {onOpenTerminal && (
            <button
              type="button"
              className={buttonClass}
              onClick={onOpenTerminal}
            >
              Flow-Inspector öffnen
            </button>
          )}
          <a
            href="/marketscreener?tab=components&family=positioning"
            className={buttonClass}
          >
            Positionierungs-Komponenten
          </a>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          Modellsignale sind indikativ. Keine Anlageberatung. Fehlende oder
          simulierte Flows dürfen keine Alerts oder Rankings auslösen.
        </p>
      </div>
      <AnalysisDialog
        open={methodology}
        onClose={() => setMethodology(false)}
        title="Whale Radar: Provenienz und Interpretation"
      >
        <dl className="space-y-4 text-sm text-slate-300">
          <div>
            <dt className="font-bold text-cyan-200">
              Beobachteter Transfer · Fakt
            </dt>
            <dd className="mt-1">
              Chain, Transaktionsreferenz, Asset, Menge, Einheit und
              beobachteter Zeitpunkt. Ein Wallet-Label benötigt einen separaten
              Quellen- und Konfidenznachweis.
            </dd>
          </div>
          <div>
            <dt className="font-bold text-cyan-200">Modellinterpretation</dt>
            <dd className="mt-1">
              Akkumulation, Distribution und potenzieller Impact sind
              Schlussfolgerungen mit Reason-Codes, Risiko-Flags und
              Modellversion.
            </dd>
          </div>
          <div>
            <dt className="font-bold text-cyan-200">Dark-Pool-Metrik</dt>
            <dd className="mt-1">
              Nur mit nachgewiesenem Provider, Marktumfang, Verzögerung und
              Berechnungsmethode. Hier liegen keine entsprechenden Datensätze
              vor.
            </dd>
          </div>
        </dl>
        <p className="text-sm text-amber-200">
          Demo-Transaktionen müssen dauerhaft DEMO anzeigen. Es werden in dieser
          Ansicht keine Beispiel-Transfers als Fakten erzeugt.
        </p>
      </AnalysisDialog>
    </section>
  );
}
