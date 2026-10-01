import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { verifyBrowserBoundary } from './verify-browser-boundary.mjs';

const iterations = Number(process.env.BOUNDARY_BENCH_ITERATIONS || 20);
const fileCount = Number(process.env.BOUNDARY_BENCH_FILES || 250);
const root = await mkdtemp(path.join(tmpdir(), 'capital-ai-boundary-bench-'));
const payload = 'const value = globalThis.location?.href ?? "";\n'.repeat(80);

try {
  const assets = path.join(root, 'assets');
  await mkdir(assets, { recursive: true });
  for (let i = 0; i < fileCount; i++) await writeFile(path.join(assets, 'chunk-' + i + '.js'), payload + 'export const id=' + i + ';\n');

  const samples = [];
  for (let i = 0; i < iterations; i++) {
    const started = performance.now();
    await verifyBrowserBoundary(root);
    samples.push(performance.now() - started);
  }
  samples.sort((a,b)=>a-b);
  const p = q => samples[Math.min(samples.length - 1, Math.floor(samples.length * q))];
  const baseline = {
    tool: 'typescript-compiler-api-boundary',
    node: process.version,
    platform: process.platform + '/' + process.arch,
    iterations,
    files: fileCount,
    bytesPerFile: Buffer.byteLength(payload),
    ms: { min: samples[0], p50: p(0.5), p95: p(0.95), max: samples.at(-1) }
  };

  const oxlint = spawnSync('npx', ['--no-install', 'oxlint', '--version'], { encoding: 'utf8' });
  const candidate = {
    tool: 'oxlint',
    available: oxlint.status === 0,
    version: oxlint.status === 0 ? oxlint.stdout.trim() : null,
    note: 'Candidate timing is intentionally deferred until the exact package/version is trust-reviewed and pinned.'
  };

  console.log(JSON.stringify({ schemaVersion: 1, benchmark: 'browser-boundary', baseline, candidate }, null, 2));
} finally {
  await rm(root, { recursive: true, force: true });
}
