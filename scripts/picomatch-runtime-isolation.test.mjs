import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

// CVE-2026-112366: build-time picomatch is still vulnerable pending an upstream
// patch. Prove it cannot ship through the production dependency closure.
// Never run catastrophic-backtracking PoCs in the application test process.
const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const readJson = name => JSON.parse(readFileSync(path.join(projectRoot, name), 'utf8'));
const pkg = readJson('package.json');
const lock = readJson('package-lock.json');
const BUILD_ONLY = ['vite', '@vitejs/plugin-react', '@tailwindcss/vite'];
const RUNTIME_DENIED = [
  'node_modules/picomatch',
  'node_modules/vite',
  'node_modules/tinyglobby',
  'node_modules/fdir',
  'node_modules/@vitejs/plugin-react',
  'node_modules/@tailwindcss/vite',
];

function resolveDependency(packages, parent, name) {
  let current = parent;
  for (;;) {
    const candidate = (current ? current + '/' : '') + 'node_modules/' + name;
    if (Object.hasOwn(packages, candidate)) return candidate;
    if (!current) return null;
    const pos = current.lastIndexOf('/node_modules/');
    current = pos < 0 ? '' : current.slice(0, pos);
  }
}

function closure(packages, roots) {
  const seen = new Set();
  const work = [];
  for (const name of Object.keys(roots)) {
    const found = resolveDependency(packages, '', name);
    assert.ok(found, 'Lockfile missing root dependency ' + name);
    work.push(found);
  }
  while (work.length) {
    const current = work.pop();
    if (seen.has(current)) continue;
    seen.add(current);
    const entry = packages[current];
    assert.ok(entry, 'Missing locked package ' + current);
    for (const kind of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
      for (const name of Object.keys(entry[kind] || {})) {
        // Optional peers are not installed simply because a package lists them.
        if (kind === 'peerDependencies' && entry.peerDependenciesMeta?.[name]?.optional) continue;
        const found = resolveDependency(packages, current, name);
        if (kind === 'dependencies') {
          assert.ok(found, 'Unresolved required dependency ' + name + ' from ' + current);
        }
        if (found && !seen.has(found)) work.push(found);
      }
    }
  }
  return seen;
}

function verifyRuntimeIsolation(manifest, locked) {
  const current = locked.packages;
  assert.deepEqual(current[''].dependencies, manifest.dependencies,
    'Production root declarations must match lockfile');
  assert.deepEqual(current[''].devDependencies, manifest.devDependencies,
    'Build root declarations must match lockfile');
  for (const name of BUILD_ONLY) {
    assert.equal(manifest.dependencies[name], undefined,
      name + ' must not be a production dependency');
    assert.equal(typeof manifest.devDependencies[name], 'string',
      name + ' must remain available for the frontend build');
  }
  const runtime = closure(current, manifest.dependencies);
  for (const target of RUNTIME_DENIED) {
    assert.equal(runtime.has(target), false,
      target + ' was reached through a runtime dependency');
  }
  for (const name of runtime) {
    assert.notEqual(current[name].dev, true,
      'A required production dependency is flagged dev: ' + name);
    assert.notEqual(current[name].devOptional, true,
      'A required production dependency is flagged devOptional: ' + name);
  }
  const dev = closure(current, manifest.devDependencies);
  for (const name of dev) {
    if (runtime.has(name)) continue;
    assert.ok(current[name].dev === true || current[name].devOptional === true,
      'A dev-only package is neither dev nor devOptional: ' + name);
  }
  return { runtime, dev };
}

function runtimeSourceFiles() {
  const result = [];
  const walk = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules') walk(full);
      if (entry.isFile() && /\.(?:mjs|cjs|js|ts)$/.test(entry.name)
        && !/\.(?:test|spec)\./.test(entry.name)) result.push(full);
    }
  };
  walk(path.join(projectRoot, 'server'));
  return result;
}

function forbiddenModuleImport(source) {
  return /\b(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"](?:vite|@vitejs\/plugin-react|@tailwindcss\/vite|picomatch|tinyglobby|fdir)(?:\/[^'"]*)?['"]/.test(source);
}

test('Vite, React and Tailwind plugins are build-only with a dev-only lock closure', () => {
  const proof = verifyRuntimeIsolation(pkg, lock);
  assert.ok(proof.runtime.size > 0 && proof.dev.size > 0);
  const config = readFileSync(path.join(projectRoot, 'vite.config.ts'), 'utf8');
  for (const name of BUILD_ONLY) {
    assert.ok(config.includes("'" + name + "'"),
      'Vite build config must continue importing ' + name);
  }
});

