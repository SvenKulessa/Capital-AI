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
assert.ok(rules.every(r => /^!?[a-zA-Z0-9_./*\-]+$/.test(r) ||
  ['!Chat Buddy/', '!Chat Buddy/README.md', '!Chat Buddy/src/', '!Chat Buddy/src/**'].includes(r)));
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
    // JSON-array COPY is required for paths containing spaces (Dockerfile syntax).
    const sourcePart = line.trim().slice(5).trim();
    const args = sourcePart.startsWith('[')
      ? JSON.parse(sourcePart).slice(0, -1)
      : sourcePart.split(/\s+/).slice(0, -1);
    assert.ok(args.length > 0 && args.every(p => (p === 'Chat Buddy/src' || p === 'Chat Buddy/README.md' || !/\s/.test(p)) &&
      !p.startsWith('--') && !/[\[\]*?]/.test(p)),
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


test('runtime market module dependencies are present in the final image and build context', () => {
  const market = readFileSync(resolve(root, 'server/market.mjs'), 'utf8');
  const dockerfile = readFileSync(resolve(root, 'Dockerfile'), 'utf8');
  assert.match(market, /from ['"]\.\/open-source-market-policy\.mjs['"]/);
  assert.match(market, /from ['"]\.\/ecb-reference-rates\.mjs['"]/);
  assert.match(
    dockerfile,
    /COPY\s+[^\n]*server\/market\.mjs[^\n]*server\/open-source-market-policy\.mjs[^\n]*\.\/server\//,
    'Runtime Docker stage must copy the local policy module imported by server/market.mjs',
  );
  assert.equal(reachable('server/open-source-market-policy.mjs'), true);
  assert.equal(reachable('server/ecb-reference-rates.mjs'), true);
  assert.ok(
    dockerfile.split(/\r?\n/).some(line => line.startsWith('COPY ') && line.includes('server/ecb-reference-rates.mjs') && line.trim().endsWith('./server/')),
    'Runtime Docker stage must copy the ECB adapter imported by server/market.mjs',
  );
});

test('Spot feed lifecycle and its regression test are shipped in the stages that execute them', () => {
  const dockerfile = readFileSync(resolve(root, 'Dockerfile'), 'utf8');
  const runtime = dockerfile.slice(dockerfile.lastIndexOf('\nFROM '));
  const build = dockerfile.slice(dockerfile.indexOf(' AS build\n'), dockerfile.lastIndexOf('\nFROM '));
  for (const stage of [build, runtime]) {
    assert.ok(stage.split(/\r?\n/).some(line => line.startsWith('COPY ') &&
      line.includes('server/spot-feed-lifecycle.mjs') && line.trim().endsWith('./server/')),
    'Every application stage must ship the lifecycle dependency of spot-provider-wire');
  }
  assert.ok(build.split(/\r?\n/).some(line => line.startsWith('COPY ') &&
    line.includes('server/spot-feed-lifecycle.test.mjs') && line.trim().endsWith('./server/')),
  'npm test in the isolated build must have the lifecycle regression test');
  assert.equal(reachable('server/spot-feed-lifecycle.mjs'), true);
  assert.equal(reachable('server/spot-feed-lifecycle.test.mjs'), true);
});


test('runtime entrypoint local server imports are copied and reachable', () => {
  const entrypoint = readFileSync(resolve(root, 'server/index.mjs'), 'utf8');
  const dockerfile = readFileSync(resolve(root, 'Dockerfile'), 'utf8');
  const localImports = [...entrypoint.matchAll(/from\s+['"]\.\/([^'"]+)['"]/g)].map(match => match[1]);
  assert.ok(localImports.length > 0, 'Expected local server imports in runtime entrypoint');
  for (const imported of localImports) {
    const source = 'server/' + imported;
    assert.equal(reachable(source), true, 'Docker context excludes runtime entrypoint dependency: ' + source);
    const subfolder = imported.includes('/') ? imported.slice(0, imported.lastIndexOf('/') + 1) : '';
    const destination = './server/' + subfolder;
    assert.ok(
      dockerfile.split(/\r?\n/).some(line => line.startsWith('COPY ') && line.includes(source) && line.trim().endsWith(destination)),
      'Runtime Docker stage must copy local entrypoint dependency: ' + source,
    );
  }
});


test('application and NATS images enforce the patched Alpine zlib security floor', () => {
  const dockerfile = readFileSync(resolve(root, 'Dockerfile'), 'utf8');
  const natsDockerfile = readFileSync(resolve(root, 'deploy/Dockerfile.nats'), 'utf8');

  assert.match(
    dockerfile,
    /apk add --no-cache[^\n]*['"]zlib>=1\.3\.2-r1['"]/,
    'Application image must install zlib >= 1.3.2-r1 for CVE-2026-85091',
  );
  assert.match(
    natsDockerfile,
    /apk add --no-cache[^\n]*['"]zlib>=1\.3\.2-r1['"]/,
    'NATS image must install zlib >= 1.3.2-r1 for CVE-2026-85091',
  );
  assert.doesNotMatch(dockerfile, /zlib=1\.3\.2-r0/);
  assert.doesNotMatch(natsDockerfile, /zlib=1\.3\.2-r0/);
});
