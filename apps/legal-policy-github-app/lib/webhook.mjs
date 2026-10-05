import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createAppJwt, createInstallationToken, getMarketplaceSubscription, githubJson } from './github.mjs';
import { entitlementForSubscription } from './entitlements.mjs';
import { evaluateDependencyDiff, evaluateSpdxSbom, sbomBindsToSource } from './scanner.mjs';
import { generateAndFetchAsyncSbom } from './sbom.mjs';
import { deleteAccountEvidence, deleteExpiredEvidence, deleteInstallationEvidence, persistEvidence } from './evidence-store.mjs';

const communityPolicy = JSON.parse(await readFile(new URL('../../../packages/legal-policy-core/community-policy.json', import.meta.url), 'utf8'));
const FALLBACK_STATUSES = new Set([403, 404, 500, 503]);

export function verifyWebhookSignature(rawBody, signatureHeader, secret) {
  if (!secret || !signatureHeader?.startsWith('sha256=')) return false;
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && timingSafeEqual(a, b);
}

function checkConclusion(decision, enforce) {
  if (!enforce) return 'neutral';
  return decision === 'ALLOW' ? 'success' : 'action_required';
}

function unavailableResult({repository, sourceSha, reason}) {
  return {
    schemaVersion: 1,
    policyId: communityPolicy.policyId,
    subject: repository,
    sourceSha,
    evaluatedAt: new Date().toISOString(),
    releaseDecision: 'LEGAL_REVIEW_REQUIRED',
    decisionEligible: false,
    counts: {ALLOW:0, ALLOW_WITH_OBLIGATIONS:0, LEGAL_REVIEW_REQUIRED:0, BLOCKED:0},
    components: [],
    evidenceReasons: [reason],
  };
}

function effectiveGateDecision(result, {sourceBound, evidenceHistoryRequired, evidencePersisted}) {
  if (result.releaseDecision === 'BLOCKED') return 'BLOCKED';
  if (!sourceBound) return 'LEGAL_REVIEW_REQUIRED';
  if (evidenceHistoryRequired && !evidencePersisted) return 'LEGAL_REVIEW_REQUIRED';
  return result.releaseDecision;
}

function checkSummary(result, entitlement, evidence) {
  const lines = [
    `Plan: ${entitlement.plan}`,
    `Policy decision: ${result.releaseDecision}`,
    `Gate decision: ${evidence.gateDecision}`,
    `Evidence source: ${evidence.source}`,
    `Source SHA bound: ${evidence.sourceBound ? 'yes' : 'no'}`,
    `Components: ${result.components.length}`,
    `Allow: ${result.counts.ALLOW}`,
    `Allow with obligations: ${result.counts.ALLOW_WITH_OBLIGATIONS}`,
    `Legal review required: ${result.counts.LEGAL_REVIEW_REQUIRED}`,
    `Blocked: ${result.counts.BLOCKED}`,
  ];
  if (evidence.fallbackReason) lines.push(`Fallback reason: ${evidence.fallbackReason}`);
  if (evidence.historyRequired) lines.push(`Evidence history: ${evidence.persisted ? 'persisted' : 'unavailable (fail-closed)'}`);
  if (evidence.persistenceError) lines.push(`Evidence persistence error: ${evidence.persistenceError}`);
  for (const reason of result.evidenceReasons ?? []) lines.push(`Evidence note: ${reason}`);
  if (!entitlement.capabilities.obligationReport) lines.push('Upgrade to Pro to receive detailed obligation reports.');
  if (!entitlement.capabilities.prGate) lines.push('Team/Enterprise can enforce this result as a PR gate.');
  return lines.join('\n');
}

async function optionalRepositoryConfig({ owner, repo, ref, token, fetchImpl }) {
  try {
    const result = await githubJson(`/repos/${owner}/${repo}/contents/.legal-policy.json?ref=${encodeURIComponent(ref)}`, {token, fetchImpl});
    if (!result?.content) return {};
    return JSON.parse(Buffer.from(result.content.replace(/\n/g, ''), 'base64').toString('utf8'));
  } catch (error) {
    if (error.status === 404) return {};
    throw error;
  }
}

async function collectLegalEvidence({owner, repo, repository, base, head, installationToken, repositoryConfig, env, fetchImpl}) {
  try {
    const dependencies = await githubJson(`/repos/${owner}/${repo}/dependency-graph/compare/${base}...${head}`, {token: installationToken, fetchImpl});
    return {
      result: evaluateDependencyDiff({dependencies, repository: repository.full_name, sourceSha: head, repositoryConfig}, communityPolicy),
      source: 'GITHUB_DEPENDENCY_REVIEW',
      sourceBound: true,
      fallbackReason: null,
    };
  } catch (dependencyError) {
    if (!FALLBACK_STATUSES.has(dependencyError.status)) throw dependencyError;
    const fallbackReason = `Dependency Review unavailable (${dependencyError.status}); asynchronous GitHub SBOM fallback attempted.`;
    try {
      const generated = await generateAndFetchAsyncSbom({
        owner,
        repo,
        token: installationToken,
        fetchImpl,
        attempts: env.LEGAL_POLICY_SBOM_POLL_ATTEMPTS,
        pollDelayMs: env.LEGAL_POLICY_SBOM_POLL_DELAY_MS,
      });
      if (generated.status !== 'ready') {
        return {
          result: unavailableResult({repository:repository.full_name, sourceSha:head, reason:'Asynchronous GitHub SBOM is still processing; no release allow decision is possible.'}),
          source: 'GITHUB_ASYNC_SBOM_PENDING',
          sourceBound: false,
          fallbackReason,
        };
      }
      const sourceBound = sbomBindsToSource(generated.sbom, head);
      const result = evaluateSpdxSbom({sbom:generated.sbom, repository:repository.full_name, sourceSha:head, repositoryConfig}, communityPolicy);
      if (!sourceBound) {
        result.evidenceReasons = ['The asynchronous repository SBOM is not cryptographically or structurally bound to the pull-request head SHA; the PR gate remains fail-closed.'];
      }
      return {result, source:'GITHUB_ASYNC_SBOM', sourceBound, fallbackReason};
    } catch (sbomError) {
      return {
        result: unavailableResult({repository:repository.full_name, sourceSha:head, reason:`Asynchronous GitHub SBOM fallback failed (${sbomError.status ?? 'error'}); no release allow decision is possible.`}),
        source: 'GITHUB_ASYNC_SBOM_UNAVAILABLE',
        sourceBound: false,
        fallbackReason,
      };
    }
  }
}

