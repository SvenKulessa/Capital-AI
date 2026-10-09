/**
 * MARKET FIN-12/PVC-12 Finance validated DATA handoff translated to CAPITAL-AI contracts.
 *
 * Adapted from Finance@dcef421/ValidatedFinancialFeatureContract and
 * FintechDataHandoff; DataProvenance, AssetIdentity, provider rights, and the
 * existing ScoringEngineService remain target authorities. No source dispatcher.
 * No numeric feature is inferred from price or from a missing normalizer.
 */
import { z } from 'zod';
import { DataProvenanceSchema } from '../../contracts/canonicalContracts.ts';
import { PipelineSnapshotSchema, type PipelineSnapshot } from '../../contracts/pipelineExecution.ts';
import {
  FINANCE_PINNED_SOURCE_SHA, inspectFinanceFeatureMapping,
  type FinanceSourceFeature,
} from '../../contracts/financeResearchFeatureBridge.ts';

export const FINANCE_VALIDATED_DATA_HANDOFF_VERSION = 'CAPITAL_AI_FINANCE_VALIDATED_DATA_HANDOFF@1' as const;
export const FINANCE_SOURCE_VALIDATED_DATA_VERSION = 'validated-data-input/1.0.0' as const;
const version = z.string().regex(/^\d+\.\d+\.\d+$/);
const nonblank = z.string().min(1).max(500);
const observationSchema = z.strictObject({
  sourceField: nonblank,
  featureId: nonblank,
  status: z.enum(['PASS', 'PARTIAL', 'FAIL', 'NOT_COMPUTABLE', 'STALE', 'MISSING', 'UNKNOWN']),
  value: z.number().finite().nullable(),
  unit: nonblank,
  normalizedValue: z.number().finite().min(0).max(100).nullable(),
  normalizationVersion: version.nullable(),
  normalizationEvidenceRef: nonblank.nullable(),
  qualityScore: z.number().finite().min(0).max(100),
  observedAt: z.string().datetime(),
  retrievedAt: z.string().datetime(),
  provenance: DataProvenanceSchema,
});
export const FinanceValidatedDataInputSchema = z.strictObject({
  sourceRepository: z.literal('SvenKulessa/Finance'),
  sourceCommit: z.literal(FINANCE_PINNED_SOURCE_SHA),
  sourceContractVersion: z.literal(FINANCE_SOURCE_VALIDATED_DATA_VERSION),
  correlationId: nonblank,
  assetId: nonblank,
  symbol: nonblank,
  evaluatedAt: z.string().datetime(),
  aggregateStatus: z.enum(['PASS','PARTIAL','FAIL','NOT_COMPUTABLE','STALE','MISSING','UNKNOWN']),
  provenanceComplete: z.boolean(),
  missingRequiredFields: z.array(nonblank).max(100),
  nonComputableReasons: z.array(nonblank).max(100),
  observations: z.array(observationSchema).min(1).max(100),
});
export type FinanceValidatedDataInput = z.infer<typeof FinanceValidatedDataInputSchema>;
type Blocked = {
  readonly version: typeof FINANCE_VALIDATED_DATA_HANDOFF_VERSION;
  readonly state: 'BLOCKED';
  readonly reasons: readonly string[];
  readonly candidates: readonly [];
  readonly scoreEligible: false;
  readonly productionEligible: false;
};
type Ready = {
  readonly version: typeof FINANCE_VALIDATED_DATA_HANDOFF_VERSION;
  readonly state: 'RESEARCH_MAPPABLE';
  readonly reasons: readonly string[];
  readonly candidates: readonly FinanceSourceFeature[];
  readonly scoreEligible: false;
  readonly productionEligible: false;
};
const block = (reasons: Iterable<string>): Blocked => Object.freeze({
  version: FINANCE_VALIDATED_DATA_HANDOFF_VERSION,
  state: 'BLOCKED', reasons: Object.freeze([...new Set(reasons)].sort()),
  candidates: Object.freeze([]) as readonly [],
  scoreEligible: false, productionEligible: false,
});

/**
 * One-to-one feature projection, gated by target-market rights; Finance source PASS
 * alone has no score authority. The normalized 0-100 input must be individually
 * attested with a calculation version and an evidence reference.
 */
