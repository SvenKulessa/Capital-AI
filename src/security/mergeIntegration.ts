import { evaluateMergeEligibility, SHA_40_PATTERN, type CheckRunEvidence, type MergeDecision } from './mergePolicy.ts';

const OWNER = 'SvenKulessa' as const;
const REPO = 'Capital-AI' as const;
export const REQUIRED_MERGE_CHECKS = ['Docker Security Gate', 'Domain Governance'] as const;

export type PullRequestSnapshot = {
  number: number; state: 'open' | 'closed'; draft: boolean; merged: boolean;
  headSha: string; baseSha: string; mergeable: boolean | null;
};
export type MergeRequest = { owner: typeof OWNER; repo: typeof REPO; pullNumber: number; mergeMethod: 'squash'; expectedHeadSha: string };
export interface GitHubMergePort {
  readPullRequest(input: { owner: typeof OWNER; repo: typeof REPO; pullNumber: number }): Promise<PullRequestSnapshot>;
  readChecks(input: { owner: typeof OWNER; repo: typeof REPO; pullNumber: number; headSha: string }): Promise<readonly CheckRunEvidence[]>;
  mergePullRequest(input: MergeRequest): Promise<{ merged: boolean; sha?: string; message?: string }>;
}
export type MergeIntegrationResult = MergeDecision |
  { state: 'MERGED'; headSha: string; baseSha: string; mergeCommitSha: string } |
  { state: 'REVALIDATE'; reason: 'HEAD_CHANGED_DURING_MERGE'; expectedHeadSha: string } |
  { state: 'BLOCKED'; reason: 'PULL_REQUEST_NOT_MERGEABLE' | 'INVALID_PULL_REQUEST_SNAPSHOT' | 'MERGE_NOT_CONFIRMED' | 'MERGE_PROVIDER_FAILURE'; providerStatus?: number };

function validSnapshot(v: PullRequestSnapshot, n: number): boolean {
  return v.number === n && Number.isSafeInteger(v.number) && v.number > 0 &&
    (v.state === 'open' || v.state === 'closed') && typeof v.draft === 'boolean' && typeof v.merged === 'boolean' &&
    SHA_40_PATTERN.test(v.headSha) && SHA_40_PATTERN.test(v.baseSha) &&
    (v.mergeable === true || v.mergeable === false || v.mergeable === null);
}
function ready(v: PullRequestSnapshot): boolean {
  return v.state === 'open' && !v.draft && !v.merged && v.mergeable === true;
}
function errorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error)) return undefined;
  const status = (error as { status?: unknown }).status;
  return Number.isInteger(status) && Number(status) >= 100 ? Number(status) : undefined;
}

export async function validateAndMerge(github: GitHubMergePort, pullNumber: number): Promise<MergeIntegrationResult> {
  if (!Number.isSafeInteger(pullNumber) || pullNumber <= 0) return { state: 'BLOCKED', reason: 'INVALID_PULL_NUMBER' };
  const coordinates = { owner: OWNER, repo: REPO, pullNumber } as const;
  const initial = await github.readPullRequest(coordinates);
  if (!validSnapshot(initial, pullNumber)) return { state: 'BLOCKED', reason: 'INVALID_PULL_REQUEST_SNAPSHOT' };
  if (!ready(initial)) return { state: 'BLOCKED', reason: 'PULL_REQUEST_NOT_MERGEABLE' };

  const checks = await github.readChecks({ ...coordinates, headSha: initial.headSha });
  const current = await github.readPullRequest(coordinates);
  if (!validSnapshot(current, pullNumber)) return { state: 'BLOCKED', reason: 'INVALID_PULL_REQUEST_SNAPSHOT' };
  if (!ready(current)) return { state: 'BLOCKED', reason: 'PULL_REQUEST_NOT_MERGEABLE' };

  const decision = evaluateMergeEligibility({
    repository: `${OWNER}/${REPO}`, pullNumber, draft: current.draft,
    validatedHeadSha: initial.headSha, currentHeadSha: current.headSha,
    validatedBaseSha: initial.baseSha, currentBaseSha: current.baseSha,
    title: '', body: '', comments: [], requiredChecks: REQUIRED_MERGE_CHECKS, checks,
  });
  if (decision.state !== 'MERGE_ELIGIBLE') return decision;

  try {
    const result = await github.mergePullRequest({ ...coordinates, mergeMethod: 'squash', expectedHeadSha: decision.expectedHeadSha });
    if (result.merged !== true || typeof result.sha !== 'string' || !SHA_40_PATTERN.test(result.sha))
      return { state: 'BLOCKED', reason: 'MERGE_NOT_CONFIRMED' };
    return { state: 'MERGED', headSha: decision.expectedHeadSha, baseSha: initial.baseSha, mergeCommitSha: result.sha };
  } catch (error: unknown) {
    const status = errorStatus(error);
    if (status === 409) return { state: 'REVALIDATE', reason: 'HEAD_CHANGED_DURING_MERGE', expectedHeadSha: decision.expectedHeadSha };
    return { state: 'BLOCKED', reason: 'MERGE_PROVIDER_FAILURE', ...(status === undefined ? {} : { providerStatus: status }) };
  }
}