test('server runtime has no direct imports of the vulnerable build-only tools', () => {
  const offenders = runtimeSourceFiles().filter(name =>
    forbiddenModuleImport(readFileSync(name, 'utf8')));
  assert.deepEqual(offenders, []);
});

test('negative: a server import of picomatch would violate the boundary', () => {
  assert.equal(forbiddenModuleImport("import picomatch from 'picomatch';"), true);
  assert.equal(forbiddenModuleImport("const x = require('@vitejs/plugin-react')"), true);
  assert.equal(forbiddenModuleImport("import { createHash } from 'node:crypto'"), false);
});

test('negative: moving Vite back into runtime dependencies is rejected', () => {
  const bad = structuredClone(pkg);
  bad.dependencies.vite = bad.devDependencies.vite;
  delete bad.devDependencies.vite;
  assert.throws(() => verifyRuntimeIsolation(bad, lock));
});

test('negative: introducing transitive picomatch from a server package is rejected', () => {
  const bad = structuredClone(lock);
  bad.packages['node_modules/express'].dependencies ??= {};
  bad.packages['node_modules/express'].dependencies.picomatch = '^4.0.7';
  assert.throws(() => verifyRuntimeIsolation(pkg, bad), /picomatch/);
});

test('negative: removing the dev-only picomatch lock marker is rejected', () => {
  const bad = structuredClone(lock);
  delete bad.packages['node_modules/picomatch'].dev;
  assert.throws(() => verifyRuntimeIsolation(pkg, bad), /picomatch/);
});

// Full Trivy --include-dev-deps scans intentionally remain enabled and may
// continue to fail for this CVE until an upstream fix is released.


const deployedManifest = readJson('deploy/runtime/package.json');
const deployedLock = readJson('deploy/runtime/package-lock.json');
const deployedDockerfile = readFileSync(path.join(projectRoot, 'Dockerfile'), 'utf8');

// The real Render image uses deploy/runtime/package.json and its own lockfile.
// This contract is independent of the frontend/root package classification.
function verifyDockerRuntime(manifest, locked, dockerfile) {
  assert.deepEqual(locked.packages[''].dependencies, manifest.dependencies,
    'Docker runtime manifest does not match deploy/runtime lockfile');
  const productionStage = dockerfile.split(/^FROM crypto-base AS production-deps$/m)[1]?.split(/^FROM /m)[0] ?? '';
  assert.ok(productionStage, 'Missing dedicated production dependency stage');
  assert.match(productionStage, /^COPY deploy\/runtime\/package\.json deploy\/runtime\/package-lock\.json \.\/$/m,
    'Docker must use the dedicated runtime package files');
  assert.match(productionStage, /npm ci --omit=dev --include=optional/,
    'Docker must omit dev dependencies');
  const runtimeStage = dockerfile.split(/^FROM crypto-base AS runtime$/m)[1] ?? '';
  assert.match(runtimeStage, /^COPY --from=production-deps \/runtime\/node_modules \.\/node_modules$/m,
    'Docker must copy node_modules only from the dedicated production stage');
  const production = closure(locked.packages, manifest.dependencies);
  for (const target of RUNTIME_DENIED) {
    assert.equal(production.has(target), false,
      'Vulnerable build-only module reached in deploy/runtime: ' + target);
    assert.equal(Object.hasOwn(locked.packages, target), false,
      'Vulnerable build-only module was added to deploy/runtime lockfile: ' + target);
  }
}

test('actual Render Docker runtime manifest excludes the vulnerable Vite/picomatch closure', () => {
  verifyDockerRuntime(deployedManifest, deployedLock, deployedDockerfile);
});

test('negative: introducing picomatch into the dedicated production lockfile fails', () => {
  const bad = structuredClone(deployedLock);
  bad.packages['node_modules/picomatch'] = { version: '4.0.7' };
  bad.packages['node_modules/redis'].dependencies ??= {};
  bad.packages['node_modules/redis'].dependencies.picomatch = '^4.0.7';
  assert.throws(() => verifyDockerRuntime(deployedManifest, bad, deployedDockerfile),
    /picomatch/);
});

test('negative: Docker silently switching to root manifest is rejected', () => {
  const bad = deployedDockerfile.replace(
    /^COPY deploy\/runtime\/package\.json deploy\/runtime\/package-lock\.json \.\/$/m,
    'COPY package.json package-lock.json ./');
  assert.notEqual(bad, deployedDockerfile);
  assert.throws(() => verifyDockerRuntime(deployedManifest, deployedLock, bad),
    /dedicated runtime package files/);
});
