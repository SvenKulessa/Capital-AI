/**
 * Merge milestone automation, bound to the GitHub pull_request.closed/merged event.
 * Outputs a deterministic, source-linked reconciliation or DRAFT article.
 * No automatic publication, entitlement mutation, roadmap completion or merge.
 */
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { WORK_PACKAGES } from '../src/data/roadmapData.ts';
import { planContentCampaign } from '../src/contracts/contentEngine.ts';

export const ROADMAP_INTERVAL = 10;
export const NEWS_INTERVAL = 20;
const REPOSITORY = 'SvenKulessa/Capital-AI';
const API = 'https://api.github.com';
const SHA = /^[0-9a-f]{40}$/;

export function milestone(mergedPRs, interval) {
  const ordered = [...mergedPRs].filter(pr => pr.merged_at && Number.isSafeInteger(pr.number))
    .sort((a, b) => a.merged_at.localeCompare(b.merged_at) || a.number - b.number);
  const count = Math.floor(ordered.length / interval) * interval;
  return count === 0 ? null : { count, last: ordered[count - 1], batch: ordered.slice(count - interval, count) };
}

/** Stable UTC day of the merged PR ending a milestone batch; independent of a retry date. */
export function milestoneDay(mergedAt) {
  if (typeof mergedAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(mergedAt) ||
      !Number.isFinite(Date.parse(mergedAt))) {
    throw new Error('INVALID_MILESTONE_MERGED_AT');
  }
  return new Date(mergedAt).toISOString().slice(0, 10).replaceAll('-', '');
}

