#!/usr/bin/env node
// CAPITAL_AI_TEN_PR_GITHUB_EVIDENCE_COUNTER@1
// Bounded GET-only source evidence; no publishing, mutations, or inferred authorizations.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const REPO = 'SvenKulessa/Capital-AI';
const API = 'https://api.github.com/repos/' + REPO;
const SHA = /^[a-f0-9]{40}$/;
const DOMAIN = /^\[CAPITAL-AI-(PRODUCT|MARKET|PLATFORM|TRUST|GROWTH)\]/;
const CUTOFF = Date.parse('2026-11-21T00:00:00Z');
const AUTH_DATE = Date.parse('2026-11-20T00:00:00Z');
const REQUIRED = ['Docker Security Gate', 'Domain Governance'];
const safeDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v)) ? Date.parse(v) : null;
const validSha = v => typeof v === 'string' && SHA.test(v);

export function validateMilestone(app, registry) {
  const m = app?.tenPrEfficiencyMilestone;
  if (app?.skillRegistry !== '.agents/skills/registry.json' ||
      app?.authority?.source !== 'AGENTS.md' || app?.authority?.permissionExpansion !== false ||
      registry?.promptContracts?.application !== '.agents/app.prompt.json' ||
      m?.schema !== 'CAPITAL_AI_TEN_PR_EFFICIENCY_MILESTONE@1' ||
      m.sourcePr !== 852 || m.requiredVerifiedMerges !== 10 ||
      m.appliesAfter !== '2026-11-20 owner authorization; exact time is NOT_PROVEN' ||
      m.missingData !== 'NOT_PROVEN' || !m.excludedPullRequests?.includes(850) ||
      m.permissionExpansion !== false || m.createsScheduler !== false ||
      m.createsRequiredChecks !== false) throw Error('INVALID_MILESTONE_AUTHORITY');
  const domains = Object.keys(registry.promptContracts.domains ?? {});
  if (domains.length !== 5 || domains.some(d => !DOMAIN.test('[CAPITAL-AI-' + d + ']') ||
      registry.promptContracts.domains[d] !== 'CAPITAL-AI-' + d + '/domain.prompt.json' ||
      app.domainPrompts?.[d] !== registry.promptContracts.domains[d]))
    throw Error('INVALID_CANONICAL_DOMAIN_BINDING');
  return m;
}

async function githubRead(fetchImpl, path, token) {
  const route = /^\/(?:commits\/(?:main|[a-f0-9]{40})(?:\/check-runs\?per_page=100)?|pulls(?:\?state=closed&per_page=100&page=\d+&sort=updated&direction=desc|\/\d+)|compare\/[a-f0-9]{40}\.\.\.[a-f0-9]{40})$/;
  if (!route.test(path)) throw Error('UNSAFE_ROUTE');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  timer.unref?.();
  try {
    const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (token) headers.Authorization = 'Bearer ' + token;
    const response = await fetchImpl(API + path, { method: 'GET', redirect: 'error', cache: 'no-store', headers, signal: controller.signal });
    if (!response?.ok) throw Error('GITHUB_READ_FAILED');
    const limit = 2 * 1024 * 1024;
    const declared = Number(response.headers?.get?.('content-length'));
    if (Number.isFinite(declared) && declared > limit) throw Error('OVERSIZED_RESPONSE');
    const reader = response.body?.getReader?.();
    let raw = '', used = 0;
    if (reader) {
      const decoder = new TextDecoder();
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          used += part.value.byteLength;
          if (used > limit) throw Error('OVERSIZED_RESPONSE');
          raw += decoder.decode(part.value, { stream: true });
        }
        raw += decoder.decode();
      } finally { reader.releaseLock(); }
    } else {
      raw = await response.text();
      if (Buffer.byteLength(raw) > limit) throw Error('OVERSIZED_RESPONSE');
    }
    return JSON.parse(raw);
  } finally { clearTimeout(timer); }
}

export function verifyMilestoneMerge(item, detail, checks, ancestry, mainSha, excluded = [850]) {
  if (!Number.isSafeInteger(item?.number) || item.number < 1 || excluded.includes(item.number) ||
      detail?.number !== item.number || detail?.state !== 'closed' || detail?.merged !== true ||
      detail?.draft === true || item.draft === true || !validSha(mainSha)) return null;
  const created = safeDate(detail.created_at), merged = safeDate(detail.merged_at);
  const domain = typeof detail.title === 'string' ? DOMAIN.exec(detail.title)?.[1] : null;
  if (!domain || created === null || merged === null || merged <= created || merged < CUTOFF ||
      !validSha(detail.merge_commit_sha) || !validSha(detail.head?.sha) ||
      detail.merge_commit_sha !== item.merge_commit_sha || detail.head.sha !== item.head?.sha ||
      detail.title !== item.title) return null;
  if (!['ahead', 'identical'].includes(ancestry?.status) || ancestry.behind_by !== 0 ||
      ancestry.base_commit?.sha !== detail.merge_commit_sha ||
      ancestry.merge_base_commit?.sha !== detail.merge_commit_sha) return null;
  if (!Number.isSafeInteger(checks?.total_count) || checks.total_count > 100 ||
      !Array.isArray(checks.check_runs) || checks.check_runs.length !== checks.total_count) return null;
  const qualified = name => checks.check_runs.filter(c => c.name === name && c.head_sha === detail.head.sha &&
    c.status === 'completed' && c.conclusion === 'success' && Number.isSafeInteger(c.id) && c.id > 0);
  const passed = REQUIRED.map(qualified);
  const codeql = qualified('CodeQL');
  if (passed.some(rows => rows.length !== 1) || codeql.length !== 1) return null;
  return Object.freeze({
    prNumber: item.number, domain, createdAt: detail.created_at, mergedAt: detail.merged_at,
    mainMergeSha: detail.merge_commit_sha, testedHeadSha: detail.head.sha,
    requiredCheckRunIds: Object.fromEntries(REQUIRED.map((name, i) => [name, passed[i][0].id])),
    codeqlCheckId: codeql[0].id,
    evidenceUrls: [
      'https://github.com/' + REPO + '/pull/' + item.number,
      'https://github.com/' + REPO + '/commit/' + detail.merge_commit_sha,
      'https://github.com/' + REPO + '/commit/' + detail.head.sha,
    ],
  });
}

