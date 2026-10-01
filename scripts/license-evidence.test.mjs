import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bundleLicenseEvidence, lockInventory } from './license-evidence.mjs';

function fixture(t, license = 'MIT', version = '1.0.0', name = 'example') {
  const root = mkdtempSync(join(tmpdir(), 'license-evidence-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const path = 'node_modules/' + name;
  const dir = join(root, path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(root, 'package-lock.json'), JSON.stringify({ lockfileVersion: 3, packages: { '': { name: 'private-app' }, [path]: { version, license } } }));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version, license }));
  writeFileSync(join(dir, 'index.js'), 'export default 1');
  return { root, dir, id: join(dir, 'index.js') };
}

test('retains nested license/NOTICE files and their content hashes', t => {
  const f = fixture(t);
  mkdirSync(join(f.dir, 'vendor'));
  writeFileSync(join(f.dir, 'LICENSE'), 'MIT copyright example');
  writeFileSync(join(f.dir, 'vendor/NOTICE'), 'Additional vendor copyright');
  const evidence = bundleLicenseEvidence(f.root, [f.id, f.id + '?commonjs']);
  assert.equal(evidence.inventory.packages.length, 1);
  assert.equal(evidence.inventory.packages[0].licenseFiles.length, 2);
  assert.match(evidence.text, /Additional vendor copyright/);
  assert.match(evidence.inventory.noticesSha256, /^[a-f0-9]{64}$/);
  assert.equal(evidence.inventory.deployEligible, false);
});

test('does not allow missing license texts', t => {
  const f = fixture(t);
  assert.throws(() => bundleLicenseEvidence(f.root, [f.id]), /Missing license text/);
});

test('does not silently accept an unreviewed bundled license', t => {
  const f = fixture(t, 'AGPL-3.0-only');
  writeFileSync(join(f.dir, 'LICENSE'), 'AGPL text');
  assert.equal(lockInventory(f.root).packages[0].metadataStatus, 'UNREVIEWED');
  assert.throws(() => bundleLicenseEvidence(f.root, [f.id]), /explicit distribution review/);
});

test('MPL build-tool metadata is not a blanket frontend permission', t => {
  const f = fixture(t, 'MPL-2.0', '1.33.0', 'lightningcss');
  writeFileSync(join(f.dir, 'LICENSE'), 'MPL text');
  assert.equal(lockInventory(f.root).packages[0].metadataStatus, 'BUILD_TOOL_REVIEW');
  assert.throws(() => bundleLicenseEvidence(f.root, [f.id]), /explicit distribution review/);
});

test('makes the Apache alternative explicit while retaining both license files', t => {
  const f = fixture(t, '(MPL-2.0 OR Apache-2.0)');
  writeFileSync(join(f.dir, 'LICENSE'), 'Apache text');
  writeFileSync(join(f.dir, 'LICENSE-MPL'), 'MPL text');
  const evidence = bundleLicenseEvidence(f.root, [f.id]);
  assert.equal(evidence.inventory.packages[0].selectedLicense, 'Apache-2.0');
  assert.equal(evidence.inventory.packages[0].licenseFiles.length, 2);
});

test('detects an installed version differing from lockfile', t => {
  const f = fixture(t);
  writeFileSync(join(f.dir, 'LICENSE'), 'MIT text');
  writeFileSync(join(f.dir, 'package.json'), JSON.stringify({ name: 'example', version: '2.0.0', license: 'MIT' }));
  assert.throws(() => bundleLicenseEvidence(f.root, [f.id]), /differs from lockfile/);
});

test('does not accept empty bundle evidence or unlocked dependency modules', t => {
  const f = fixture(t);
  assert.throws(() => bundleLicenseEvidence(f.root, []), /cannot be empty/);
  assert.throws(() => bundleLicenseEvidence(f.root, [join(f.root, 'node_modules/unknown/index.js')]), /absent from lockfile/);
});

test('README fallback is version bounded and includes the actual license text', t => {
  const f = fixture(t, 'MIT', '1.0.7', 'cookie-signature');
  writeFileSync(join(f.dir, 'Readme.md'), 'Permission is hereby granted\nTHE SOFTWARE IS PROVIDED');
  assert.match(bundleLicenseEvidence(f.root, [f.id]).text, /Readme.md/);
  writeFileSync(join(f.dir, 'Readme.md'), 'No license text');
  assert.throws(() => bundleLicenseEvidence(f.root, [f.id]), /Missing license text/);
});

test('Nodemailer review requires the exact registry artifact and unchanged license text', t => {
  const f = fixture(t, 'MIT-0', '10.0.13', 'nodemailer');
  const currentLock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url)));
  const reviewed = currentLock.packages['node_modules/nodemailer'];
  const license = readFileSync(new URL('../docs/licenses/nodemailer-10.0.13-MIT-0.txt', import.meta.url));
  mkdirSync(join(f.root, 'docs/licenses'), { recursive: true });
  writeFileSync(join(f.root, 'docs/licenses/nodemailer-10.0.13-MIT-0.txt'), license);
  const writeLock = entry => writeFileSync(join(f.root, 'package-lock.json'), JSON.stringify({
    lockfileVersion: 3, packages: { '': {}, 'node_modules/nodemailer': entry },
  }));
  writeLock(reviewed);
  assert.equal(lockInventory(f.root).packages[0].metadataStatus, 'DEPENDENCY_DISTRIBUTION_REVIEW');
  assert.equal(lockInventory(f.root).deployEligible, false);
  for (const change of [
    { version: '10.0.14' }, { integrity: 'changed' },
    { resolved: 'https://untrusted.example/nodemailer.tgz' }, { license: 'AGPL-3.0-only' },
  ]) {
    writeLock({ ...reviewed, ...change });
    assert.equal(lockInventory(f.root).packages[0].metadataStatus, 'UNREVIEWED');
  }
  writeLock(reviewed);
  writeFileSync(join(f.root, 'docs/licenses/nodemailer-10.0.13-MIT-0.txt'), 'altered license');
  assert.equal(lockInventory(f.root).packages[0].metadataStatus, 'UNREVIEWED');
});

test('MIT-0 review does not cover arbitrary packages or frontend distribution', t => {
  const f = fixture(t, 'MIT-0');
  writeFileSync(join(f.dir, 'LICENSE'), 'MIT-0');
  assert.equal(lockInventory(f.root).packages[0].metadataStatus, 'UNREVIEWED');
  assert.throws(() => bundleLicenseEvidence(f.root, [f.id]), /explicit distribution review/);
});
