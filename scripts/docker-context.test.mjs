import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { matchesGlob, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const rules = readFileSync(resolve(root, '.dockerignore'), 'utf8')
  .split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'));

// This repository deliberately uses a small, ordered Docker allowlist.
// Reject unsupported syntax rather than treating a permissive approximation as proof.
assert.ok(rules.every(r => /^!?[a-zA-Z0-9_./*\-]+$/.test(r)));
assert.equal(rules[0], '**');

function included(path) {
  let result = true;
  for (const rule of rules) {
    const negated = rule.startsWith('!');
    const pattern = (negated ? rule.slice(1) : rule).replace(/\/$/, '');
    if (pattern === '**' || matchesGlob(path, pattern)) result = negated;
  }
  return result;
}
function reachable(path) {
  const parts = path.split('/');
  return parts.every((_, i) => included(parts.slice(0, i + 1).join('/')));
}
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    assert.ok(!entry.isSymbolicLink(), 'Review symlink build input: ' + entry.name);
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

test('all local Docker COPY sources and their files survive the allowlist', () => {
  const dockerfile = readFileSync(resolve(root, 'Dockerfile'), 'utf8');
  const lines = dockerfile.split(/\r?\n/).filter(line => /^COPY\s/i.test(line));
  assert.ok(lines.length > 0);
  for (const line of lines) {
    if (/^COPY\s+--from=/.test(line)) continue;
    const args = line.trim().split(/\s+/).slice(1, -1);
    assert.ok(args.length > 0 && args.every(p => !p.startsWith('--') && !/[\[\]*?]/.test(p)),
      'Review unsupported COPY syntax: ' + line);
    for (const source of args) {
      const path = resolve(root, source);
      assert.ok(existsSync(path), 'Missing repository COPY source: ' + source);
      const descendants = readdirOrFile(path);
      for (const file of descendants) {
        const name = relative(root, file).replaceAll('\\', '/');
        assert.ok(reachable(name), 'Docker context excludes COPY input: ' + name);
      }
    }
  }
});
function readdirOrFile(path) {
  try { return files(path); }
  catch (error) { if (error.code === 'ENOTDIR') return [path]; throw error; }
}

test('secrets, git metadata, reports and unrelated server files remain excluded', () => {
  for (const name of ['.env', '.env.production', '.git/config',
    'security-reports/image.json', 'docs/security/private-evidence.json',
    'server/credentials.json', 'server/auth.test.mjs', 'README.md']) {
    assert.equal(reachable(name), false, 'Unexpected build-context access: ' + name);
  }
});
