/**
 * MARKET/TRUST: compare proposed historical Finance result bytes with the canonical
 * Capital-AI RESEARCH evaluator. Hashes attest byte consistency, not authenticity.
 * Never produces scoring, ranking, trading, publishing or promotion authority.
 */
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { FINANCE_PINNED_SOURCE_SHA } from '../../contracts/financeResearchFeatureBridge.ts';
import { ScoringEngineService } from '../../services/scoringEngine.ts';
import type { FinanceResearchModelEvaluationRequest } from './FinanceResearchModelEvaluation.ts';

export const FINANCE_HISTORICAL_PARITY_AUDIT_VERSION = 'CAPITAL_AI_FINANCE_HISTORICAL_PARITY_AUDIT@1' as const;
const ref = z.string().trim().min(1).max(500);
const sha = z.string().regex(/^[a-f0-9]{64}$/);
const iso = z.string().datetime();

/** Proposed export envelope, not a source-native or source-signed artifact. */
export const FinanceHistoricalSourceResultSchema = z.strictObject({
  sourceRepository: z.literal('SvenKulessa/Finance'),
  sourceCommit: z.literal(FINANCE_PINNED_SOURCE_SHA),
  modelId: ref,
  modelVersion: ref,
  assetId: ref,
  decisionAt: iso,
  generatedAt: iso,
  sourceInputFingerprint: sha,
  providerArchiveSha256: sha,
  score: z.number().finite().min(0).max(100),
});

export type FinanceHistoricalParityCandidateInput = {
  readonly researchInput: FinanceResearchModelEvaluationRequest;
  readonly reference: {
    readonly observedAt: string;
    readonly availableAt: string;
    readonly capturedAt: string;
    readonly decisionAt: string;
    readonly providerArchiveEvidenceRef: string;
    readonly providerArchiveBytes: Uint8Array | string;
    readonly providerArchiveSha256: string;
    readonly sourceResultEvidenceRef: string;
    readonly sourceResultBytes: Uint8Array | string;
    readonly sourceResultSha256: string;
  };
};

type AuditState = 'BLOCKED' | 'RESEARCH_MATCH_CANDIDATE' | 'RESEARCH_MISMATCH';
function digest(value: Uint8Array | string): string {
  return createHash('sha256').update(value).digest('hex');
}
function byteCount(value: unknown): number {
  if (typeof value === 'string') return Buffer.byteLength(value,'utf8');
  if (value instanceof Uint8Array) return value.byteLength;
  return -1;
}
function timestamp(value: unknown): number {
  return typeof value === 'string' ? Date.parse(value) : NaN;
}
function blocked(codes: Iterable<string>) {
  return Object.freeze({
    version: FINANCE_HISTORICAL_PARITY_AUDIT_VERSION,
    state: 'BLOCKED' as AuditState,
    reasons: Object.freeze([...new Set(codes)].sort()),
    sourceScore: null, targetResearchScore: null,
    contentPairFingerprint: null, researchReplayFingerprint: null,
    empiricalHistoricalParityProven: false as const,
    scoreEligible: false as const, productionEligible: false as const,
  });
}

