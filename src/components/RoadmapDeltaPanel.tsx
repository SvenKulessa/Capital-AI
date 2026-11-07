import React from 'react';
import { projectRoadmapDelta, serializeRoadmapOwnerLineageEvidence } from '../data/roadmapDeltaReconciliation';
import type { RoadmapDeltaRepositoryReadback, DeltaEvidenceState } from '../data/roadmapDeltaReconciliation';

const EVIDENCE_LABELS: Record<DeltaEvidenceState, string> = {
  VERIFIED: 'VERIFIED',
  IN_PROGRESS: 'IN_PROGRESS',
  BLOCKED: 'BLOCKED',
  NOT_PROVEN: 'NOT_PROVEN',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
};

interface RoadmapDeltaPanelProps {
  readback: RoadmapDeltaRepositoryReadback | null;
}

/**
 * Owner-only parent: ControlCenterPage renders RoadmapPanel after session IAM
 * authorization. Uses its existing repository snapshot; no independent polling.
 */
export const RoadmapDeltaPanel: React.FC<RoadmapDeltaPanelProps> = ({ readback }) => {
  const delta = projectRoadmapDelta(readback);
  const evidenceText = serializeRoadmapOwnerLineageEvidence(readback);
  const [copyState, setCopyState] = React.useState<'idle' | 'copied' | 'manual'>('idle');
  const [manualEvidence, setManualEvidence] = React.useState<string | null>(null);

  React.useEffect(() => {
    setCopyState('idle');
    setManualEvidence(null);
  }, [evidenceText]);

  const copyEvidence = async () => {
    if (!evidenceText) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard_unavailable');
      await navigator.clipboard.writeText(evidenceText);
      setCopyState('copied');
      setManualEvidence(null);
    } catch {
      // Clipboard permissions differ on Android: offer a read-only manual copy.
      setCopyState('manual');
      setManualEvidence(evidenceText);
    }
  };

  return (
    <section aria-labelledby="roadmap-delta-heading" className="my-4 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
      <h3 id="roadmap-delta-heading" className="text-base font-bold text-white">Chat → Main · Evidenz-Deltas</h3>
      <p className="mt-2 text-xs leading-relaxed text-slate-300">
        Versionierter Teilabgleich aus Issue #598, nicht die Gesamtfreigabe aller Roadmap-Pakete.
        Code, CI, Runtime und Rechte werden getrennt bewertet; keine Veröffentlichung oder Provider-Aktivierung.
      </p>
      <p className="mt-2 break-all text-xs text-slate-400">
        Baseline vom {delta.baseline.reviewedDate}: <a
          href={'https://github.com/' + delta.baseline.repository + '/commit/' + delta.baseline.baselineMainSha}
          className="text-cyan-300 underline underline-offset-2"
          target="_blank" rel="noopener noreferrer">{delta.baseline.baselineMainSha.slice(0, 12)}</a>
        {' · '}Schema: {delta.baseline.schema} · Revision {delta.baseline.revision}
        {' · '}Quell-PR <a href={'https://github.com/' + delta.baseline.repository + '/pull/' + delta.baseline.supportingMergePr}
          className="text-cyan-300 underline underline-offset-2"
          target="_blank" rel="noopener noreferrer">#{delta.baseline.supportingMergePr}</a>
      </p>
      <p className="mt-1 text-xs text-slate-400">
        Historischer Baseline-Snapshot: <a
          href={'https://github.com/' + delta.baseline.repository + '/commit/' + delta.baseline.previousBaselineMainSha}
          className="text-cyan-300 underline underline-offset-2"
          target="_blank" rel="noopener noreferrer">{delta.baseline.previousBaselineMainSha.slice(0, 12)}</a>
        {' · '}nicht als aktueller LIVE-Nachweis verwendbar.
      </p>
      <p role="status" aria-live="polite" className={delta.sourceMatched ? 'mt-2 text-sm text-emerald-300' : 'mt-2 text-sm text-amber-300'}>
        {delta.mainMatched
          ? 'LIVE main entspricht der geprüften Baseline. Code-Nachweise gelten nur für diesen Snapshot.'
          : delta.lineageMatched
            ? 'LIVE main ist ein belegter Nachfolge-Commit mit unveränderten geprüften Quell-Blobs. Nur Source-Evidence bleibt gültig; CI, Runtime und Rechte sind separat.'
            : 'Keine valide LIVE-Baseline oder geprüfte Quell-Abstammung: Codebewertungen werden als NOT_PROVEN ausgewiesen.'}
      </p>
      <div className="mt-3 space-y-2 rounded-lg border border-slate-700 p-3">
        <button type="button" disabled={!evidenceText}
          onClick={() => void copyEvidence()}
          className="min-h-11 rounded-lg border border-cyan-500/50 px-3 py-2 text-sm text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50">
          Bereinigten Lineage-Nachweis kopieren
        </button>
        <p className="text-xs text-slate-400">
          Nur bei frischer LIVE-Abstammung verfügbar. Enthält ausschließlich
          Commit-/Blob-Nachweise aus dem bereits autorisiert geladenen Katalog;
          keine Cookies, Tokens, Nutzerdaten oder Freigabe-Claims.
          Bei fehlender Evidence zuerst „Jetzt abgleichen“ auswählen.
        </p>
        {copyState !== 'idle' && <p role="status" aria-live="polite" className="text-xs text-slate-200">
          {copyState === 'copied'
            ? 'Bereinigter Nachweis kopiert. Vor Weitergabe prüfen.'
            : 'Zwischenablage nicht verfügbar: Nachweis im Feld auswählen und manuell kopieren.'}
        </p>}
        {manualEvidence && <textarea readOnly rows={11}
          aria-label="Bereinigte Lineage-Evidence zur manuellen Auswahl"
          onFocus={event => event.currentTarget.select()}
          value={manualEvidence}
          className="w-full rounded-lg border border-slate-600 bg-slate-900 p-2 font-mono text-xs text-slate-100" />}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {delta.items.map(item => (
          <article key={item.scopeId} className="min-w-0 rounded-lg border border-slate-700 bg-slate-900/80 p-3">
            <h4 className="text-sm font-semibold text-white">{item.title}</h4>
            <p className="mt-1 text-xs text-slate-400">
              {item.scopeId}{item.roadmapId ? ' · ' + item.roadmapId : ''}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              {([
                ['Code', item.code],
                ['CI', item.ci],
                ['Runtime', item.runtime],
                ['Rechte', item.rights],
              ] as const).map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="mt-1 break-words font-semibold text-slate-200">{EVIDENCE_LABELS[value]}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-slate-300">
              <span className="font-semibold">Nächster Schritt: </span>{item.nextStep}
            </p>
            <p className="mt-2 flex flex-wrap gap-3 text-xs">
              <a className="text-cyan-300 underline underline-offset-2" href={item.sourceUrl}
                target="_blank" rel="noopener noreferrer">Quellnachweis</a>
              <a className="text-cyan-300 underline underline-offset-2" href={item.trackingUrl}
                target="_blank" rel="noopener noreferrer">Tracking</a>
            </p>
          </article>
        ))}
      </div>
    </section>
  );
};
