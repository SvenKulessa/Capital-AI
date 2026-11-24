import test from 'node:test';
import { readFileSync } from 'node:fs';
import { mkdtemp, mkdir, writeFile, rm, symlink, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { isBlockedPublicArtifactPath, publicArtifactPolicySnapshot, mayPublishInformation, INFORMATION_CLASSES, assertKnownPublicSourceInventory, enforcePublicBuildInventory } from './public-artifact-policy.mjs';

test('commercial Blueprint static downloads are fail-closed', () => {
  assert.equal(isBlockedPublicArtifactPath('/downloads/blueprints/TIER_1_4_LIVE.md'), true);
  assert.equal(isBlockedPublicArtifactPath('/downloads/blueprints/secret.JSON'), true);
  assert.equal(isBlockedPublicArtifactPath('/downloads/CAPITAL-AI_BYOK_2026-10-05.md'), false);
  assert.equal(isBlockedPublicArtifactPath('/branding/badges/data-pipeline-blueprint.svg'), false);
  assert.deepEqual(publicArtifactPolicySnapshot(), {
    schema: 'CAPITAL_AI_PUBLIC_ARTIFACT_POLICY@1',
    blockedPrefixes: ['/downloads/blueprints/'],
    blueprintFullArtifactsPublic: false,
  });
});

test('public homepage excludes the internal content-engine status panel while preserving the product entry points', () => {
  const source = readFileSync(new URL('../src/features/home/HomePage.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /ContentEngineConcept|SocialContentEngineStatus/);
  assert.match(source, /<Hero onExploreProduct=/);
  assert.match(source, /<HomeHubDirectory/);
  assert.match(source, /<HomeEditorialNews/);
  assert.match(source, /keine verifizierten Live-Kurse/);
});

test('classification is explicit and defaults to deny', () => {
  for (const classification of INFORMATION_CLASSES) {
    assert.equal(mayPublishInformation(classification), classification === 'PUBLIC');
  }
  for (const classification of [undefined, null, '', 'UNKNOWN', 'public', {}, true]) {
    assert.equal(mayPublishInformation(classification), false);
  }
});

test('private artifacts, encoded aliases and source maps are blocked', () => {
  for (const path of ['/downloads/blueprints', '/downloads/%62lueprints/a.md',
    '/downloads/blueprints%2fa.md', '/assets/main.js.map', '/assets/main.js%2emap',
    '/bundle-evidence.json', '/assets/%252e%252e/private', '/bad%zz', '/a/../b', '/a//b']) {
    assert.equal(isBlockedPublicArtifactPath(path), true, path);
  }
  assert.equal(isBlockedPublicArtifactPath('/'), false);
  assert.equal(isBlockedPublicArtifactPath('/branding/badges/data-pipeline-blueprint.svg'), false);
});

test('public source and build inventories reject unknown files and non-regular entries', async t => {
  const root = await mkdtemp(join(tmpdir(), 'cai-public-artifacts-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'bootstrap-failure.js'), 'synthetic fixture');
  assert.equal(await assertKnownPublicSourceInventory(root), 1);
  await writeFile(join(root, 'unknown-report.json'), '{}');
  await assert.rejects(assertKnownPublicSourceInventory(root), /Unadmitted public source artifact/);
  await assert.rejects(enforcePublicBuildInventory(root, []), /Unadmitted build artifact/);
  await rm(join(root, 'unknown-report.json'));
  await mkdir(join(root, 'assets'));
  await writeFile(join(root, 'assets', 'generated.js'), 'synthetic fixture');
  assert.deepEqual(await enforcePublicBuildInventory(root, ['assets/generated.js']), { admitted: 2, excluded: 0 });
  await writeFile(join(root, 'assets', 'generated.js.map'), '{}');
  await assert.rejects(enforcePublicBuildInventory(root, ['assets/generated.js', 'assets/generated.js.map']), /Unadmitted build artifact/);
  await rm(join(root, 'assets', 'generated.js.map'));
  await mkdir(join(root, 'downloads', 'blueprints'), { recursive: true });
  const blueprint = join(root, 'downloads', 'blueprints', 'HYBRID.md');
  await writeFile(blueprint, 'synthetic private fixture');
  assert.deepEqual(await enforcePublicBuildInventory(root, ['assets/generated.js']), { admitted: 2, excluded: 1 });
  await assert.rejects(access(blueprint));
  await symlink(join(root, 'bootstrap-failure.js'), join(root, 'alias.js'));
  await assert.rejects(enforcePublicBuildInventory(root, ['assets/generated.js', 'alias.js']), /Non-regular entry/);
});
