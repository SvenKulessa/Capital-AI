import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const manifest = JSON.parse(readFileSync('docs/benchmarks/code-review-pilot/benchmark-plan.json', 'utf8'));
const directory = resolve(process.argv[2] || '/tmp/capital-code-review-corpus');
mkdirSync(directory, { recursive: true });
const results = [];
for (const sample of manifest.samples) {
  if (!/^[a-z0-9-]+$/.test(sample.id) || ![sample.baseSha, sample.headSha].every(s => /^[a-f0-9]{40}$/.test(s))) {
    throw new Error('Invalid frozen benchmark identity');
  }
  const diff = spawnSync('git', ['diff', '--no-ext-diff', '--no-textconv', '--unified=5',
    sample.baseSha, sample.headSha, '--', ...sample.paths], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, timeout: 30000 });
  if (diff.error || diff.status !== 0 || !diff.stdout.trim()) throw new Error(`Cannot prepare ${sample.id}; fetch the exact manifest commits first`);
  writeFileSync(resolve(directory, `${sample.id}.diff`), diff.stdout);
  results.push({ id: sample.id, baseSha: sample.baseSha, headSha: sample.headSha,
    diffSha256: createHash('sha256').update(diff.stdout).digest('hex'), bytes: Buffer.byteLength(diff.stdout),
    changedFiles: (diff.stdout.match(/^diff --git /gm) || []).length, scope: 'SELECTED_PATHS_ONLY',
    modelRun: 'NOT_RUN', truePositives: null, falsePositives: null, missedFindings: null,
    runtimeMilliseconds: null, inputTokens: null, outputTokens: null, measuredCost: null });
}
writeFileSync(resolve(directory, 'corpus-evidence.json'), JSON.stringify({ schemaVersion: 1, samples: results }, null, 2) + '\n');
console.log(JSON.stringify({ schemaVersion: 1, samples: results }, null, 2));
