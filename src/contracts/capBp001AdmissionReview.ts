/**
 * CAP-BP-001 independent pre-admission evidence review.
 *
 * This is a read-only gap inspector, not a provider adapter, canonical contract
 * resolver, evidence authority, component runner or production admission grant.
 * Input assertions are candidate metadata and cannot establish external rights
 * or immutable replay authenticity.
 */
import { z } from 'zod';
import { AssetIdentitySchema, DataProvenanceSchema } from './canonicalContracts';
import { CANONICAL_50_COMPONENTS } from './analysisComponentRegistry';
import { componentActivationReasons, validateAnalysisComponentRegistry } from './analysisComponentRegistryValidator';
import { MarketDataRightsEvidenceSchema, evaluateMarketDataRights } from './marketDataRightsEligibility';

function requireCanonicalEntry() {
  const found = CANONICAL_50_COMPONENTS.find(c => c.componentId === 'market_integrity_gate');
  if (!found) throw new Error('CAP_BP_001_CANONICAL_ENTRY_MISSING');
  return found;
}
const canonical = requireCanonicalEntry();

const timestamp = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const id = z.string().trim().min(1).max(256);

export const CapBp001AdmissionProbeSchema = z.strictObject({
  schemaVersion: z.literal('CAP_BP_001_ADMISSION_PROBE@1'),
  asset: AssetIdentitySchema,
  providerId: id,
  providerDataset: id,
  provenance: DataProvenanceSchema,
  decisionAt: timestamp,
  evaluatedAt: timestamp,
  rights: MarketDataRightsEvidenceSchema.nullable(),
  // Availability metadata is a candidate assertion; not an independently
  // authenticated PIT archive or a verified contract for a real exchange.
  pointInTime: z.strictObject({
    availableAt: timestamp,
    retrievedAt: timestamp,
    sourceReleaseReference: id,
  }).nullable(),
  // A self-declared digest is not an immutable evidence-store readback.
  replayCandidate: z.strictObject({
    evidenceId: z.string().regex(/^EVD-[a-f0-9]{64}$/),
    sourceCommit: z.string().regex(/^[a-f0-9]{40}$/),
    rawInputReference: id,
  }).nullable(),
});
export type CapBp001AdmissionProbe = z.infer<typeof CapBp001AdmissionProbeSchema>;

export interface CapBp001AdmissionReview {
  schemaVersion: 'CAP_BP_001_ADMISSION_REVIEW@1';
  blueprintId: 'CAP-BP-001';
  componentId: 'market_integrity_gate';
  calculationVersion: string;
  lifecycle: 'blocked';
  state: 'BLOCKED';
  reasonCodes: string[];
  unresolvedContractNames: string[];
  registryReasonCodes: string[];
  rightsCandidateConsistent: boolean;
  pitCandidateConsistent: boolean;
  immutableReplayVerified: false;
  scoreEligible: false;
  rankEligible: false;
  decisionEligible: false;
  productionEligible: false;
  publishable: false;
}

function report(candidateReasons: string[], rightsConsistent = false, pitConsistent = false): CapBp001AdmissionReview {
  // Derive existing blockers from the single canonical registry validator.
  // Descriptive contract names must not be resolved by the synthetic blueprint.
  const validation = validateAnalysisComponentRegistry();
  const issues = validation.issues.filter(i => i.componentId === canonical.componentId);
  const unresolvedContracts = [...new Set(issues
    .filter(i => i.code === 'CONTRACT_REFERENCE_UNRESOLVED')
    .map(i => i.reference))].sort();
  const registryReasons = componentActivationReasons(canonical.componentId).sort();
  const reasons = [...new Set([...candidateReasons, ...registryReasons])].sort();
  if (canonical.status !== 'blocked' || canonical.provenanceMode !== 'unavailable') {
    reasons.push('CAP_BP_001_REGISTRY_LIFECYCLE_CHANGED_REVIEW_REQUIRED');
    reasons.sort();
  }
  return Object.freeze({
    schemaVersion: 'CAP_BP_001_ADMISSION_REVIEW@1',
    blueprintId: 'CAP-BP-001',
    componentId: 'market_integrity_gate',
    calculationVersion: canonical.calculationVersion,
    lifecycle: 'blocked',
    state: 'BLOCKED',
    reasonCodes: reasons,
    unresolvedContractNames: unresolvedContracts,
    registryReasonCodes: registryReasons,
    rightsCandidateConsistent: rightsConsistent,
    pitCandidateConsistent: pitConsistent,
    immutableReplayVerified: false,
    scoreEligible: false,
    rankEligible: false,
    decisionEligible: false,
    productionEligible: false,
    publishable: false,
  });
}