export async function collectTenPrEvidence({ fetchImpl = fetch, app, registry, token = '', now = Date.now } = {}) {
  const contract = validateMilestone(app, registry);
  const result = {
    schema: 'CAPITAL_AI_TEN_PR_GITHUB_EVIDENCE_COUNTER@1',
    repository: REPO, source: 'GITHUB_GET_ONLY',
    observedAt: new Date(now()).toISOString(), status: 'NOT_PROVEN',
    authorizationCutoff: '2026-11-21T00:00:00Z',
    cutoffReason: 'Owner authorization time on 2026-11-20 is NOT_PROVEN; same-day merges excluded',
    target: contract.requiredVerifiedMerges, verifiedCount: 0, verifiedMerges: [],
    excludedAuthorizationDay: 0, unverifiedCandidates: [], inventoryComplete: false,
    missingData: 'NOT_PROVEN', publishAuthorized: false,
  };
  try {
    const first = await githubRead(fetchImpl, '/commits/main', token);
    if (!validSha(first?.sha)) throw Error('MAIN_SHA_INVALID');
    result.mainSha = first.sha;
    const seen = new Set(), candidates = [];
    let complete = false;
    for (let page = 1; page <= 15; page++) {
      const batch = await githubRead(fetchImpl,
        '/pulls?state=closed&per_page=100&page=' + page + '&sort=updated&direction=desc', token);
      if (!Array.isArray(batch) || batch.length > 100) throw Error('PR_PAGE_INVALID');
      for (const item of batch) {
        if (!Number.isSafeInteger(item?.number) || item.number < 1 || item.state !== 'closed' ||
            seen.has(item.number)) throw Error('PR_INVENTORY_INCONSISTENT');
        seen.add(item.number);
        const merged = safeDate(item.merged_at);
        if (merged === null || !DOMAIN.test(item.title ?? '') ||
            contract.excludedPullRequests.includes(item.number)) continue;
        if (merged >= AUTH_DATE && merged < CUTOFF) result.excludedAuthorizationDay++;
        else if (merged >= CUTOFF) candidates.push(item);
      }
      if (batch.length < 100) { complete = true; break; }
    }
    if (!complete || candidates.length > 40) throw Error('INVENTORY_LIMIT_EXCEEDED');
    result.inventoryComplete = true;
    for (const item of candidates) {
      const detail = await githubRead(fetchImpl, '/pulls/' + item.number, token);
      const merged = detail?.merge_commit_sha, head = detail?.head?.sha;
      if (!validSha(merged) || !validSha(head)) {
        result.unverifiedCandidates.push({ prNumber: item.number, status: 'NOT_PROVEN' });
        continue;
      }
      const checks = await githubRead(fetchImpl, '/commits/' + head + '/check-runs?per_page=100', token);
      const compare = await githubRead(fetchImpl, '/compare/' + merged + '...' + first.sha, token);
      const evidence = verifyMilestoneMerge(item, detail, checks, compare, first.sha, contract.excludedPullRequests);
      if (evidence) result.verifiedMerges.push(evidence);
      else result.unverifiedCandidates.push({ prNumber: item.number, status: 'NOT_PROVEN' });
    }
    const second = await githubRead(fetchImpl, '/commits/main', token);
    if (second?.sha !== first.sha) throw Error('MAIN_MOVED');
    result.verifiedMerges.sort((a,b) => a.mergedAt.localeCompare(b.mergedAt) || a.prNumber-b.prNumber);
    result.verifiedCount = result.verifiedMerges.length;
    result.status = result.verifiedCount >= result.target ? 'VERIFIED_THRESHOLD' :
      result.unverifiedCandidates.length || result.excludedAuthorizationDay ? 'NOT_PROVEN_PARTIAL' : 'VERIFIED_COUNT_BELOW_TARGET';
  } catch {
    result.status = 'NOT_PROVEN';
    result.inventoryComplete = false;
    result.verifiedCount = 0;
    result.verifiedMerges = [];
    result.unverifiedCandidates = [];
  }
  return Object.freeze(result);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const app = JSON.parse(readFileSync(new URL('../.agents/app.prompt.json', import.meta.url), 'utf8'));
  const registry = JSON.parse(readFileSync(new URL('../.agents/skills/registry.json', import.meta.url), 'utf8'));
  const outcome = await collectTenPrEvidence({ app, registry, token: process.env.GITHUB_TOKEN || '' });
  console.log(JSON.stringify(outcome, null, 2));
  if (!outcome.inventoryComplete) process.exitCode = 2;
}
