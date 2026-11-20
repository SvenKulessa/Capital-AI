export const EXPECTED_REPOSITORY = 'SvenKulessa/Capital-AI' as const;
export const SHA_40_PATTERN = /^[a-f0-9]{40}$/;

export type CheckRunEvidence = {
  name: string;
  headSha: string;
  status: string;
  conclusion: string | null;
};

export type MergeEvaluationInput = {
  repository: string;
  pullNumber: number;
  draft: boolean;
  validatedHeadSha: string;
  currentHeadSha: string;
  validatedBaseSha: string;
  currentBaseSha: string;
  title: string;
  body: string;
  comments: readonly string[];
  requiredChecks: readonly string[];
  checks: readonly CheckRunEvidence[];
};

export type MergeDecision =
  | { state: 'MERGE_ELIGIBLE'; reason: 'ALL_REQUIRED_EVIDENCE_VALID'; expectedHeadSha: string }
  | { state: 'WAIT'; reason: 'REQUIRED_CHECK_PENDING'; check: string }
  | { state: 'REVALIDATE'; reason: 'HEAD_CHANGED'; expectedHeadSha: string; actualHeadSha: string }
  | { state: 'REVALIDATE'; reason: 'BASE_CHANGED'; expectedBaseSha: string; actualBaseSha: string }
  | { state: 'BLOCKED'; reason: string; check?: string; conclusion?: string };

const FAILURE_CONCLUSIONS = new Set([
  'failure', 'cancelled', 'timed_out', 'action_required', 'stale', 'startup_failure',
  'neutral', 'skipped',
]);
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;

function validSha(value: unknown): value is string {
  return typeof value === 'string' && SHA_40_PATTERN.test(value);
}

function validCheckPolicy(names: readonly string[]): boolean {
  if (!Array.isArray(names) || names.length === 0) return false;
  const seen = new Set<string>();
  for (const name of names) {
    if (typeof name !== 'string' || name.length === 0 || name.length > 200 ||
        name !== name.trim() || CONTROL.test(name) || seen.has(name)) return false;
    seen.add(name);
  }
  return true;
}

export function evaluateMergeEligibility(input: MergeEvaluationInput): MergeDecision {
  // title/body/comments are deliberately never read: repository prose is untrusted data.
  if (input.repository !== EXPECTED_REPOSITORY) return { state: 'BLOCKED', reason: 'REPOSITORY_MISMATCH' };
  if (!Number.isSafeInteger(input.pullNumber) || input.pullNumber <= 0)
    return { state: 'BLOCKED', reason: 'INVALID_PULL_NUMBER' };
  if (!validSha(input.validatedHeadSha) || !validSha(input.currentHeadSha))
    return { state: 'BLOCKED', reason: 'INVALID_HEAD_SHA' };
  if (!validSha(input.validatedBaseSha) || !validSha(input.currentBaseSha))
    return { state: 'BLOCKED', reason: 'INVALID_BASE_SHA' };
  if (input.draft) return { state: 'BLOCKED', reason: 'PULL_REQUEST_IS_DRAFT' };
  if (input.currentHeadSha !== input.validatedHeadSha)
    return { state: 'REVALIDATE', reason: 'HEAD_CHANGED', expectedHeadSha: input.validatedHeadSha, actualHeadSha: input.currentHeadSha };
  if (input.currentBaseSha !== input.validatedBaseSha)
    return { state: 'REVALIDATE', reason: 'BASE_CHANGED', expectedBaseSha: input.validatedBaseSha, actualBaseSha: input.currentBaseSha };
  if (!validCheckPolicy(input.requiredChecks)) return { state: 'BLOCKED', reason: 'INVALID_REQUIRED_CHECK_POLICY' };
  if (!Array.isArray(input.checks)) return { state: 'BLOCKED', reason: 'REQUIRED_CHECK_MISSING', check: input.requiredChecks[0] };

  for (const name of input.requiredChecks) {
    // Exact identity only: no trim/case-fold/Unicode normalization/fuzzy matching.
    const matches = input.checks.filter(check => check.name === name);
    if (matches.length === 0) return { state: 'BLOCKED', reason: 'REQUIRED_CHECK_MISSING', check: name };
    if (matches.length !== 1) return { state: 'BLOCKED', reason: 'AMBIGUOUS_CHECK_EVIDENCE', check: name };
    const check = matches[0];
    if (!validSha(check.headSha) || check.headSha !== input.validatedHeadSha)
      return { state: 'BLOCKED', reason: 'CHECK_HEAD_MISMATCH', check: name };
    if (check.status === 'queued' || check.status === 'in_progress') {
      if (check.conclusion !== null) return { state: 'BLOCKED', reason: 'AMBIGUOUS_CHECK_EVIDENCE', check: name };
      return { state: 'WAIT', reason: 'REQUIRED_CHECK_PENDING', check: name };
    }
    if (check.status !== 'completed') return { state: 'BLOCKED', reason: 'UNKNOWN_CHECK_STATUS', check: name };
    if (check.conclusion === 'success') continue;
    if (typeof check.conclusion === 'string' && FAILURE_CONCLUSIONS.has(check.conclusion))
      return { state: 'BLOCKED', reason: 'REQUIRED_CHECK_FAILED', check: name, conclusion: check.conclusion };
    return { state: 'BLOCKED', reason: 'UNKNOWN_CHECK_CONCLUSION', check: name,
      ...(typeof check.conclusion === 'string' ? { conclusion: check.conclusion } : {}) };
  }

  return { state: 'MERGE_ELIGIBLE', reason: 'ALL_REQUIRED_EVIDENCE_VALID', expectedHeadSha: input.validatedHeadSha };
}
