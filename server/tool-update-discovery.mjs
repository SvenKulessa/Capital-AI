// Read-only update discovery. Registry/GitHub metadata is not a verified binary or a release approval.
const NPM = 'https://registry.npmjs.org/';
const GH = 'https://api.github.com/repos/';
const SHA = /^[a-f0-9]{40}$/;
const INTEGRITY = /^sha512-[A-Za-z0-9+/]{86}==$/;
const PACKAGE = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i;
const GH_REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const RELEASE_TAG = /^v?[0-9]+\.[0-9]+\.[0-9]+(?:[-.][a-zA-Z0-9.-]+)?$/;

export const DISCOVERY_LIMITS = Object.freeze({ npm: 48, actions: 8 });
const parseVersion = value => {
  const found = typeof value === 'string' && /^([0-9]+)\.([0-9]+)\.([0-9]+)$/.exec(value);
  return found ? found.slice(1).map(Number) : null;
};
export function newerStableVersion(current, candidate) {
  const left = parseVersion(current), right = parseVersion(candidate);
  if (!left || !right) return null;
  for (let i = 0; i < 3; i++) {
    if (right[i] !== left[i]) return right[i] > left[i];
  }
  return false;
}
export function evaluateNpmCandidate(row, metadata) {
  const latest = metadata?.version, dist = metadata?.dist;
  if (!row || !PACKAGE.test(row.name) || metadata?.name !== row.name ||
      typeof latest !== 'string' || !SHA.test(dist?.shasum || '') ||
      !INTEGRITY.test(dist?.integrity || '')) {
    return { state: 'NOT_PROVEN', reason: 'MISSING_REGISTRY_SHA_AND_SHA512',
      latestVersion: typeof latest === 'string' ? latest : null };
  }
  const newer = newerStableVersion(row.version, latest);
  if (newer === null) return { state: 'REVIEW_REQUIRED', reason: 'NON_STABLE_OR_UNRESOLVED_VERSION',
    latestVersion: latest, latestLicenseDeclared: typeof metadata.license === 'string' ? metadata.license : null };
  if (!newer) return { state: 'CURRENT_OR_NEWER', checkedVersion: latest, latestVersion: latest,
    latestLicenseDeclared: typeof metadata.license === 'string' ? metadata.license : null };
  return {
    state: 'UPDATE_CANDIDATE', version: latest, latestVersion: latest,
    latestLicenseDeclared: typeof metadata.license === 'string' ? metadata.license : null,
    sha: dist.shasum,
    integrity: dist.integrity, source: 'NPM_REGISTRY_METADATA',
    verification: 'HASH_DECLARED_NOT_TARBALL_VERIFIED',
  };
}
export function evaluateActionCandidate(row, releaseTag, commitSha) {
  if (!row || !SHA.test(row.revisionSha || '') ||
      !RELEASE_TAG.test(releaseTag || '') || !SHA.test(commitSha || '')) {
    return { state: 'NOT_PROVEN', reason: 'INVALID_RELEASE_OR_COMMIT_SHA' };
  }
  if (commitSha === row.revisionSha) return { state: 'CURRENT_OR_NEWER', checkedVersion: releaseTag,
    latestVersion: releaseTag };
  const newer = newerStableVersion(String(row.version || '').replace(/^v/, ''), releaseTag.replace(/^v/, ''));
  if (newer !== true) return { state: 'REVIEW_REQUIRED', version: releaseTag, latestVersion: releaseTag,
    sha: commitSha, reason: 'UNORDERED_OR_CHANGED_PIN' };
  return {
    state: 'UPDATE_CANDIDATE', version: releaseTag, latestVersion: releaseTag, sha: commitSha,
    source: 'GITHUB_RELEASE_REF_AND_COMMIT',
    verification: 'REPO_COMMIT_EXISTS_CODE_REVIEW_REQUIRED',
  };
}
async function boundedJson(fetchImpl, url, maxBytes = 90_000) {
  const response = await fetchImpl(url, {
    method: 'GET', redirect: 'error',
    headers: { Accept: url.startsWith(GH) ? 'application/vnd.github+json' : 'application/json' },
    signal: AbortSignal.timeout(6500),
  });
  if (!response.ok || !response.body?.getReader) throw new Error('UPDATE_SOURCE_UNAVAILABLE');
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error('UPDATE_SOURCE_TOO_LARGE');
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
async function mapBounded(items, concurrency, fn) {
  const output = new Array(items.length);
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    for (;;) {
      const i = index++;
      if (i >= items.length) break;
      try { output[i] = await fn(items[i]); }
      catch { output[i] = { state: 'NOT_PROVEN', reason: 'UPDATE_SOURCE_UNAVAILABLE' }; }
    }
  }));
  return output;
}
async function actionCommitSha(fetchImpl, repo, tag) {
  if (!GH_REPO.test(repo) || !RELEASE_TAG.test(tag)) throw new Error('INVALID_ACTION_REF');
  const base = GH + repo + '/';
  const ref = await boundedJson(fetchImpl, base + 'git/ref/tags/' + encodeURIComponent(tag));
  let obj = ref?.object;
  for (let i = 0; i < 2 && obj?.type === 'tag'; i++) {
    if (!SHA.test(obj.sha || '')) throw new Error('INVALID_TAG');
    obj = (await boundedJson(fetchImpl, base + 'git/tags/' + obj.sha)).object;
  }
  if (obj?.type !== 'commit' || !SHA.test(obj.sha || '')) throw new Error('NOT_COMMIT');
  const commit = await boundedJson(fetchImpl, base + 'commits/' + obj.sha, 100_000);
  if (commit?.sha !== obj.sha) throw new Error('INVALID_COMMIT_PROVENANCE');
  return obj.sha;
}

