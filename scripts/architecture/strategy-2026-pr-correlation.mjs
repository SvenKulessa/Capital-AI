import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const SHA = /^[0-9a-f]{40}$/i;
const PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._/@+ -]+$/;
const check = (ok, reason) => { if (!ok) throw new TypeError(reason); };
const validSha = v => typeof v === 'string' && SHA.test(v);
const pathOk = p => typeof p === 'string' && p.length <= 512 && PATH.test(p);
const unique = values => [...new Set(values)].sort();
const semanticTokens = p => {
  const basename = p.split('/').at(-1).replace(/^\d{8,}[_-]/, '')
    .replace(/\.(ts|tsx|mjs|js|json|yaml|yml|sql|openapi|lock)$/ig, '');
  return new Set(basename.split(/[^a-zA-Z0-9]+|(?=[A-Z])/g).map(x => x.toLowerCase())
    .filter(x => x.length >= 4 && !['index','test','spec','schema','service','types','config','contract','lockfile','migration','openapi','package'].includes(x)));
};
const semanticMatch = (a, b) => [...semanticTokens(a)].some(t => semanticTokens(b).has(t));
const kind = p => {
  if (/^(contracts\/|src\/contracts\/|shared\/.*(?:contract|schema)|.*\.(?:openapi|proto)\.)/.test(p)) return 'CONTRACT';
  if (/^supabase\/migrations\/.*\.sql$/.test(p)) return 'MIGRATION';
  if (/^(server\/|src\/services\/|src\/features\/|shared\/)/.test(p)) return 'RUNTIME';
  if (/(^|\/)(?:package|npm-shrinkwrap)(?:-lock)?\.json$/.test(p) || /(?:^|\/)pnpm-lock\.yaml$/.test(p)) return 'PACKAGE';
  return 'OTHER';
};
function dependency(a, b) {
  const pairs = [];
  for (const pa of a.changedFiles) for (const pb of b.changedFiles) {
    const ka = kind(pa), kb = kind(pb);
    if (pa === pb) pairs.push({ relation:'EXACT_FILE_OVERLAP', strength:'HIGH', evidence:[pa] });
    else if (ka === 'PACKAGE' && kb === 'PACKAGE') pairs.push({ relation:'PACKAGE_LOCK_DEPENDENCY', strength:'REVIEW_REQUIRED', evidence:[pa,pb] });
    else if (semanticMatch(pa,pb) && ((ka === 'CONTRACT' && kb === 'RUNTIME') || (kb === 'CONTRACT' && ka === 'RUNTIME')))
      pairs.push({ relation:'CONTRACT_RUNTIME_DEPENDENCY', strength:'REVIEW_REQUIRED', evidence:[pa,pb] });
    else if (semanticMatch(pa,pb) && ((ka === 'MIGRATION' && (kb === 'RUNTIME' || kb === 'CONTRACT')) || (kb === 'MIGRATION' && (ka === 'RUNTIME' || ka === 'CONTRACT'))))
      pairs.push({ relation:'MIGRATION_SCHEMA_DEPENDENCY', strength:'REVIEW_REQUIRED', evidence:[pa,pb] });
  }
  const seen = new Map();
  for (const p of pairs) seen.set(p.relation+'|'+p.evidence.join('|'), p);
  return [...seen.values()].sort((x,y)=>(x.relation+x.evidence).localeCompare(y.relation+y.evidence));
}
// File and filename-based hypotheses, not semantic proof, conflicts or merge authorization.
export function correlatePullRequests(input, options = {}) {
  check(input && typeof input === 'object' && !Array.isArray(input), 'input must be an object');
  check(validSha(input.mainSha), 'mainSha must be a 40-character commit SHA');
  check(input.snapshotType === 'LIVE_GITHUB' || input.snapshotType === 'HISTORICAL_REGRESSION_FIXTURE', 'snapshotType required');
  const live = input.snapshotType === 'LIVE_GITHUB';
  check(input.authority === (live ? 'LIVE_READ_ONLY' : 'NON_CURRENT'), 'invalid authority');
  check(Array.isArray(input.pullRequests) && input.pullRequests.length <= 200, 'pullRequests must be an array of up to 200');
  if (live) {
    check(input.inventoryComplete === true && typeof input.repo === 'string' && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(input.repo), 'live inventory incomplete');
    check(typeof input.observedAt === 'string' && !Number.isNaN(Date.parse(input.observedAt)), 'observedAt required');
    const now = options.now ?? Date.now(), maxAgeMs = options.maxAgeMs ?? 300_000;
    check(Number.isFinite(now) && Number.isFinite(maxAgeMs) && maxAgeMs >= 0, 'invalid freshness parameters');
    const age = now - Date.parse(input.observedAt);
    check(age >= -30_000 && age <= maxAgeMs, 'stale or future live inventory');
    check(validSha(options.currentMainSha) && input.mainSha.toLowerCase() === options.currentMainSha.toLowerCase(), 'live main SHA mismatch');
  }
  const seen = new Set();
  const prs = input.pullRequests.map(p => {
    check(p && typeof p === 'object' && !Array.isArray(p), 'invalid PR');
    check(Number.isSafeInteger(p.number) && p.number > 0 && !seen.has(p.number), 'duplicate or invalid PR number'); seen.add(p.number);
    check(typeof p.title === 'string' && p.title.length > 0 && p.title.length <= 512, 'invalid title');
    check(validSha(p.headSha) && typeof p.draft === 'boolean', 'invalid head SHA or draft');
    check(Array.isArray(p.changedFiles) && p.changedFiles.length <= 1000, 'invalid changedFiles');
    check(p.changedFiles.every(pathOk), 'invalid changed file path');
    if (live) check(p.state === 'open' && p.changedFilesComplete === true && validSha(p.baseSha), 'live PR incomplete or closed');
    return {number:p.number,title:p.title,headSha:p.headSha.toLowerCase(),draft:p.draft,changedFiles:unique(p.changedFiles)};
  }).sort((a,b)=>a.number-b.number);
  const overlapEdges = [], dependencyEdges = [];
  for (let i=0;i<prs.length;i++) for (let j=i+1;j<prs.length;j++) {
    const a=prs[i], b=prs[j], reasons=dependency(a,b);
    if (reasons.length) {
      const sharedFiles = reasons.filter(x=>x.relation === 'EXACT_FILE_OVERLAP').map(x=>x.evidence[0]);
      if (sharedFiles.length) overlapEdges.push({left:a.number,right:b.number,sharedFiles});
      dependencyEdges.push({left:a.number,right:b.number,reasons});
    }
  }
  const neighbors = new Map(prs.map(p=>[p.number,new Set()]));
  for (const e of dependencyEdges) { neighbors.get(e.left).add(e.right);neighbors.get(e.right).add(e.left); }
  return {
    schemaVersion:'CAPITAL_AI_PR_CORRELATION@2',
    snapshotType:input.snapshotType, authority:input.authority,
    current:live, observedAt:input.observedAt ?? null, mainSha:input.mainSha.toLowerCase(),
    repo:input.repo ?? null, observedCount:prs.length, totalOpen:live?prs.length:null,
    overlapEdges, dependencyEdges,
    pullRequests:prs.map(p=>({number:p.number,title:p.title,headSha:p.headSha,draft:p.draft,
      changedFileCount:p.changedFiles.length,overlapsWith:[...neighbors.get(p.number)].sort((a,b)=>a-b),mergeEligibility:'NOT_PROVEN'})),
    decision:'READ_ONLY_CORRELATION_NOT_MERGE_AUTHORIZATION'
  };
}
async function main() {
  if (process.argv.length !== 3) throw new Error('Usage: node strategy-2026-pr-correlation.mjs INPUT.json');
  const raw = await readFile(process.argv[2],'utf8');
  if (Buffer.byteLength(raw) > 1024*1024) throw new Error('Input exceeds 1 MiB');
  const input = JSON.parse(raw);
  if (input.snapshotType === 'LIVE_GITHUB') throw new Error('Use live adapter to verify currentMainSha against GitHub');
  process.stdout.write(JSON.stringify(correlatePullRequests(input),null,2)+'\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch(e=>{console.error('PR_CORRELATION_ERROR: '+e.message);process.exitCode=2;});