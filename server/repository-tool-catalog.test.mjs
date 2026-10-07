import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRepositoryToolCatalog, createRepositoryToolCatalog } from './repository-tool-catalog.mjs';

const SHA = 'a'.repeat(40);
const TREE = [
  'package.json', 'package-lock.json', 'server/auth.mjs', 'server/auth.test.mjs',
  'src/features/home/HomePage.tsx', 'src/services/scoringEngine.ts',
  'scripts/verify-private-brokers.mjs', '.github/workflows/build-security.yml',
  'services/provider-bridge-rs/Cargo.toml', 'deploy/Dockerfile.nats',
  'config/tool-catalog-integrations.json',
].map(path => ({ type: 'blob', path }));
const pkg = {
  name: 'capital-ai', version: '0.8.0-alpha.1',
  dependencies: { react: '^19.0.1', redis: '6.3.0' },
  devDependencies: { typescript: '6.0.3' },
};
const lock = { packages: {
  'node_modules/react': { version: '19.3.0' },
  'node_modules/redis': { version: '6.3.0' },
  'node_modules/typescript': { version: '6.0.3' },
} };
const cargo = '[package]\nname = "capital-ai-provider-bridge"\nversion = "0.1.0"\n\n[dependencies]\ntokio = { version = "=1.53.2", features = ["time"] }\nasync-nats = "=0.50.0"\n\n[profile.release]\nlto = "thin"\n';
const dockerfiles = { 'deploy/Dockerfile.nats': 'FROM nats:2.15.0-alpine@sha256:' + 'b'.repeat(64) + '\nFROM scratch\n' };
const integrations = [{ name: 'Stripe', path: 'server/auth.mjs', domain: 'PRODUCT', application: 'Checkout' }];

test('repository catalog extracts locked versions, pinned images, services and app modules', () => {
  const entries = buildRepositoryToolCatalog({ sourceSha: SHA, tree: TREE, pkg, lock, cargo, dockerfiles, integrations });
  const byId = id => entries.find(item => item.id === id);
  assert.equal(byId('app:capital-ai').version, '0.8.0-alpha.1');
  assert.equal(byId('npm:react').version, '19.3.0');
  assert.match(byId('npm:react').versionBasis, /aufgelöst/);
  assert.equal(byId('npm:typescript').kind, 'NPM_DEVTOOL');
  assert.equal(byId('cargo:tokio').version, '1.53.2');
  assert.equal(byId('app:provider-bridge').version, '0.1.0');
  assert.equal(byId('image:deploy/Dockerfile.nats:nats').digest, 'b'.repeat(64));
  assert.equal(byId('file:src/features/home/HomePage.tsx').kind, 'WEB_MODUL');
  assert.equal(byId('file:server/auth.test.mjs'), undefined);
  assert.equal(byId('integration:stripe').version, null);
  assert.ok(entries.every(item => item.path && item.application && item.versionBasis));
});

test('isolated package boundaries and nonproduction tooling retain precise provenance', () => {
  const extraTree = [
    'deploy/runtime/package.json', 'deploy/runtime/package-lock.json',
    'deploy/npm-security-patches/package.json', 'deploy/npm-security-patches/package-lock.json',
    'deploy/social-media/renderer-requirements.txt', 'deploy/social-media/ffmpeg-build-profile.json',
    'mobile/android-private/build.gradle', 'mobile/android-private/app/build.gradle',
    'services/provider-bridge-rs/rust-toolchain.toml', 'Dockerfile',
  ].map(path => ({ type: 'blob', path }));
  const entries = buildRepositoryToolCatalog({
    sourceSha: SHA, tree: [...TREE, ...extraTree], pkg, lock, cargo,
    dockerfiles: { Dockerfile: 'FROM node:26.10.0-alpine\nRUN npm install --global npm@12.2.0 --ignore-scripts' },
    supplementary: {
      'deploy/runtime/package.json': { name: 'runtime', version: '0.8.0', dependencies: { redis: '^6' } },
      'deploy/runtime/package-lock.json': { packages: { 'node_modules/redis': { version: '6.3.0' } } },
      'deploy/npm-security-patches/package.json': { dependencies: { undici: '6.29.0' } },
      'deploy/npm-security-patches/package-lock.json': { packages: { 'node_modules/undici': { version: '6.29.0' } } },
      'deploy/social-media/renderer-requirements.txt': 'Pillow==12.3.0 --hash=sha256:abc',
      'deploy/social-media/ffmpeg-build-profile.json': { source: { version: '9.0.2' }, productionEligible: false },
      'mobile/android-private/build.gradle': "id 'com.android.application' version '8.13.2' apply false",
      'mobile/android-private/app/build.gradle': 'versionName "0.1.0-private"',
      'services/provider-bridge-rs/rust-toolchain.toml': 'channel = "1.99.0"',
    },
  });
  const get = id => entries.find(x => x.id === id);
  assert.equal(get('npm:deploy/runtime:redis').version, '6.3.0');
  assert.equal(get('npm:deploy/npm-security-patches:undici').version, '6.29.0');
  assert.equal(get('python:Pillow').version, '12.3.0');
  assert.match(get('tool:ffmpeg').versionBasis, /NICHT productionEligible/);
  assert.equal(get('app:android-private').version, '0.1.0-private');
  assert.equal(get('tool:android-gradle-plugin').version, '8.13.2');
  assert.equal(get('tool:rust').version, '1.99.0');
  assert.equal(get('tool:npm-cli').version, '12.2.0');
});