export async function discoverRepositoryUpdates({ entries, sourceSha, blockedUpdates = [], fetchImpl = fetch, now = Date.now } = {}) {
  if (!SHA.test(sourceSha || '') || !Array.isArray(entries)) throw new Error('UPDATE_INVALID_SNAPSHOT');
  const npm = entries.filter(row => row.id?.startsWith('npm:') &&
    ['NPM_RUNTIME', 'NPM_DEVTOOL', 'NPM_PRODUCTION_BOUNDARY', 'NPM_SECURITY_PATCH'].includes(row.kind) &&
    PACKAGE.test(row.name || '')).sort((a, b) => a.id.localeCompare(b.id));
  // Scan the most security-relevant runtime dependencies before build-only packages.
  npm.sort((a, b) => {
    const priority = r => r.kind === 'NPM_RUNTIME' || r.kind === 'NPM_PRODUCTION_BOUNDARY' ? 0 : 1;
    return priority(a) - priority(b) || a.id.localeCompare(b.id);
  });
  const actions = entries.filter(row => row.kind === 'GITHUB_ACTION_PIN' &&
    SHA.test(row.revisionSha || '') && GH_REPO.test(row.actionRepository || ''))
    .sort((a, b) => a.id.localeCompare(b.id));
  const npmSelected = npm.slice(0, DISCOVERY_LIMITS.npm);
  const actionSelected = actions.slice(0, DISCOVERY_LIMITS.actions);
  const npmResult = await mapBounded(npmSelected, 6, async row => {
    const manifest = await boundedJson(fetchImpl, NPM + encodeURIComponent(row.name) + '/latest');
    return evaluateNpmCandidate(row, manifest);
  });
  const actionResult = await mapBounded(actionSelected, 3, async row => {
    const release = await boundedJson(fetchImpl, GH + row.actionRepository + '/releases/latest');
    const tag = release?.tag_name;
    if (!RELEASE_TAG.test(tag || '')) return { state: 'NOT_PROVEN', reason: 'NO_STABLE_RELEASE_TAG' };
    return evaluateActionCandidate(row, tag, await actionCommitSha(fetchImpl, row.actionRepository, tag));
  });
  const holds = new Map((Array.isArray(blockedUpdates) ? blockedUpdates : [])
    .filter(hold => hold?.name && hold?.version && hold?.state === 'BLOCKED')
    .map(hold => [hold.name + '@' + hold.version, hold]));
  const blockCandidate = (row, value) => {
    const hold = holds.get(row.name + '@' + (value?.latestVersion || value?.version));
    if (!hold || value.state !== 'UPDATE_CANDIDATE') return value;
    return { ...value, state: 'BLOCKED', reason: hold.reasonCode || 'SECURITY_REVIEW_BLOCKED',
      evidencePath: hold.evidencePath, latestVersion: value.latestVersion,
      verification: 'METADATA_ONLY_BINARY_SECURITY_REVIEW_REQUIRED' };
  };
  const findings = [
    ...npmSelected.map((row, i) => ({ id: row.id, name: row.name, kind: row.kind, installed: row.version, ...blockCandidate(row, npmResult[i]) })),
    ...actionSelected.map((row, i) => ({ id: row.id, name: row.name, kind: row.kind, installed: row.version, installedSha: row.revisionSha, ...actionResult[i] })),
  ];
  return {
    schema: 'CAPITAL_AI_TOOL_UPDATES@1',
    sourceSha, observedAt: new Date(now()).toISOString(),
    metadataOnly: true, autoApply: false, autoMerge: false,
    coverage: { npmTotal: npm.length, npmChecked: npmSelected.length,
      actionTotal: actions.length, actionChecked: actionSelected.length },
    findings, candidates: findings.filter(x => x.state === 'UPDATE_CANDIDATE').length,
    requiresReview: findings.filter(x => x.state === 'REVIEW_REQUIRED').length,
  };
}

