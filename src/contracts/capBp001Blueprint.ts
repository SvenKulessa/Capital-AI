import { z } from 'zod';
import { CANONICAL_50_COMPONENTS } from './analysisComponentRegistry';

/** CAP-BP-001 is an offline design/fixture contract, never a production component runner. */
function requireCanonicalEntry() {
  const found = CANONICAL_50_COMPONENTS.find(c => c.componentId === 'market_integrity_gate');
  if (!found) throw new Error('CAP_BP_001_CANONICAL_ENTRY_MISSING');
  return found;
}
const entry = requireCanonicalEntry();

export const CAP_BP_001_MODULE_IDS = [
  '01_component_identity', '02_business_purpose', '03_data_contracts',
  '04_data_pipeline', '05_feature_engineering', '06_indicators_and_analytical_tools',
  '07_scoring_model', '08_weighting_and_normalization', '09_confidence_and_quality',
  '10_risk_and_gates', '11_evidence_and_explainability', '12_ui_integration',
  '13_api_contract', '14_acceptance_criteria',
] as const;

const ModuleSchema = z.strictObject({
  id: z.enum(CAP_BP_001_MODULE_IDS),
  title: z.string().min(3),
  specifications: z.array(z.string().min(12)).min(2),
  status: z.literal('CONCEPT'),
  runtimeEvidence: z.literal('NOT_PROVEN'),
});
export const CapBp001BlueprintSchema = z.strictObject({
  schemaVersion: z.literal('CAP_BP_001_BLUEPRINT@1'),
  blueprintId: z.literal('CAP-BP-001'),
  blueprintVersion: z.literal('1.0.0'),
  productType: z.literal('TECHNICAL_COMPONENT_BLUEPRINT'),
  componentId: z.literal('market_integrity_gate'),
  displayName: z.literal('Market Integrity Gate'),
  calculationVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  registryLifecycle: z.literal('blocked'),
  registryProvenance: z.literal('unavailable'),
  publicMode: z.literal('CONCEPT_ONLY'),
  modules: z.array(ModuleSchema).length(14),
}).superRefine((value, ctx) => {
  CAP_BP_001_MODULE_IDS.forEach((id, i) => {
    if (value.modules[i]?.id !== id) ctx.addIssue({
      code: 'custom', path: ['modules', i, 'id'], message: 'MODULE_ID_OR_ORDER_INVALID',
    });
  });
  if (value.calculationVersion !== entry.calculationVersion ||
    value.registryLifecycle !== entry.status || value.registryProvenance !== entry.provenanceMode ||
    value.displayName !== entry.displayName) {
    ctx.addIssue({ code: 'custom', message: 'REGISTRY_IDENTITY_MISMATCH' });
  }
});

