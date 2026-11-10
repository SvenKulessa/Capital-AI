/**
 * Immutable, bounded Source provenance for the four-slice #598 roadmap.
 * Revision 3 source baseline: main@a34b4468 (PR #629); reviewed AP-SOC-02
 * status-only update changes the protected roadmapData.ts blob. Historical
 * revisions are preserved in src/data/roadmapDeltaReconciliation.ts.
 * Code evidence only: NOT a CI, deployment, runtime, tenancy or rights gate.
 * The owner catalog already reads GitHub main and its tree; no new polling.
 */
export const ROADMAP_LINEAGE_SOURCE = Object.freeze({
  schema: 'CAPITAL_AI_ROADMAP_SOURCE_LINEAGE@1',
  repository: 'SvenKulessa/Capital-AI',
  baselineMainSha: 'a34b4468da7568dc0f33537a4c0f9ef8ff3432e0',
  maxAheadCommits: 30,
  protectedBlobs: Object.freeze([
    Object.freeze({
      path: 'shared/architecture-governance-vocabulary.mjs',
      sha: '086dce314dc661a0e169667e7ebc1bd8ec3a1631',
    }),
    Object.freeze({
      path: 'src/data/roadmapData.ts',
      sha: '1c508ef6e23fc2c189189a9c733894450d88ef00',
    }),
  ]),
});

const SHA = /^[a-f0-9]{40}$/;

/**
 * An explicit GitHub compare response must demonstrate the original commit
 * is a real ancestor, and the current Git tree must preserve *both* reviewed
 * source blobs. Reject truncated, incomplete and unbound evidence.
 */
export function assessRoadmapSourceLineage({ compare, headSha, tree } = {}) {
  const spec = ROADMAP_LINEAGE_SOURCE;
  if (!SHA.test(headSha || '') || headSha === spec.baselineMainSha ||
      compare?.status !== 'ahead' || compare?.base_commit?.sha !== spec.baselineMainSha ||
      compare?.merge_base_commit?.sha !== spec.baselineMainSha ||
      compare?.ahead_by !== compare?.total_commits || !Number.isInteger(compare?.ahead_by) ||
      compare.ahead_by < 1 || compare.ahead_by > spec.maxAheadCommits ||
      compare.behind_by !== 0 || !Array.isArray(compare.commits) ||
      compare.commits.length !== compare.ahead_by ||
      compare.commits.at(-1)?.sha !== headSha || !Array.isArray(tree) ||
      compare.commits.some(commit => !SHA.test(commit?.sha || ''))) return null;

  const verifiedPaths = [];
  for (const source of spec.protectedBlobs) {
    const matches = tree.filter(item => item?.path === source.path);
    if (matches.length !== 1 || matches[0].type !== 'blob' || matches[0].sha !== source.sha) return null;
    verifiedPaths.push({ path: source.path, sha: source.sha });
  }
  return {
    schema: spec.schema,
    status: 'SOURCE_UNCHANGED',
    repository: spec.repository,
    baselineMainSha: spec.baselineMainSha,
    observedMainSha: headSha,
    aheadCommits: compare.ahead_by,
    protectedBlobs: verifiedPaths,
  };
}