test('invalid snapshot and unverified third-party paths fail closed', () => {
  assert.throws(() => buildRepositoryToolCatalog({ sourceSha: 'main', tree: TREE, pkg, lock, cargo }), /INVALID_TREE/);
  const entries = buildRepositoryToolCatalog({ sourceSha: SHA, tree: TREE, pkg, lock, cargo,
    integrations: [{ name: 'Unverified', domain: 'PRODUCT', path: 'secrets/.env', application: 'bad' }],
  });
  assert.equal(entries.some(item => item.id === 'integration:unverified'), false);
});

test('unlocked npm ranges are explicitly distinguished from installed versions', () => {
  const entries = buildRepositoryToolCatalog({
    sourceSha: SHA, tree: TREE, pkg: { version: '1', dependencies: { example: '^2.0.0' } }, lock: { packages: {} },
  });
  const dep = entries.find(item => item.id === 'npm:example');
  assert.equal(dep.version, '^2.0.0');
  assert.match(dep.versionBasis, /nicht aufgelöst/);
});

function fetchStub(counters) {
  return async url => {
    counters.urls.push(url);
    const content =
      url.endsWith('/branches/main') ? { commit: { sha: SHA } } :
      url.includes('/git/trees/') ? { tree: TREE, truncated: false } :
      url.endsWith('/package.json') ? pkg :
      url.endsWith('/package-lock.json') ? lock :
      url.endsWith('/Cargo.toml') ? cargo :
      url.endsWith('/Dockerfile.nats') ? dockerfiles['deploy/Dockerfile.nats'] :
      url.endsWith('/tool-catalog-integrations.json') ? integrations :
      null;
    return content === null
      ? new Response('', { status: 404 })
      : new Response(typeof content === 'string' ? content : JSON.stringify(content), { status: 200 });
  };
}

test('GitHub main uses one commit SHA, coalesces concurrent reads, caches and marks failures stale', async () => {
  const calls = { urls: [] };
  let now = 1_000_000;
  let fail = false;
  const firstFetch = fetchStub(calls);
  const read = createRepositoryToolCatalog({
    now: () => now,
    env: { RENDER_GIT_COMMIT: 'b'.repeat(40) },
    fetchImpl: async url => fail ? Promise.reject(new Error('offline')) : firstFetch(url),
  });
  const [a, b] = await Promise.all([read.snapshot(), read.snapshot()]);
  assert.equal(a.schema, 'CAPITAL_AI_REPOSITORY_TOOL_CATALOG@1');
  assert.equal(a.freshness, 'LIVE');
  assert.equal(b.sourceSha, SHA);
  assert.equal(a.deployedSha, 'b'.repeat(40));
  assert.equal(calls.urls.filter(url => url.endsWith('/branches/main')).length, 1);
  assert.ok(calls.urls.every(url => url.endsWith('/branches/main') || url.includes('/' + SHA)));
  now += 10_000;
  assert.equal((await read.snapshot()).freshness, 'CACHED');
  fail = true;
  now += 310_000;
  assert.equal((await read.snapshot()).freshness, 'STALE');
});

test('API never fabricates success when repository unavailable without cache', async () => {
  const catalog = createRepositoryToolCatalog({ fetchImpl: async () => { throw new Error('upstream'); } });
  await assert.rejects(catalog.snapshot(), /REPOSITORY_UPSTREAM_UNAVAILABLE/);
});
