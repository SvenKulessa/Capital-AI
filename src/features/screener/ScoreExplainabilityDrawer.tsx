import React, { useEffect, useState } from 'react';
import {
  FinalRankResult,
  FeatureValue,
  FeatureValueSchema,
} from '../../contracts/canonicalContracts';
import {
  AnalysisDialog,
  DataStatusBadge,
  panelClass,
} from '../analysis/AnalysisUi';
import { safeScorePresentation } from '../analysis/scorePresentation';
export interface ScoreExplainabilityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  result: FinalRankResult | null;
  features?: readonly FeatureValue[];
}
const FAMILIES = [
  ['momentumScore', 'weightMomentum', 'Momentum'],
  ['technicalScore', 'weightTechnical', 'Technik'],
  ['fundamentalScore', 'weightFundamental', 'Fundamental'],
  ['sentimentScore', 'weightSentiment', 'Sentiment'],
  ['eventScore', 'weightEvent', 'Ereignisse'],
  ['positioningScore', 'weightPositioning', 'Positionierung'],
] as const;
export const ScoreExplainabilityDrawer: React.FC<
  ScoreExplainabilityDrawerProps
> = ({ isOpen, onClose, result: inputResult, features = [] }) => {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);
  const presentation = inputResult
    ? safeScorePresentation(inputResult, now)
    : null;
  const result = presentation?.result;
  const validFeatures = features.filter(
    (f) =>
      FeatureValueSchema.safeParse(f).success && f.assetId === result?.assetId,
  );
  const available = presentation?.score !== null;
  return (
    <AnalysisDialog
      open={isOpen && !!inputResult}
      onClose={onClose}
      title={`${result?.symbol ?? 'Asset'} · Score-Herleitung`}
    >
      {!result && inputResult && (
        <p role="alert">
          Ergebnisvertrag ungültig. Keine Score-Herleitung verfügbar.
        </p>
      )}
      {result && presentation && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <DataStatusBadge mode={presentation.data} />
            <span className="text-sm text-rose-200">
              {presentation.ranked
                ? `Rang ${result.rank}`
                : 'Kein freigegebener Rang'}
            </span>
            <span className="text-xs text-slate-400">
              Modell {result.modelVersion}
            </span>
          </div>
          <p className="text-sm text-amber-100">
            {presentation.reason ??
              'Freigegebener Ergebnisvertrag; Quellenbelege separat prüfen.'}
          </p>
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            {[
              [
                'Finaler Score (0–100)',
                presentation.score ?? 'Nicht verfügbar',
              ],
              [
                'Konfidenz',
                available
                  ? `${Math.round(result.confidence * 100)}%`
                  : 'Nicht verfügbar',
              ],
              [
                'Eligibility',
                result.eligibility && available ? 'Bestanden' : 'Gesperrt',
              ],
              [
                'Risiko-Abzug',
                available ? `${result.riskPenalty} Punkte` : 'Nicht verfügbar',
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-slate-400">{label}</dt>
                <dd className="mt-2 font-mono text-slate-100">{value}</dd>
              </div>
            ))}
          </dl>
          <section className={panelClass}>
            <h3 className="font-semibold text-white">
              Versionierte Formel · Modellinterpretation
            </h3>
            <p className="mt-3 break-words rounded-lg bg-black/40 p-3 font-mono text-xs leading-relaxed text-cyan-200">
              finalRank = eligibilityMultiplier × confidence × Σ(weight ×
              subScore) − riskPenalty
            </p>
            <p className="mt-3 text-xs text-slate-400">
              Das Eligibility-Gate blockiert die Veröffentlichung vollständig.
              Ein gesperrter Rang ist kein Score von 0. Scores werden auf 0–100
              begrenzt.
            </p>
          </section>
          <section className={panelClass}>
            <h3 className="font-semibold text-white">
              Beitrags-Wasserfall & Gewichte
            </h3>
            <p className="mt-2 text-xs text-slate-400">
              Positive gewichtete Beiträge, anschließend Risiko-Abzug. Ohne
              freigegebenen Ergebnisvertrag werden keine Beiträge ergänzt.
            </p>
            <div className="mt-4 space-y-3">
              {FAMILIES.map(([scoreKey, weightKey, label]) => {
                const score = result.subScores[scoreKey];
                const weight = result.weightsApplied[weightKey];
                const contribution =
                  available && score !== null
                    ? score * weight * result.confidence
                    : null;
                return (
                  <div key={scoreKey}>
                    <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-300">
                      <span>
                        {label} · Gewicht {Math.round(weight * 100)}%
                      </span>
                      <span>
                        Subscore: {score ?? '—'} · Beitrag:{' '}
                        {contribution === null
                          ? 'nicht verfügbar'
                          : `+${contribution.toFixed(2)} Pkt.`}
                      </span>
                    </div>
                    <div
                      className="mt-2 h-2 overflow-hidden rounded bg-slate-800"
                      aria-hidden="true"
                    >
                      <div
                        className="h-full bg-cyan-400"
                        style={{ width: `${contribution ?? 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="border-t border-slate-700 pt-3 text-xs text-rose-200">
                Risiko-Abzug:{' '}
                {available
                  ? `−${result.riskPenalty.toFixed(2)} Punkte`
                  : 'nicht verfügbar'}
              </div>
            </div>
          </section>
          <section className={panelClass}>
            <h3 className="font-semibold text-white">
              Fakten · Quellen und Beobachtungen
            </h3>
            <p className="mt-2 text-xs text-slate-400">
              Provider-Rohdaten sind separat belegpflichtig. Feature-Provenienz
              belegt die Herkunft, ersetzt aber keinen Rohdatensnapshot.
            </p>
            {!validFeatures.length ? (
              <p className="mt-3 text-sm text-amber-100">
                Kein Quellen- oder Feature-Snapshot mit diesem Ergebnis
                übergeben.
              </p>
            ) : (
              <ul className="mt-3 space-y-3 text-xs">
                {validFeatures.map((f, i) => (
                  <li
                    key={f.featureId + i}
                    className="break-words rounded border border-slate-700 p-3"
                  >
                    <p className="font-semibold text-cyan-200">
                      {f.provenance.providerId} · {f.provenance.providerDataset}
                    </p>
                    <p className="mt-2">
                      Quelle: {f.provenance.sourceReference}
                    </p>
                    <p>
                      Beobachtet:{' '}
                      {new Date(f.provenance.observedAt).toLocaleString(
                        'de-DE',
                      )}
                    </p>
                    <p>
                      Empfangen:{' '}
                      {new Date(f.provenance.receivedAt).toLocaleString(
                        'de-DE',
                      )}{' '}
                      · {f.provenance.latencyMs} ms
                    </p>
                    <p>Umfang: {f.provenance.licenseScope}</p>
                    <DataStatusBadge
                      mode={
                        f.provenance.isDemo
                          ? 'simulated'
                          : now < f.observedAt
                            ? 'unavailable'
                            : now - f.observedAt > 30000
                              ? 'degraded'
                              : f.provenance.isDelayed
                                ? 'delayed'
                                : 'cached'
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className={panelClass}>
            <h3 className="font-semibold text-white">Abgeleitete Features</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[30rem] text-left text-xs">
                <caption className="sr-only">
                  Feature-Werte mit Einheiten, Qualität und Version
                </caption>
                <thead>
                  <tr>
                    {[
                      'Feature',
                      'Wert / Einheit',
                      'Normalisiert',
                      'Qualität',
                      'Version',
                    ].map((x) => (
                      <th className="p-2" scope="col" key={x}>
                        {x}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {validFeatures.map((f, i) => (
                    <tr key={f.featureId + i}>
                      <th scope="row" className="p-2 font-normal">
                        {f.featureId}
                      </th>
                      <td className="p-2">
                        {f.value} {f.unit}
                      </td>
                      <td className="p-2">{f.normalizedValue}/100</td>
                      <td className="p-2">{f.qualityScore}/100</td>
                      <td className="p-2">{f.calculationVersion}</td>
                    </tr>
                  ))}
                  {!validFeatures.length && (
                    <tr>
                      <td colSpan={5} className="p-3 text-slate-400">
                        Keine validierten Feature-Werte verfügbar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <section className={panelClass}>
            <h3 className="font-semibold text-white">Provider-Signale</h3>
            <p className="mt-2 text-sm text-slate-400">
              Keine separat belegten Drittanbieter-Scores übergeben.
              Provider-Signale werden nicht als Markt-Fakten ausgewiesen.
            </p>
          </section>
          <section className={panelClass}>
            <h3 className="font-semibold text-white">
              Modellinterpretation · Treiber
            </h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {[
                ['Positive Treiber', result.topPositiveDrivers],
                ['Negative Treiber', result.topNegativeDrivers],
              ].map(([label, drivers]) => (
                <div key={label as string}>
                  <h4 className="text-sm text-slate-300">{label as string}</h4>
                  <ul className="mt-2 space-y-2 text-xs">
                    {(drivers as FinalRankResult['topPositiveDrivers'])
                      .slice(0, 3)
                      .map((d) => (
                        <li key={d.componentId}>
                          <strong>{d.nameDe}</strong> · {d.contributionScore}{' '}
                          Punkte
                          <p className="text-slate-400">{d.evidenceSummary}</p>
                        </li>
                      ))}
                  </ul>
                  {!(drivers as unknown[]).length && (
                    <p className="mt-2 text-xs text-slate-400">
                      Keine belegten Treiber verfügbar.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
          <section className={panelClass}>
            <h3 className="font-semibold text-white">
              Reason-Codes & Risiko-Flags
            </h3>
            <p className="mt-2 text-xs text-slate-400">
              Veto und fehlende Pflichtdaten dürfen nicht durch hohe Subscores
              verdeckt werden.
            </p>
            <ul className="mt-3 space-y-2 break-words font-mono text-xs text-amber-100">
              {result.reasonCodes.map((code, i) => (
                <li key={code + i}>{code}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-400">
              Separate Risiko-Flags sind in diesem Ergebnisvertrag nicht
              enthalten; Risiko- und Gate-Gründe stehen oben.
            </p>
          </section>
          <section className={panelClass}>
            <h3 className="font-semibold text-white">Evidence & Replay</h3>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-400">
                  Evidence-Referenz · ohne Readback nicht verifiziert
                </dt>
                <dd className="mt-1 break-all font-mono text-xs text-cyan-200">
                  {result.evidenceId}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Berechnet</dt>
                <dd>{new Date(result.computedAt).toLocaleString('de-DE')}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Modellversion</dt>
                <dd>{result.modelVersion}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">
                  Konfigurationsversion / Replay-ID
                </dt>
                <dd>Nicht im Ergebnisvertrag enthalten</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-slate-400">
              Offline-Shadow-Läufe können Owner separat in der geschützten
              Pipeline-Konsole replayen. Für diesen Score ist kein
              Replay-Backend angebunden.
            </p>
          </section>
          <p className="text-xs leading-relaxed text-slate-400">
            {result.regulatoryDisclaimer} Ein hoher Score beschreibt
            Modellausrichtung, keine garantierte Rendite. Konfidenz ist keine
            Vorhersagewahrscheinlichkeit.
          </p>
        </>
      )}
    </AnalysisDialog>
  );
};
