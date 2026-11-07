import { ROADMAP_LINEAGE_SOURCE } from '../../shared/roadmap-source-lineage.mjs';

/**
 * Chat-to-main evidence is a pinned, scoped audit slice, not a live PR tracker.
 * Never promote historical source, CI or rights evidence to production VERIFIED.
 * Authority: AGENTS.md / SOLO_MAINTAINER_FLOW@1; tracking issue #598.
 */
export type DeltaEvidenceState = 'VERIFIED' | 'IN_PROGRESS' | 'BLOCKED' | 'NOT_PROVEN' | 'REVIEW_REQUIRED';

export type RoadmapDeltaItem = Readonly<{
  scopeId: string;
  roadmapId: string | null;
  title: string;
  sourceUrl: string;
  trackingUrl: string;
  code: DeltaEvidenceState;
  ci: DeltaEvidenceState;
  runtime: DeltaEvidenceState;
  rights: DeltaEvidenceState;
  nextStep: string;
}>;

/**
 * Immutable source-level audit snapshot from the first #598 review.
 * Historical evidence is retained, but never projected as current main.
 */
export const ROADMAP_DELTA_HISTORY = Object.freeze([
  Object.freeze({
    schema: 'CAPITAL_AI_CHAT_MAIN_DELTA@1',
    revision: 1,
    repository: 'SvenKulessa/Capital-AI',
    baselineMainSha: '2736bf98acff8ff19d789f70d44a04f3046f690f',
    reviewedDate: '2026-11-07',
    issue: 598,
    scope: 'FOUR_EVIDENCE_SLICES',
  }),
]);

export const ROADMAP_DELTA_BASELINE = Object.freeze({
  revision: 2,
  previousBaselineMainSha: ROADMAP_DELTA_HISTORY[0].baselineMainSha,
  supportingMergePr: 601,
  schema: 'CAPITAL_AI_CHAT_MAIN_DELTA@1',
  repository: 'SvenKulessa/Capital-AI',
  baselineMainSha: ROADMAP_LINEAGE_SOURCE.baselineMainSha,
  reviewedDate: '2026-11-07',
  issue: 598,
  // Deliberately scoped; not a claim to have re-reviewed the full roadmap inventory.
  scope: 'FOUR_EVIDENCE_SLICES',
} as const);

export const ROADMAP_DELTA_ITEMS: readonly RoadmapDeltaItem[] = Object.freeze([
  {
    scopeId: 'VOCAB-ARCHITECTURE',
    roadmapId: null,
    title: 'Architektur-Vokabular im Learning Hub',
    sourceUrl: 'https://github.com/SvenKulessa/Capital-AI/blob/6c2f695a79a739de4e0770140396b36b72ab26f7/shared/architecture-governance-vocabulary.mjs',
    trackingUrl: 'https://github.com/SvenKulessa/Capital-AI/issues/598',
    code: 'VERIFIED',
    ci: 'NOT_PROVEN',
    runtime: 'NOT_PROVEN',
    rights: 'NOT_PROVEN',
    nextStep: 'Buddy-Suche und Learning-Hub-Liveverhalten getrennt reproduzieren.',
  },
  {
    scopeId: 'PRIVATE-NOTES-OCC-V2',
    roadmapId: 'PRODUCTION-WEB-01-PRODUCT',
    title: 'JaJa / Private Notes OCC v2',
    sourceUrl: 'https://github.com/SvenKulessa/Capital-AI/pull/548',
    trackingUrl: 'https://github.com/SvenKulessa/Capital-AI/pull/548',
    code: 'IN_PROGRESS',
    ci: 'NOT_PROVEN',
    runtime: 'NOT_PROVEN',
    rights: 'REVIEW_REQUIRED',
    nextStep: 'PR #548 mit main synchronisieren; Restore, SQL-Cutover und Nutzerisolation belegen.',
  },
  {
    scopeId: 'BLUEPRINT-COMMERCE',
    roadmapId: 'CA-PRODUCT-BLUEPRINT-COMMERCE-EVIDENCE',
    title: 'Blueprint-Verkauf und Entitlements',
    sourceUrl: 'https://github.com/SvenKulessa/Capital-AI/blob/6c2f695a79a739de4e0770140396b36b72ab26f7/src/data/roadmapData.ts',
    trackingUrl: 'https://github.com/SvenKulessa/Capital-AI/issues/388',
    code: 'IN_PROGRESS',
    ci: 'NOT_PROVEN',
    runtime: 'NOT_PROVEN',
    rights: 'BLOCKED',
    nextStep: 'Lieferrechte, SKUs und Käufer-Entitlements vor einer Commerce-Freigabe nachweisen.',
  },
  {
    scopeId: 'SOCIAL-X-PILOT',
    roadmapId: 'CA-GROWTH-CONTENT-ENGINE',
    title: 'X-Kosten- und Veröffentlichungsgrenzen',
    sourceUrl: 'https://github.com/SvenKulessa/Capital-AI/pull/585',
    trackingUrl: 'https://github.com/SvenKulessa/Capital-AI/issues/388',
    code: 'IN_PROGRESS',
    ci: 'NOT_PROVEN',
    runtime: 'NOT_PROVEN',
    rights: 'REVIEW_REQUIRED',
    nextStep: 'PR #585 gegen main prüfen; API-Budget, Publishing-Consent und Receipt separat belegen.',
  },
]);

