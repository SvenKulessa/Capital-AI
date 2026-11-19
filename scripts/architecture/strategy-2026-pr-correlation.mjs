import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const SHA = /^[a-f0-9]{40}$/i;
const FILE_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._/@+ -]+$/;
const assert = (condition, message) => { if (!condition) throw new TypeError(message); };

// Read-only correlation only; never authorizes a merge.
export function correlatePullRequests(input) {
  assert(input && typeof input === 'object' && !Array.isArray(input), 'input must be an object');
  assert(SHA.test(input.mainSha ?? ''), 'mainSha must be a 40-character commit SHA');
  assert(Array.isArray(input.pullRequests) && input.pullRequests.length <= 200, 'pullRequests must be an array of up to 200 items');
  const seen = new Set();
  const prs = input.pullRequests.map(p => {
    assert(p && typeof p === 'object', 'invalid PR item');
    assert(Number.isSafeInteger(p.number) && p.number > 0, 'invalid PR number');
    assert(!seen.has(p.number), 'duplicate PR number');
    seen.add(p.number);
    assert(typeof p.title === 'string' && p.title.length > 0 && p.title.length <= 512, 'invalid title');
    assert(SHA.test(p.headSha ?? ''), 'invalid head SHA for #' + p.number);
    assert(typeof p.draft === 'boolean', 'invalid draft flag for #' + p.number);
    assert(Array.isArray(p.changedFiles) && p.changedFiles.length <= 1000, 'invalid changedFiles for #' + p.number);
    const paths = [...new Set(p.changedFiles.map(path => {
      assert(typeof path === 'string' && path.length <= 512 && FILE_PATH.test(path), 'invalid path for #' + p.number);
      return path;
    }))].sort();
    return { number: p.number, title: p.title, headSha: p.headSha.toLowerCase(), draft: p.draft, changedFiles: paths };
  }).sort((a, b) => a.number - b.number);
  const overlapEdges = [];
  for (let i = 0; i < prs.length; i++) {
    for (let j = i + 1; j < prs.length; j++) {
      const a = prs[i], b = prs[j], other = new Set(b.changedFiles);
      const sharedFiles = a.changedFiles.filter(f => other.has(f));
      if (sharedFiles.length) overlapEdges.push({ left: a.number, right: b.number, sharedFiles });
    }
  }
  const conflicts = new Map(prs.map(p => [p.number, []]));
  for (const edge of overlapEdges) {
    conflicts.get(edge.left).push(edge.right);
    conflicts.get(edge.right).push(edge.left);
  }
  return {
    schemaVersion: 'CAPITAL_AI_PR_CORRELATION@1', mainSha: input.mainSha.toLowerCase(),
    totalOpen: prs.length, overlapEdges,
    pullRequests: prs.map(p => ({
      number: p.number, title: p.title, headSha: p.headSha, draft: p.draft,
      changedFileCount: p.changedFiles.length, overlapsWith: conflicts.get(p.number).sort((a,b)=>a-b),
      mergeEligibility: 'NOT_PROVEN'
    })),
    decision: 'READ_ONLY_CORRELATION_NOT_MERGE_AUTHORIZATION'
  };
}

async function main() {
  const filename = process.argv[2];
  if (!filename || process.argv.length !== 3) throw new Error('Usage: node scripts/architecture/strategy-2026-pr-correlation.mjs INPUT.json');
  const raw = await readFile(filename, 'utf8');
  if (Buffer.byteLength(raw) > 1024 * 1024) throw new Error('Input exceeds 1 MiB');
  process.stdout.write(JSON.stringify(correlatePullRequests(JSON.parse(raw)), null, 2) + '\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { process.stderr.write('STRATEGY2026_ERROR: ' + e.message + '\n'); process.exitCode = 2; });
}
