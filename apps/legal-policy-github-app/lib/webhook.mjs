import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createAppJwt, createInstallationToken, getMarketplaceSubscription, githubJson } from './github.mjs';
import { entitlementForSubscription } from './entitlements.mjs';
import { evaluateDependencyDiff } from './scanner.mjs';

const communityPolicy = JSON.parse(await readFile(new URL('../../../packages/legal-policy-core/community-policy.json', import.meta.url), 'utf8'));

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

function checkSummary(result, entitlement) {
  const lines = [
    `Plan: ${entitlement.plan}`,
    `Decision: ${result.releaseDecision}`,
    `Components: ${result.components.length}`,
    `Allow: ${result.counts.ALLOW}`,
    `Allow with obligations: ${result.counts.ALLOW_WITH_OBLIGATIONS}`,
    `Legal review required: ${result.counts.LEGAL_REVIEW_REQUIRED}`,
    `Blocked: ${result.counts.BLOCKED}`,
  ];
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
  const dependencies = await githubJson(`/repos/${owner}/${repo}/dependency-graph/compare/${base}...${head}`, {token: installationToken, fetchImpl});
  const repositoryConfig = await optionalRepositoryConfig({owner, repo, ref: head, token: installationToken, fetchImpl});
  const result = evaluateDependencyDiff({dependencies, repository: repository.full_name, sourceSha: head, repositoryConfig}, communityPolicy);

  const enforce = entitlement.capabilities.prGate;
  await githubJson(`/repos/${owner}/${repo}/check-runs`, {
    token: installationToken,
    method: 'POST',
    fetchImpl,
    body: {
      name: 'LEGAL_POLICY',
      head_sha: head,
      status: 'completed',
      conclusion: checkConclusion(result.releaseDecision, enforce),
      output: {
        title: `LEGAL_POLICY: ${result.releaseDecision}`,
        summary: checkSummary(result, entitlement),
      },
    },
  });

  return {result, entitlement};
}

export async function handleGitHubEvent({ eventName, payload, env, fetchImpl = fetch }) {
  if (eventName === 'marketplace_purchase') {
    return {accepted: true, action: payload.action, accountId: payload.marketplace_purchase?.account?.id ?? null};
  }
  if (eventName === 'pull_request' && ['opened', 'reopened', 'synchronize'].includes(payload.action)) {
    return handlePullRequest(payload, env, fetchImpl);
  }
  return {accepted: true, ignored: true, eventName, action: payload.action ?? null};
}