export type RoadmapDeltaLineageProof = Readonly<{
  schema: string;
  status: string;
  repository: string;
  baselineMainSha: string;
  observedMainSha: string;
  aheadCommits: number;
  protectedBlobs: readonly Readonly<{ path: string; sha: string }>[];
}>;

export type RoadmapDeltaRepositoryReadback = Readonly<{
  repository: string;
  sourceSha: string;
  freshness: 'LIVE' | 'CACHED' | 'STALE';
  roadmapLineage?: RoadmapDeltaLineageProof | null;
}>;

/**
 * Only an exact, fresh and correctly scoped main readback allows a pinned
 * source-level VERIFIED claim. A green PR or old digest is never a live pass.
 */
export function projectRoadmapDelta(
  readback: RoadmapDeltaRepositoryReadback | null,
): Readonly<{
  baseline: typeof ROADMAP_DELTA_BASELINE;
  mainMatched: boolean;
  lineageMatched: boolean;
  sourceMatched: boolean;
  observedMainSha: string | null;
  items: readonly RoadmapDeltaItem[];
}> {
  const validSha = typeof readback?.sourceSha === 'string' &&
    /^[0-9a-f]{40}$/.test(readback.sourceSha);
  const mainMatched = validSha &&
    readback?.repository === ROADMAP_DELTA_BASELINE.repository &&
    readback.freshness === 'LIVE' &&
    readback.sourceSha === ROADMAP_DELTA_BASELINE.baselineMainSha;
  // Server-authenticated GitHub compare + pinned blob evidence may preserve
  // *source* status across a fast-forward merge, never runtime or legal rights.
  const lineage = readback?.roadmapLineage;
  const lineageMatched = Boolean(validSha &&
    readback?.repository === ROADMAP_LINEAGE_SOURCE.repository &&
    readback.freshness === 'LIVE' &&
    lineage?.schema === ROADMAP_LINEAGE_SOURCE.schema &&
    lineage.status === 'SOURCE_UNCHANGED' &&
    lineage.repository === readback.repository &&
    lineage.baselineMainSha === ROADMAP_DELTA_BASELINE.baselineMainSha &&
    lineage.observedMainSha === readback.sourceSha &&
    Number.isInteger(lineage.aheadCommits) &&
    lineage.aheadCommits >= 1 && lineage.aheadCommits <= ROADMAP_LINEAGE_SOURCE.maxAheadCommits &&
    Array.isArray(lineage.protectedBlobs) &&
    lineage.protectedBlobs.length === ROADMAP_LINEAGE_SOURCE.protectedBlobs.length &&
    ROADMAP_LINEAGE_SOURCE.protectedBlobs.every(source =>
      lineage.protectedBlobs.some(blob => blob.path === source.path && blob.sha === source.sha)));
  const sourceMatched = mainMatched || lineageMatched;
  return {
    baseline: ROADMAP_DELTA_BASELINE,
    mainMatched,
    lineageMatched,
    sourceMatched,
    observedMainSha: validSha ? readback!.sourceSha : null,
    items: ROADMAP_DELTA_ITEMS.map(item => ({
      ...item,
      code: sourceMatched ? item.code : 'NOT_PROVEN',
      // CI, runtime and rights represent different authorities and never
      // inherit a code/source success.
    })),
  };
}