/**
 * Checks a proposed rights/PIT/replay evidence bundle against existing
 * authorities. Passing candidate-format checks never activates CAP-BP-001.
 * No network, filesystem, database, secrets or provider API calls.
 */
export function inspectCapBp001Admission(raw: unknown): CapBp001AdmissionReview {
  const parsed = CapBp001AdmissionProbeSchema.safeParse(raw);
  if (!parsed.success) return report(['CAP_BP_001_ADMISSION_INPUT_INVALID']);

  const i = parsed.data;
  const reasons: string[] = [];
  const p = i.provenance;
  const asset = i.asset;

  if (asset.status !== 'active') reasons.push('CAP_BP_001_ASSET_NOT_ACTIVE');
  if (!canonical.assetClassScope.includes(asset.assetClass))
    reasons.push('CAP_BP_001_ASSET_CLASS_NOT_IN_REGISTRY');
  if (i.providerId !== p.providerId || !canonical.providerDependencies.includes(i.providerId))
    reasons.push('CAP_BP_001_PROVIDER_ID_MISMATCH_OR_UNREGISTERED');
  if (i.providerDataset !== p.providerDataset)
    reasons.push('CAP_BP_001_PROVIDER_DATASET_MISMATCH');
  if (p.isDemo || p.isDelayed || !['public_realtime', 'commercial_redistribution'].includes(p.licenseScope))
    reasons.push('CAP_BP_001_PROVENANCE_MODE_NOT_REALTIME');

  // For the instrument's historical decision, publication and availability
  // must not be inferred from a later replay or later rights review.
  const validClock = i.decisionAt <= i.evaluatedAt &&
    p.observedAt <= p.receivedAt &&
    p.receivedAt <= p.publishedAt &&
    p.publishedAt <= i.decisionAt &&
    p.latencyMs === p.receivedAt - p.observedAt &&
    i.decisionAt - p.observedAt <= canonical.refreshPolicy.maxStalenessSeconds * 1000;
  if (!validClock) reasons.push('CAP_BP_001_PIT_PROVENANCE_INVALID_OR_STALE');
  let pitConsistent = validClock;
  if (!i.pointInTime) {
    reasons.push('CAP_BP_001_PIT_AVAILABILITY_EVIDENCE_MISSING');
    pitConsistent = false;
  } else {
    const v = i.pointInTime;
    if (v.availableAt > i.decisionAt || v.availableAt > v.retrievedAt ||
        v.retrievedAt > i.evaluatedAt || v.availableAt < p.observedAt) {
      reasons.push('CAP_BP_001_PIT_LOOKAHEAD_OR_VINTAGE_ORDER_INVALID');
      pitConsistent = false;
    }
    // A supplied release reference cannot independently authenticate
    // when the upstream feed was available.
    reasons.push('CAP_BP_001_PIT_RELEASE_AUTHENTICITY_NOT_PROVEN');
  }

  let rightsConsistent = true;
  if (!i.rights) {
    reasons.push('CAP_BP_001_PROVIDER_RIGHTS_EVIDENCE_MISSING');
    rightsConsistent = false;
  } else {
    const rights = i.rights;
    const feed = i.providerDataset + ':' + asset.symbol + ':' + asset.venue;
    if (rights.providerId !== p.providerId || !rights.feedsSymbolsAndVenues?.includes(feed)) {
      reasons.push('CAP_BP_001_PROVIDER_FEED_RIGHTS_SCOPE_MISMATCH');
      rightsConsistent = false;
    }
    if (!rights.reviewedAt || Date.parse(rights.reviewedAt) > i.decisionAt) {
      reasons.push('CAP_BP_001_RIGHTS_NOT_REVIEWED_AT_DECISION');
      rightsConsistent = false;
    }
    const rightsAssessment = evaluateMarketDataRights(rights,
      ['internal_analysis', 'derived_scoring_research', 'cache_retention'],
      new Date(i.evaluatedAt));
    if (!rightsAssessment.eligible || rightsAssessment.obligations.length) {
      reasons.push('CAP_BP_001_RIGHTS_NOT_ADMITTED_FOR_REPLAY');
      rightsConsistent = false;
    }
    // Even a syntactically admissible supplied contract is not a verified
    // independent source; the inventory remains the authoritative review.
    reasons.push('CAP_BP_001_EXTERNAL_PROVIDER_RIGHTS_NOT_PROVEN');
  }

  // Existing shadow replay is a separate, non-production service and is
  // not bound to canonical CAP-BP-001 RawTick/ExchangeStatus contracts.
  reasons.push(i.replayCandidate
    ? 'CAP_BP_001_REPLAY_RECEIPT_NOT_INDEPENDENTLY_VERIFIED'
    : 'CAP_BP_001_IMMUTABLE_REPLAY_EVIDENCE_MISSING');

  return report(reasons, rightsConsistent, pitConsistent);
}
