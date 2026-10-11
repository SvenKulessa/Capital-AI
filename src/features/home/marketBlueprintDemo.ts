/**
 * Fully synthetic, deterministic learning fixtures for public product blueprints.
 * NOT market data, historical backtest output, commercial ingestion or investment scores.
 * This module has no provider, auth, network or runtime dependency.
 */
export type MarketBlueprintId = 'ingestion' | 'evidence' | 'scoring' | 'alerts';
export type DemoFactor = { id: string; label: string; value: number; weight: number };
export type MarketBlueprintDefinition = {
  id: MarketBlueprintId;
  name: string;
  subtitle: string;
  dataConcept: string;
  formula: string;
  outputContract: string;
  runtime: 'PAUSED' | 'CONCEPT';
  factors: readonly DemoFactor[];
  series: readonly number[];
};

export const MARKET_BLUEPRINTS: readonly MarketBlueprintDefinition[] = [
  {
    id: 'ingestion',
    name: 'Market Ingestion & Data Quality',
    subtitle: 'Rust-Adapter als Datenkonzept – Runtime pausiert',
    dataConcept: 'market_observation { instrumentId, sourceId, observedAt, receivedAt, value, rightsScope, evidenceId }',
    formula: 'DQ = 0,35 × Quellenabdeckung + 0,30 × Frische + 0,20 × Konsistenz + 0,15 × Provenienz',
    outputContract: 'Nur zugelassene, nachvollziehbare Beobachtungen wären für nachgelagerte Berechnungen zulässig.',
    runtime: 'PAUSED',
    factors: [
      { id: 'coverage', label: 'Abdeckung', value: 82, weight: 0.35 },
      { id: 'freshness', label: 'Frische', value: 76, weight: 0.30 },
      { id: 'consistency', label: 'Konsistenz', value: 90, weight: 0.20 },
      { id: 'lineage', label: 'Provenienz', value: 88, weight: 0.15 },
    ],
    series: [42, 49, 53, 63, 59, 78, 82],
  },
  {
    id: 'evidence',
    name: 'Event Transport & Evidence',
    subtitle: 'NATS / JetStream als optionales Architektur-Blueprint – pausiert',
    dataConcept: 'event_envelope { eventId, tenantScope, rightsScope, correlationId, observedAt, evidenceId, payloadRef }',
    formula: 'Demo-Reifegrad = 0,40 × Integrität + 0,35 × Replay-Schutz + 0,25 × Isolation',
    outputContract: 'Konzeptioneller Event-Vertrag mit nachvollziehbarer Herkunft und strikt getrennter privater Tenant-Lane.',
    runtime: 'PAUSED',
    factors: [
      { id: 'integrity', label: 'Integrität', value: 89, weight: 0.40 },
      { id: 'replay', label: 'Replay-Schutz', value: 82, weight: 0.35 },
      { id: 'isolation', label: 'Isolation', value: 92, weight: 0.25 },
    ],
    series: [52, 62, 60, 71, 68, 76, 89],
  },
  {
    id: 'scoring',
    name: 'Multi-Faktor Scoring',
    subtitle: 'Transparente Faktoren, Gewichte und No-Data-Gate',
    dataConcept: 'scoring_input { instrumentId, coverage, fundamentals, risk, momentum, observedAt, evidenceIds[] }',
    formula: 'Demo-Index = 0,30 × Qualität + 0,25 × Risiko + 0,25 × Momentum + 0,20 × Evidenz',
    outputContract: 'Ein realer Score bleibt BLOCKED, solange verifizierte Eingaben, Rechte oder Scoring-Evidence fehlen.',
    runtime: 'CONCEPT',
    factors: [
      { id: 'quality', label: 'Qualität', value: 82, weight: 0.30 },
      { id: 'risk', label: 'Risiko', value: 75, weight: 0.25 },
      { id: 'momentum', label: 'Momentum', value: 66, weight: 0.25 },
      { id: 'evidence', label: 'Evidenz', value: 95, weight: 0.20 },
    ],
    series: [51, 57, 55, 66, 62, 73, 79],
  },
  {
    id: 'alerts',
    name: 'Price Alert Blueprint',
    subtitle: 'Schwellenwertregel demonstrieren – Alarmfunktion deaktiviert',
    dataConcept: 'threshold_rule { instrumentId, threshold, direction, observedAt, evidenceId, deliveryPolicy }',
    formula: 'Konzept: Prüfung nur bei zugelassener, frischer Beobachtung; erst danach Preis ≥ Schwelle',
    outputContract: 'Kein Live-Trigger, kein Timer, keine Benachrichtigung. Modell zeigt ausschließlich eine synthetische Regel.',
    runtime: 'PAUSED',
    factors: [
      { id: 'validity', label: 'Eingabe', value: 90, weight: 0.40 },
      { id: 'freshness', label: 'Frische', value: 84, weight: 0.35 },
      { id: 'route', label: 'Zustellung', value: 70, weight: 0.25 },
    ],
    series: [38, 47, 43, 58, 61, 72, 81],
  },
] as const;

/** Synthetic weighted example; deliberately unrelated to productive scorer authority. */
export function computeBlueprintDemoIndex(factors: readonly DemoFactor[]): number {
  if (!factors.length) throw new Error('DEMO_FACTORS_MISSING');
  const sum = factors.reduce((acc, item) => {
    if (!Number.isFinite(item.value) || item.value < 0 || item.value > 100 ||
        !Number.isFinite(item.weight) || item.weight < 0 || item.weight > 1) {
      throw new Error('DEMO_FACTOR_INVALID');
    }
    return acc + item.weight;
  }, 0);
  if (Math.abs(sum - 1) > 1e-6) throw new Error('DEMO_WEIGHTS_NOT_NORMALIZED');
  return Math.round(factors.reduce((acc, item) => acc + item.value * item.weight, 0) * 10) / 10;
}

export function demoAlertWouldCross(series: readonly number[], threshold: number): boolean {
  if (!Number.isFinite(threshold) || series.some((v) => !Number.isFinite(v))) {
    throw new Error('DEMO_THRESHOLD_INVALID');
  }
  return series.some((v) => v >= threshold);
}