/** Returns at most a research comparison candidate; NEVER historical proof. */
export function inspectFinanceHistoricalParityCandidate(input: FinanceHistoricalParityCandidateInput) {
  const { reference, researchInput } = input;
  const reasons = new Set<string>();
  const archiveLength = byteCount(reference.providerArchiveBytes);
  const sourceLength = byteCount(reference.sourceResultBytes);
  if (archiveLength <= 0 || archiveLength > 32 * 1024 * 1024
      || sourceLength <= 0 || sourceLength > 64 * 1024) {
    reasons.add('FINANCE_HISTORICAL_ARTIFACT_BYTES_INVALID');
  }
  if (!sha.safeParse(reference.providerArchiveSha256).success
      || (archiveLength > 0 && archiveLength <= 32 * 1024 * 1024
        && digest(reference.providerArchiveBytes) !== reference.providerArchiveSha256)) {
    reasons.add('FINANCE_HISTORICAL_ARCHIVE_DIGEST_MISMATCH');
  }
  if (!sha.safeParse(reference.sourceResultSha256).success
      || (sourceLength > 0 && sourceLength <= 64 * 1024
        && digest(reference.sourceResultBytes) !== reference.sourceResultSha256)) {
    reasons.add('FINANCE_SOURCE_RESULT_DIGEST_MISMATCH');
  }
  const dates = [reference.observedAt,reference.availableAt,
    reference.capturedAt,reference.decisionAt].map(timestamp);
  if (dates.some(t => !Number.isFinite(t))
      || dates.some((t,i) => i > 0 && t < dates[i-1])) {
    reasons.add('FINANCE_HISTORICAL_VINTAGE_ORDER_UNPROVEN');
  }
  if (!ref.safeParse(reference.providerArchiveEvidenceRef).success
      || !ref.safeParse(reference.sourceResultEvidenceRef).success
      || !researchInput?.snapshot?.rawInputReferences?.includes(reference.providerArchiveEvidenceRef)
      || !researchInput?.snapshot?.rawInputReferences?.includes(reference.sourceResultEvidenceRef)) {
    reasons.add('FINANCE_HISTORICAL_ARTIFACT_EVIDENCE_UNBOUND');
  }
  if (timestamp(reference.decisionAt) !== researchInput?.snapshot?.evaluatedAt) {
    reasons.add('FINANCE_HISTORICAL_DECISION_SNAPSHOT_MISMATCH');
  }
  if (!researchInput?.validatedData?.observations?.some(o =>
    timestamp(o.observedAt) === timestamp(reference.observedAt))) {
    reasons.add('FINANCE_HISTORICAL_OBSERVATION_NOT_IN_DATA_HANDOFF');
  }
  if (reasons.size) return blocked(reasons);

  let document: unknown;
  try {
    document = JSON.parse(typeof reference.sourceResultBytes === 'string'
      ? reference.sourceResultBytes : Buffer.from(reference.sourceResultBytes).toString('utf8'));
  } catch {
    return blocked(['FINANCE_HISTORICAL_SOURCE_RESULT_NOT_JSON']);
  }
  const parsed = FinanceHistoricalSourceResultSchema.safeParse(document);
  if (!parsed.success) return blocked(['FINANCE_HISTORICAL_SOURCE_RESULT_SCHEMA_INVALID']);
  const original = parsed.data;
  if (original.modelId !== researchInput.sourceModel.modelId
      || original.modelVersion !== researchInput.sourceModel.modelVersion
      || original.assetId !== researchInput.sourceModel.sourceAsset.assetId
      || original.assetId !== researchInput.snapshot.asset.assetId
      || timestamp(original.decisionAt) !== timestamp(reference.decisionAt)) {
    reasons.add('FINANCE_HISTORICAL_SOURCE_TARGET_IDENTITY_MISMATCH');
  }
  if (original.providerArchiveSha256 !== reference.providerArchiveSha256) {
    reasons.add('FINANCE_HISTORICAL_SOURCE_ARCHIVE_BINDING_MISMATCH');
  }
  if (timestamp(original.generatedAt) > timestamp(reference.decisionAt)
      || timestamp(original.generatedAt) < timestamp(reference.observedAt)) {
    reasons.add('FINANCE_HISTORICAL_SOURCE_OUTPUT_TIME_UNPROVEN');
  }
  if (Math.abs(original.score*10-Math.round(original.score*10)) > 1e-8) {
    reasons.add('FINANCE_HISTORICAL_SOURCE_SCORE_PRECISION_INVALID');
  }
  if (reasons.size) return blocked(reasons);

  let target: ReturnType<typeof ScoringEngineService.inspectFinanceModelResearch>;
  try {
    target = ScoringEngineService.inspectFinanceModelResearch(researchInput);
  } catch {
    return blocked(['FINANCE_HISTORICAL_TARGET_RESEARCH_INPUT_INVALID']);
  }
  if (target.state !== 'RESEARCH_EVALUATED' || !target.researchReplayFingerprint
      || target.research?.researchCompositeValue == null
      || target.scoreEligible !== false || target.productionEligible !== false) {
    return blocked(['FINANCE_HISTORICAL_TARGET_RESEARCH_NOT_ADMITTED',...target.reasons]);
  }
  const targetScore = Number(target.research.researchCompositeValue.toFixed(1));
  const matched = original.score === targetScore;
  return Object.freeze({
    version: FINANCE_HISTORICAL_PARITY_AUDIT_VERSION,
    state: (matched ? 'RESEARCH_MATCH_CANDIDATE' : 'RESEARCH_MISMATCH') as AuditState,
    reasons: Object.freeze([] as string[]),
    sourceScore: original.score,
    targetResearchScore: targetScore,
    contentPairFingerprint: digest(JSON.stringify({
      version:FINANCE_HISTORICAL_PARITY_AUDIT_VERSION,
      archive:reference.providerArchiveSha256,
      sourceResult:reference.sourceResultSha256,
      replay:target.researchReplayFingerprint,
      decisionAt:reference.decisionAt,
      sourceScore:original.score,targetScore,
    })),
    researchReplayFingerprint: target.researchReplayFingerprint,
    empiricalHistoricalParityProven: false as const,
    scoreEligible: false as const, productionEligible: false as const,
  });
}