export function sanitizedTitle(value) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f<>]/g, ' ')
    .replace(/[\\\`*_{}\[\]#|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160) || 'Repository-Änderung';
}

export function sourcePath(ref) {
  return typeof ref === 'string' && ref.length < 250 &&
    !ref.includes('..') && !path.isAbsolute(ref) && /^[a-zA-Z0-9_./@ +()-]+$/.test(ref) ? ref : null;
}

async function githubJson(route) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) throw new Error('MILESTONE_MISSING_GITHUB_TOKEN');
  const response = await fetch(API + route, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error('GITHUB_READ_FAILED_' + response.status);
  return response.json();
}

export async function mergedPullRequests() {
  const result = [];
  for (let page = 1; page <= 50; page++) {
    const items = await githubJson('/repos/' + REPOSITORY + '/pulls?state=closed&per_page=100&page=' + page);
    if (!Array.isArray(items)) throw new Error('INVALID_GITHUB_PR_RESULT');
    result.push(...items.filter(pr => pr.merged_at));
    if (items.length < 100) return result;
  }
  throw new Error('MERGED_PR_PAGINATION_EXCEEDED');
}

const sha256 = value => createHash('sha256').update(value).digest('hex');
const iso = () => new Date().toISOString();
async function existsSafe(ref) {
  const safe = sourcePath(ref);
  if (!safe) return null;
  try {
    const data = await stat(path.resolve(process.cwd(), safe));
    return data.isFile();
  } catch { return false; }
}
async function checksum(ref) {
  const safe = sourcePath(ref);
  if (!safe || !(await existsSafe(safe))) return null;
  return sha256(await readFile(safe));
}
const output = async (file, data) => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2) + '\n');
};
const readCurrent = async file => JSON.parse(await readFile(file, 'utf8'));

export async function buildRoadmapRecord(info, sourceSha) {
  const checkedSources = [
    'src/data/roadmapData.ts', 'src/data/roadmapCurrentMainState.ts',
    'src/data/productionWebsiteWorkPackage.ts', 'src/data/socialContentRoadmap.ts',
    'src/data/trustArchitectureAWorkPackages.ts', 'src/components/RoadmapPanel.tsx',
  ];
  const sourceDigests = [];
  for (const file of checkedSources) {
    const digest = await checksum(file);
    if (!digest) throw new Error('ROADMAP_REQUIRED_SOURCE_UNAVAILABLE_' + file);
    sourceDigests.push({ path: file, sha256: digest });
  }
  const packages = [];
  for (const item of WORK_PACKAGES) {
    const present = [];
    const missing = [];
    const external = [];
    for (const ref of item.evidenceRefs) {
      if (typeof ref === 'string' && /^https:\/\//.test(ref)) { external.push(ref); continue; }
      if (await existsSafe(ref)) present.push(ref);
      else missing.push(String(ref).slice(0, 240));
    }
    packages.push({
      id: item.id, owner: item.owner, recordedState: item.evidenceState,
      evidencePathsPresent: present, evidencePathsMissing: missing,
      externalEvidenceNotVerified: external,
      effectiveState: missing.length || external.length ? 'NOT_PROVEN' : item.evidenceState,
    });
  }
  return {
    schema: 'CAPITAL_AI_ROADMAP_MERGE_AUDIT@1', state: 'RECONCILED_CODE_AND_DOCUMENTS',
    lastReconciledPr: info.last.number, mergeCount: info.count,
    fromPr: info.batch[0].number, toPr: info.last.number,
    sourceSha, reconciledAt: iso(), sourceDigests, packages,
    examined: packages.length,
    unproven: packages.filter(p => p.effectiveState === 'NOT_PROVEN').length,
    authority: 'SOURCE_AND_DOCUMENT_PRESENCE_ONLY',
    noAutomaticCompletionPromotion: true,
  };
}

export function draftBlog(info, sourceSha) {
  const lines = info.batch.map(pr => '- [PR #' + pr.number + '](https://github.com/' + REPOSITORY + '/pull/' + pr.number + '): ' + sanitizedTitle(pr.title));
  return [
    '# CAPITAL-AI: Repository-Updates bis PR #' + info.last.number,
    '',
    '> **Entwurf – nicht veröffentlicht.** Die Zusammenfassung basiert auf gemergten Pull Requests.',
    '> Eine erfolgreiche technische Zusammenführung beweist noch keinen produktiven Rollout.',
    '',
    '## Die Änderungen im Überblick',
    '',
    'Im aktuellen Entwicklungsabschnitt wurden 20 Pull Requests zusammengeführt. ' +
      'Die folgenden Änderungen sind anhand der zugehörigen GitHub-Diffs nachvollziehbar.',
    '',
    ...lines, '',
    '## Was sich daraus für die Plattform ergibt',
    '',
    'Die aufgeführten Änderungen werden anhand der verlinkten Pull Requests dokumentiert. ' +
      'Ob Funktionen bereits auf dem Webservice bereitstehen, ergibt sich ausschließlich aus separaten Deployment- und Runtime-Nachweisen.',
    '',
    '## Transparenz und nächste Schritte',
    '',
    'Die Veröffentlichung ist ein vorbereiteter Blogentwurf für die CONTENT Engine. ' +
      'Social-Media-Ausspielung, visuelle Medien und redaktionelle Freigabe sind nicht automatisch aktiviert.',
    '',
    'Quelle: [' + sourceSha.slice(0, 12) + '](https://github.com/' + REPOSITORY + '/commit/' + sourceSha + ')',
    '',
  ].join('\n');
}

export async function buildNewsRecord(info, sourceSha) {
  const brief = {
    campaignId: 'capital-ai-repository-pr-' + info.last.number,
    productId: 'capital-ai-web',
    sourceSha,
    canonicalUrl: 'https://capital-ai.online/',
    locale: 'de-DE',
    objective: 'Belegte Zusammenfassung der letzten 20 gemergten PRs als Blogentwurf.',
    audience: ['CAPITAL-AI Nutzer', 'Technische Interessierte'],
    channels: ['WEBSITE', 'LINKEDIN'],
    outputs: ['TEXT'],
    sourceUrls: info.batch.map(pr => 'https://github.com/' + REPOSITORY + '/pull/' + pr.number).slice(0, 12),
  };
  const plan = planContentCampaign(brief);
  if (plan.publication.publicPublishAllowed || plan.publication.adapter !== 'SOCIAL_MEDIA_ENGINE') {
    throw new Error('PUBLICATION_AUTHORITY_NOT_BLOCKED');
  }
  const article = draftBlog(info, sourceSha);
  return {
    schema: 'CAPITAL_AI_CONTROL_CENTER_NEWS@1',
    state: 'DRAFT_NOT_PUBLISHED',
    lastBatchPr: info.last.number,
    mergeCount: info.count,
    fromPr: info.batch[0].number,
    sourceSha, generatedAt: iso(),
    title: 'CAPITAL-AI: Repository-Updates bis PR #' + info.last.number,
    article,
    sourcePrs: info.batch.map(pr => ({ number: pr.number, url: 'https://github.com/' + REPOSITORY + '/pull/' + pr.number })),
    contentEnginePlan: plan,
    socialMediaEngine: { state: 'INTEGRATION_PENDING', published: false },
  };
}

async function main() {
  const mode = process.argv[2];
  if (!['roadmap', 'news'].includes(mode)) throw new Error('Usage: merge-milestone.mjs roadmap|news');
  const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (!SHA.test(sourceSha)) throw new Error('INVALID_SOURCE_SHA');
  const merged = await mergedPullRequests();
  const info = milestone(merged, mode === 'roadmap' ? ROADMAP_INTERVAL : NEWS_INTERVAL);
  if (!info) { process.stdout.write('MILESTONE_NOT_REACHED\n'); return; }
  const dataPath = mode === 'roadmap'
    ? 'src/data/roadmapMergeReconciliation.json'
    : 'src/data/controlCenterNews.json';
  const prior = await readCurrent(dataPath);
  const currentLast = mode === 'roadmap' ? prior.lastReconciledPr : prior.lastBatchPr;
  if (currentLast === info.last.number) { process.stdout.write('MILESTONE_ALREADY_RECONCILED\n'); return; }

  const stableDay = milestoneDay(info.last.merged_at);
  const record = mode === 'roadmap'
    ? await buildRoadmapRecord(info, sourceSha)
    : await buildNewsRecord(info, sourceSha);
  await output(dataPath, record);
  const doc = mode === 'roadmap'
    ? 'docs/product/roadmap-merge-reconciliation-' + info.last.number + '.json'
    : 'docs/growth/news-release-pr-' + info.last.number + '.md';
  await mkdir(path.dirname(doc), { recursive: true });
  await writeFile(doc, mode === 'roadmap' ? JSON.stringify(record, null, 2) + '\n' : record.article);
  process.stdout.write('MILESTONE_DATE_' + stableDay + '\n');
  process.stdout.write('MILESTONE_READY_' + info.last.number + '\n');
}

if (process.argv[1]?.endsWith('/merge-milestone.mjs')) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