export function projectFinanceValidatedDataToResearch(input: {
  snapshot: PipelineSnapshot;
  source: FinanceValidatedDataInput;
}): Blocked | Ready {
  const snapshot = PipelineSnapshotSchema.parse(input.snapshot);
  const checked = FinanceValidatedDataInputSchema.safeParse(input.source);
  if (!checked.success) return block(['FINANCE_VALIDATED_DATA_SCHEMA_INVALID']);
  const source = checked.data;
  const reasons = new Set<string>();
  if (source.correlationId !== snapshot.runId) reasons.add('FINANCE_CORRELATION_MISMATCH');
  if (source.assetId !== snapshot.asset.assetId || source.symbol !== snapshot.asset.symbol) {
    reasons.add('FINANCE_VALIDATED_ASSET_IDENTITY_MISMATCH');
  }
  if (Date.parse(source.evaluatedAt) !== snapshot.evaluatedAt) reasons.add('FINANCE_EVALUATION_TIME_MISMATCH');
  if (!['PASS','PARTIAL'].includes(source.aggregateStatus)) reasons.add('FINANCE_DATA_STATUS_NOT_ADMISSIBLE');
  if (!source.provenanceComplete) reasons.add('FINANCE_SOURCE_PROVENANCE_INCOMPLETE');
  if (source.missingRequiredFields.length || source.nonComputableReasons.length) {
    reasons.add('FINANCE_SOURCE_NON_COMPUTABLE_FIELDS');
  }

  const sourceFields = new Set<string>();
  const targetKeys = new Set<string>();
  const candidates: FinanceSourceFeature[] = [];
  for (const obs of source.observations) {
    if (sourceFields.has(obs.sourceField)) reasons.add('FINANCE_DUPLICATE_OBSERVATION_FIELD');
    sourceFields.add(obs.sourceField);
    const key = obs.featureId + ':' + obs.provenance.providerId;
    if (targetKeys.has(key)) reasons.add('FINANCE_DUPLICATE_TARGET_FEATURE');
    targetKeys.add(key);
    if (!['PASS', 'PARTIAL'].includes(obs.status) || obs.value === null) {
      reasons.add('FINANCE_OBSERVATION_NOT_ADMISSIBLE'); continue;
    }
    if (obs.normalizedValue === null || !obs.normalizationVersion || !obs.normalizationEvidenceRef) {
      reasons.add('FINANCE_NORMALIZATION_EVIDENCE_MISSING'); continue;
    }
    if (!snapshot.rawInputReferences.includes(obs.normalizationEvidenceRef)) {
      reasons.add('FINANCE_NORMALIZATION_REFERENCE_NOT_IN_SNAPSHOT');
    }
    const observedMs = Date.parse(obs.observedAt);
    const retrievedMs = Date.parse(obs.retrievedAt);
    if (observedMs !== obs.provenance.observedAt
        || retrievedMs !== obs.provenance.receivedAt
        || observedMs > retrievedMs
        || retrievedMs > snapshot.evaluatedAt) {
      reasons.add('FINANCE_VALIDATED_TIMESTAMP_MISMATCH');
    }
    candidates.push({
      sourceRepository: source.sourceRepository,
      sourceCommit: source.sourceCommit,
      sourceField: obs.sourceField,
      sourceEvidenceRef: obs.provenance.sourceReference,
      feature: {
        assetId: snapshot.asset.assetId,
        featureId: obs.featureId,
        value: obs.value,
        normalizedValue: obs.normalizedValue,
        unit: obs.unit,
        observedAt: observedMs,
        calculationVersion: obs.normalizationVersion,
        qualityScore: obs.qualityScore,
        provenance: obs.provenance,
      },
    });
  }
  if (candidates.length !== source.observations.length) reasons.add('FINANCE_SOURCE_FEATURE_MAPPING_INCOMPLETE');
  if (reasons.size) return block(reasons);
  const rightsAndProvenance = inspectFinanceFeatureMapping({snapshot, candidates});
  if (rightsAndProvenance.state !== 'RESEARCH_MAPPABLE') return block(rightsAndProvenance.reasons);
  return Object.freeze({
    version: FINANCE_VALIDATED_DATA_HANDOFF_VERSION,
    state: 'RESEARCH_MAPPABLE' as const,
    reasons: Object.freeze([] as string[]),
    candidates: Object.freeze(candidates),
    scoreEligible: false as const, productionEligible: false as const,
  });
}