const modules: readonly (readonly [string, string, string])[] = [
  ['Identity / lifecycle', 'Canonical registry identity market_integrity_gate and CAP-BP-001 blueprint ID.', 'Blueprint version is independent of the registry calculationVersion and must not activate its blocked lifecycle.'],
  ['Business purpose', 'Veto unreliable market quote observations before scoring.', 'Not an alpha model, trade signal, forecast or investor advice.'],
  ['Data contracts', 'Conceptual RawTickStreamContract and ExchangeStatusContract inputs and IntegrityStatusContract output.', 'Strict versioned sandbox-only DTOs demonstrate format without inventing live canonical contracts.'],
  ['Data pipeline', 'Proposed rights and asset identity checks precede normalization, timestamps and integrity gates.', 'No provider ingestion, tenant data, fan-out or runtime wiring is implemented.'],
  ['Feature engineering', 'Synthetic spread, sequence continuity and timestamp jitter are computed deterministically.', 'Missing inputs and invalid temporal order never receive invented features.'],
  ['Indicators and tools', 'Spread in basis points equals 20000 times (ask minus bid) divided by (ask plus bid).', 'A proposed 250ms demonstration cadence tolerance is not exchange-calibrated.'],
  ['Scoring model', 'Demonstration returns no numeric score, rank or quality score.', 'No successful synthetic result changes canonical eligibility or suppresses a veto.'],
  ['Weighting', 'Registry defaultWeight 1.0 is component metadata, not a global scoring allocation.', 'A hard integrity gate cannot be outweighed by another feature family.'],
  ['Confidence and quality', 'Canonical minimumDataSufficiencyRatio is 0.95, evaluated only as fixture completeness here.', 'Synthetic confidence is always zero, never a win probability or measured reliability.'],
  ['Risk and gates', 'Crossed book, sequence gap, stale/future timestamps and exchange halt are hard demonstration blockers.', 'Provider rights, live features, production admission and asset coverage remain separate blockers.'],
  ['Evidence', 'Output reason codes and explicit local synthetic provenance allow deterministic fixture replay.', 'No source SHA, production replay evidence, real validation timestamp or licensed rights are fabricated.'],
  ['UI integration', 'Any preview must display CONCEPT or DEMO and non-actionable results.', 'No ranking, alerting, trading, live UI route or paid source download is enabled.'],
  ['API contract', 'CAP_BP_001_INPUT@1 and CAP_BP_001_RESULT@1 are strict in-process contracts.', 'No network endpoint, provider key, BYOK, customer identity or entitlement is accepted.'],
  ['Acceptance criteria', 'Require all 14 ordered modules, deterministic positive fixtures and negative integrity cases.', 'Existing domain and Docker checks, repository rulesets and real evidence govern merges and any future activation.'],
];
export const CAP_BP_001_BLUEPRINT = CapBp001BlueprintSchema.parse({
  schemaVersion: 'CAP_BP_001_BLUEPRINT@1',
  blueprintId: 'CAP-BP-001', blueprintVersion: '1.0.0',
  productType: 'TECHNICAL_COMPONENT_BLUEPRINT',
  componentId: entry.componentId, displayName: entry.displayName,
  calculationVersion: entry.calculationVersion,
  registryLifecycle: entry.status, registryProvenance: entry.provenanceMode,
  publicMode: 'CONCEPT_ONLY',
  modules: CAP_BP_001_MODULE_IDS.map((id, i) => ({
    id, title: modules[i][0], specifications: [modules[i][1], modules[i][2]],
    status: 'CONCEPT', runtimeEvidence: 'NOT_PROVEN',
  })),
});

const TickSchema = z.strictObject({
  sequence: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER - 1),
  observedAt: z.number().int().positive(),
  bid: z.number().finite().positive().max(1e12),
  ask: z.number().finite().positive().max(1e12),
});
export const CapBp001SyntheticInputSchema = z.strictObject({
  schemaVersion: z.literal('CAP_BP_001_INPUT@1'),
  componentId: z.literal('market_integrity_gate'),
  mode: z.literal('offline_synthetic'),
  isDemo: z.literal(true),
  provenance: z.literal('SYNTHETIC'),
  rights: z.literal('sandbox_demo'),
  assetId: z.string().trim().min(1).max(128),
  venue: z.string().trim().min(1).max(64),
  evaluatedAt: z.number().int().positive(),
  expectedIntervalMs: z.number().int().min(1).max(5000),
  exchange: z.strictObject({
    state: z.enum(['open', 'halted', 'unknown']),
    observedAt: z.number().int().positive(),
  }),
  ticks: z.array(TickSchema).min(1).max(100),
});
export type CapBp001SyntheticInput = z.infer<typeof CapBp001SyntheticInputSchema>;

export const CapBp001ReasonSchema = z.enum([
  'MIG_INPUT_SCHEMA_INVALID', 'MIG_INSUFFICIENT_DATA',
  'MIG_EXCHANGE_NOT_OPEN', 'MIG_CROSSED_BOOK', 'MIG_SEQUENCE_GAP',
  'MIG_TIMESTAMP_REGRESSION', 'MIG_TIMESTAMP_FUTURE',
  'MIG_TIMESTAMP_JITTER', 'MIG_STALE_SNAPSHOT',
]);
export type CapBp001Reason = z.infer<typeof CapBp001ReasonSchema>;