/** Bounded public discovery for NEW content tools. Metadata never constitutes a commercial grant. */
export const GROWTH_TOOL_TOPICS = Object.freeze(['webgpu','3d-rendering','video-editing','mcp-server','content-generation']);
const PERMISSIVE = new Set(['MIT','Apache-2.0','BSD-2-Clause','BSD-3-Clause','ISC','MPL-2.0']);
export async function discoverGrowthTools({fetchImpl=fetch,now=Date.now}={}) {
  const observedAt=new Date(now()).toISOString();
  const rows=await mapBounded(GROWTH_TOOL_TOPICS,2,async topic=>{
    const url=new URL('https://api.github.com/search/repositories');
    url.searchParams.set('q','topic:'+topic+' archived:false fork:false stars:>=20');
    url.searchParams.set('sort','updated');url.searchParams.set('order','desc');url.searchParams.set('per_page','8');
    try {
      const response=await boundedJson(fetchImpl,url.href,350000);
      if(!Array.isArray(response.items))throw Error('DISCOVERY_INVALID');
      const candidates=response.items.slice(0,8).filter(item=>GH_REPO.test(item?.full_name||'')&&item.archived===false&&item.fork===false)
        .map(item=>{
          const license=typeof item.license?.spdx_id==='string'&&/^[A-Za-z0-9.+-]{1,40}$/.test(item.license.spdx_id)?item.license.spdx_id:null;
          return {repository:item.full_name,officialUrl:'https://github.com/'+item.full_name,
            declaredLicense:license,topic,commercialCandidate:PERMISSIVE.has(license),
            state:PERMISSIVE.has(license)?'REVIEW_REQUIRED':'BLOCKED_UNKNOWN_OR_COMPLEX_LICENSE',
            exactRevision:null,artifactDigest:null,commercialRights:'NOT_PROVEN',outputRights:'NOT_PROVEN',
            installAllowed:false,activationAllowed:false};
        });
      return {topic,status:'METADATA_OBSERVED',candidates};
    } catch {return {topic,status:'NOT_PROVEN',candidates:[]};}
  });
  const seen=new Set();
  const candidates=rows.flatMap(row=>row.candidates||[]).filter(row=>!seen.has(row.repository.toLowerCase())&&seen.add(row.repository.toLowerCase()));
  return {schema:'CAPITAL_AI_GROWTH_TOOL_RADAR@1',observedAt,metadataOnly:true,automaticInstall:false,
    publicPublishAllowed:false,paidProviderCalls:0,topics:rows.map(({topic,status})=>({topic,status})),candidates};
}
