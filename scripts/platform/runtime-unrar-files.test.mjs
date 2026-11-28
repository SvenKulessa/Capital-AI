import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { inspectOptionalUnrarFiles } from './runtime-unrar-files.mjs';

function setup(t) {
  const root = mkdtempSync(join(tmpdir(), 'cap-unrar-image-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const directory of ['usr/lib', 'usr/local/lib', 'lib', 'app/node_modules', 'opt/ga4-mcp/lib']) {
    mkdirSync(join(root, directory), { recursive: true });
  }
  const put = (name, bytes) => {
    const file = join(root, name);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, bytes);
    return file;
  };
  put('usr/lib/libclamav.so.12', Buffer.from('binary-loader-check: libclamunrar_iface'));
  return { root, put };
}

test('bounded library roots and libclamav literal are technical hints, never rights approval', t => {
  const { root } = setup(t);
  const report = inspectOptionalUnrarFiles(root);
  assert.equal(report.status, 'COMPLETE_IN_LISTED_SEARCH_ROOTS_ONLY');
  assert.deepEqual(report.namedLibraryCandidates, []);
  assert.equal(report.scannedRoots.length, 5);
  assert.equal(report.libclamavOptionalLoaderMarker, 'LOADER_LITERAL_BYTES_OBSERVED');
  assert.equal(report.wholeImageAbsence, 'NOT_PROVEN');
  assert.equal(report.staticUnrarInclusion, 'NOT_PROVEN');
  assert.equal(report.lateRuntimeLoading, 'NOT_PROVEN');
  assert.equal(report.redistributionApproved, false);
});

test('untracked libclamunrar binary is discovered outside APK-owned files', t => {
  const { root, put } = setup(t);
  put('usr/local/lib/libclamunrar_iface.so.12', 'real library bytes');
  const report = inspectOptionalUnrarFiles(root);
  assert(report.namedLibraryCandidates.includes('/usr/local/lib/libclamunrar_iface.so.12'));
});

test('nested node_modules UnRAR file is not silently omitted', t => {
  const { root, put } = setup(t);
  put('app/node_modules/foo/native/libUnRaR.so', 'nested unrar');
  assert(inspectOptionalUnrarFiles(root).namedLibraryCandidates.includes('/app/node_modules/foo/native/libUnRaR.so'));
});

test('external symlink cannot produce fake negative file inventory', t => {
  const { root } = setup(t);
  const external = mkdtempSync(join(tmpdir(), 'cap-outside-'));
  t.after(() => rmSync(external, { recursive: true, force: true }));
  symlinkSync(external, join(root, 'usr/lib/outside'), 'dir');
  assert.throws(() => inspectOptionalUnrarFiles(root), /Symlink escapes image root/);
});

test('in-root symlink directories are skipped and counted, not presumed scanned', t => {
  const { root } = setup(t);
  mkdirSync(join(root, 'usr/lib/subdir'), { recursive: true });
  symlinkSync('subdir', join(root, 'usr/lib/linkdir'), 'dir');
  const report = inspectOptionalUnrarFiles(root);
  assert(report.symlinkDirectoriesSkipped >= 1);
  assert.equal(report.wholeImageAbsence, 'NOT_PROVEN');
});

test('missing optional roots are enumerated without full image absence claim', t => {
  const { root } = setup(t);
  rmSync(join(root, 'opt/ga4-mcp/lib'), { recursive: true });
  const report = inspectOptionalUnrarFiles(root);
  assert(report.missingRoots.includes('/opt/ga4-mcp/lib'));
  assert.equal(report.wholeImageAbsence, 'NOT_PROVEN');
});

test('unavailable libclamav bytes cannot become optional-loader proof', t => {
  const { root } = setup(t);
  const report = inspectOptionalUnrarFiles(root, '/usr/lib/other.so');
  assert.equal(report.libclamavOptionalLoaderMarker, 'NOT_PROVEN');
});