export const CapBp001SyntheticResultSchema = z.strictObject({
  schemaVersion: z.literal('CAP_BP_001_RESULT@1'),
  blueprintId: z.literal('CAP-BP-001'),
  blueprintVersion: z.literal('1.0.0'),
  componentId: z.literal('market_integrity_gate'),
  calculationVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  state: z.enum(['DEMO_ONLY', 'BLOCKED']),
  reasonCodes: z.array(CapBp001ReasonSchema),
  samples: z.number().int().nonnegative(),
  fixtureCompleteness: z.number().finite().min(0).max(1),
  spreadBps: z.number().finite().min(0).max(20000).nullable(),
  jitterMs: z.number().finite().nonnegative().nullable(),
  isDemo: z.literal(true), provenance: z.literal('SYNTHETIC'),
  confidence: z.literal(0), score: z.null(), rank: z.null(),
  productionEligible: z.literal(false), rankEligible: z.literal(false),
  decisionEligible: z.literal(false), publishable: z.literal(false),
  evidence: z.strictObject({
    rights: z.literal('sandbox_demo'), sourceSha: z.null(),
    lastValidatedAt: z.null(), productionEvidence: z.literal(false),
    replayScope: z.literal('OFFLINE_ONLY'),
  }),
}).superRefine((r, ctx) => {
  if ((r.state === 'DEMO_ONLY') !== (r.reasonCodes.length === 0)) {
    ctx.addIssue({ code: 'custom', message: 'STATE_REASON_MISMATCH' });
  }
  if (r.calculationVersion !== entry.calculationVersion) {
    ctx.addIssue({ code: 'custom', message: 'CALCULATION_VERSION_MISMATCH' });
  }
});
export type CapBp001SyntheticResult = z.infer<typeof CapBp001SyntheticResultSchema>;

function result(reasons: CapBp001Reason[], samples: number, spreadBps: number | null, jitterMs: number | null): CapBp001SyntheticResult {
  const codes = [...new Set(reasons)];
  return CapBp001SyntheticResultSchema.parse({
    schemaVersion: 'CAP_BP_001_RESULT@1', blueprintId: 'CAP-BP-001', blueprintVersion: '1.0.0',
    componentId: entry.componentId, calculationVersion: entry.calculationVersion,
    state: codes.length ? 'BLOCKED' : 'DEMO_ONLY', reasonCodes: codes, samples,
    fixtureCompleteness: Math.min(1, samples / 2), spreadBps, jitterMs,
    isDemo: true, provenance: 'SYNTHETIC', confidence: 0, score: null, rank: null,
    productionEligible: false, rankEligible: false, decisionEligible: false, publishable: false,
    evidence: { rights: 'sandbox_demo', sourceSha: null, lastValidatedAt: null,
      productionEvidence: false, replayScope: 'OFFLINE_ONLY' },
  });
}

/** Pure deterministic demo; never register as a production/scoring ComponentRunner. */
export function evaluateCapBp001Synthetic(input: unknown): CapBp001SyntheticResult {
  const parsed = CapBp001SyntheticInputSchema.safeParse(input);
  if (!parsed.success) return result(['MIG_INPUT_SCHEMA_INVALID'], 0, null, null);
  const data = parsed.data;
  const reasons: CapBp001Reason[] = [];
  const maxAge = entry.refreshPolicy.maxStalenessSeconds * 1000;
  if (data.ticks.length < 2 || Math.min(1, data.ticks.length / 2) < entry.confidencePolicy.minimumDataSufficiencyRatio) {
    reasons.push('MIG_INSUFFICIENT_DATA');
  }
  if (data.exchange.state !== 'open') reasons.push('MIG_EXCHANGE_NOT_OPEN');
  if (data.exchange.observedAt > data.evaluatedAt) reasons.push('MIG_TIMESTAMP_FUTURE');
  if (data.evaluatedAt - data.exchange.observedAt > maxAge) reasons.push('MIG_STALE_SNAPSHOT');
  let spreadBps: number | null = null;
  let jitterMs: number | null = null;
  data.ticks.forEach((tick, i) => {
    if (tick.bid >= tick.ask) reasons.push('MIG_CROSSED_BOOK');
    if (tick.observedAt > data.evaluatedAt) reasons.push('MIG_TIMESTAMP_FUTURE');
    if (data.evaluatedAt - tick.observedAt > maxAge) reasons.push('MIG_STALE_SNAPSHOT');
    if (i) {
      const previous = data.ticks[i - 1];
      if (tick.sequence !== previous.sequence + 1) reasons.push('MIG_SEQUENCE_GAP');
      if (tick.observedAt <= previous.observedAt) reasons.push('MIG_TIMESTAMP_REGRESSION');
      jitterMs = Math.max(jitterMs ?? 0, Math.abs(tick.observedAt - previous.observedAt - data.expectedIntervalMs));
    }
    if (i === data.ticks.length - 1 && tick.bid < tick.ask) {
      spreadBps = Math.round((20000 * (tick.ask - tick.bid) / (tick.ask + tick.bid)) * 100) / 100;
    }
  });
  // Synthetic demonstration threshold only, not empirically validated on a venue.
  if (jitterMs !== null && jitterMs > 250) reasons.push('MIG_TIMESTAMP_JITTER');
  return result(reasons, data.ticks.length, spreadBps, jitterMs);
}
