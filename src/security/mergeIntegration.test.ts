import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { REQUIRED_MERGE_CHECKS, validateAndMerge, type GitHubMergePort, type PullRequestSnapshot, type MergeRequest } from './mergeIntegration.ts';
import type { CheckRunEvidence } from './mergePolicy.ts';

const HEAD='a'.repeat(40), BASE='b'.repeat(40), MERGE='e'.repeat(40);
function pull(o: Partial<PullRequestSnapshot> = {}): PullRequestSnapshot {
  return { number: 868, state: 'open', draft: false, merged: false, headSha: HEAD, baseSha: BASE, mergeable: true, ...o };
}
function checks(headSha=HEAD): readonly CheckRunEvidence[] {
  return REQUIRED_MERGE_CHECKS.map(name => ({ name, headSha, status: 'completed', conclusion: 'success' }));
}
function fake(reads: PullRequestSnapshot[], options: { checks?: readonly CheckRunEvidence[]; error?: Error & {status?: number}; result?: {merged:boolean;sha?:string} } = {}) {
  const mergeCalls: MergeRequest[] = [];
  const port: GitHubMergePort = {
    async readPullRequest() { const v = reads.shift(); if (!v) throw Error('unexpected read'); return v; },
    async readChecks() { return options.checks ?? checks(); },
    async mergePullRequest(input) { mergeCalls.push(input); if (options.error) throw options.error; return options.result ?? { merged: true, sha: MERGE }; },
  };
  return { port, mergeCalls };
}

describe('merge integration TOCTOU safety', () => {
  test('pins validated HEAD into atomic merge precondition', async () => {
    const h = fake([pull(), pull()]);
    assert.deepEqual(await validateAndMerge(h.port, 868), { state: 'MERGED', headSha: HEAD, baseSha: BASE, mergeCommitSha: MERGE });
    assert.equal(h.mergeCalls[0].expectedHeadSha, HEAD);
  });

  test('does not merge after HEAD changes', async () => {
    const other='c'.repeat(40), h=fake([pull(), pull({headSha:other})]);
    assert.deepEqual(await validateAndMerge(h.port,868), {state:'REVALIDATE',reason:'HEAD_CHANGED',expectedHeadSha:HEAD,actualHeadSha:other});
    assert.equal(h.mergeCalls.length,0);
  });

  test('does not merge after base changes', async () => {
    const other='d'.repeat(40), h=fake([pull(), pull({baseSha:other})]);
    assert.deepEqual(await validateAndMerge(h.port,868), {state:'REVALIDATE',reason:'BASE_CHANGED',expectedBaseSha:BASE,actualBaseSha:other});
    assert.equal(h.mergeCalls.length,0);
  });

  test('draft transition blocks after check read', async () => {
    const h=fake([pull(),pull({draft:true})]);
    assert.deepEqual(await validateAndMerge(h.port,868), {state:'BLOCKED',reason:'PULL_REQUEST_NOT_MERGEABLE'});
    assert.equal(h.mergeCalls.length,0);
  });

  test('provider HEAD conflict requires revalidation and is not retried', async () => {
    const error=Object.assign(Error('head changed'),{status:409}), h=fake([pull(),pull()],{error});
    assert.deepEqual(await validateAndMerge(h.port,868), {state:'REVALIDATE',reason:'HEAD_CHANGED_DURING_MERGE',expectedHeadSha:HEAD});
    assert.equal(h.mergeCalls.length,1);
  });

  test('unconfirmed merge response fails closed', async () => {
    const h=fake([pull(),pull()],{result:{merged:false}});
    assert.deepEqual(await validateAndMerge(h.port,868), {state:'BLOCKED',reason:'MERGE_NOT_CONFIRMED'});
  });

  test('provider error text is not exposed', async () => {
    const error=Object.assign(Error('secret diagnostic'),{status:503}), h=fake([pull(),pull()],{error});
    const result=await validateAndMerge(h.port,868);
    assert.deepEqual(result,{state:'BLOCKED',reason:'MERGE_PROVIDER_FAILURE',providerStatus:503});
    assert.doesNotMatch(JSON.stringify(result),/secret diagnostic/);
  });
});