export async function handlePullRequest(payload, env, fetchImpl = fetch) {
  const installationId = payload.installation?.id;
  const repository = payload.repository;
  const pullRequest = payload.pull_request;
  if (!installationId || !repository || !pullRequest) throw new Error('Incomplete pull_request webhook');

  const appJwt = createAppJwt({appId: env.LEGAL_POLICY_GITHUB_APP_ID, privateKey: env.LEGAL_POLICY_GITHUB_PRIVATE_KEY});
  const installationToken = await createInstallationToken({installationId, appJwt, fetchImpl});
  const accountId = repository.owner?.id;
  const subscription = accountId ? await getMarketplaceSubscription({accountId, appJwt, fetchImpl}) : null;
  const entitlement = entitlementForSubscription(subscription);

  const owner = repository.owner.login;
  const repo = repository.name;
  const base = pullRequest.base.sha;
  const head = pullRequest.head.sha;
  const repositoryConfig = await optionalRepositoryConfig({owner, repo, ref: head, token: installationToken, fetchImpl});
  const collected = await collectLegalEvidence({owner, repo, repository, base, head, installationToken, repositoryConfig, env, fetchImpl});

  const evidence = {
    source: collected.source,
    sourceBound: collected.sourceBound,
    fallbackReason: collected.fallbackReason,
    historyRequired: entitlement.capabilities.evidenceHistory,
    persisted: false,
    persistenceError: null,
    gateDecision: collected.result.releaseDecision,
  };

  if (evidence.historyRequired) {
    try {
      await deleteExpiredEvidence({env, fetchImpl});
      const persistence = await persistEvidence({
        result: collected.result,
        gateDecision: effectiveGateDecision(collected.result, {sourceBound:collected.sourceBound, evidenceHistoryRequired:false, evidencePersisted:false}),
        entitlement,
        installationId,
        accountId,
        repository: repository.full_name,
        repositoryId: repository.id,
        sourceSha: head,
        evidenceSource: collected.source,
        sourceBound: collected.sourceBound,
        env,
      }, fetchImpl);
      evidence.persisted = persistence.persisted;
    } catch (error) {
      evidence.persistenceError = error.message;
    }
  }

  evidence.gateDecision = effectiveGateDecision(collected.result, {
    sourceBound: collected.sourceBound,
    evidenceHistoryRequired: evidence.historyRequired,
    evidencePersisted: evidence.persisted,
  });

  const enforce = entitlement.capabilities.prGate;
  await githubJson(`/repos/${owner}/${repo}/check-runs`, {
    token: installationToken,
    method: 'POST',
    fetchImpl,
    body: {
      name: 'LEGAL_POLICY',
      head_sha: head,
      status: 'completed',
      conclusion: checkConclusion(evidence.gateDecision, enforce),
      output: {
        title: `LEGAL_POLICY: ${evidence.gateDecision}`,
        summary: checkSummary(collected.result, entitlement, evidence),
      },
    },
  });

  return {result:collected.result, entitlement, evidence};
}

export async function handleGitHubEvent({ eventName, payload, env, fetchImpl = fetch }) {
  if (eventName === 'installation' && payload.action === 'deleted') {
    const installationId = payload.installation?.id;
    if (!installationId) throw new Error('Missing installation id for deletion event');
    const deletion = await deleteInstallationEvidence({installationId, env, fetchImpl});
    return {accepted:true, action:'deleted', evidenceDeletion:deletion};
  }
  if (eventName === 'marketplace_purchase') {
    const accountId = payload.marketplace_purchase?.account?.id ?? null;
    if (payload.action === 'cancelled') {
      if (!accountId) throw new Error('Missing account id for Marketplace cancellation');
      const deletion = await deleteAccountEvidence({accountId, env, fetchImpl});
      return {accepted:true, action:'cancelled', accountId, evidenceDeletion:deletion};
    }
    return {accepted:true, action:payload.action, accountId};
  }
  if (eventName === 'pull_request' && ['opened', 'reopened', 'synchronize'].includes(payload.action)) {
    return handlePullRequest(payload, env, fetchImpl);
  }
  return {accepted: true, ignored: true, eventName, action: payload.action ?? null};
}
