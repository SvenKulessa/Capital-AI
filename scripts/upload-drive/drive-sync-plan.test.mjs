import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildPlan, assertRepoPath, classifyPath, stableSourceId, validateMapping, walkDocs } from './drive-sync-plan.mjs';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const base = JSON.parse(fs.readFileSync(path.join(currentDir, 'mapping.v1.json'), 'utf8'));
function fixture(t, files = { 'platform/demo.md': 'demonstration only' }, opts = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'capital-ai-docsync-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const docsRoot = path.join(root, 'docs');
  fs.mkdirSync(docsRoot);
  for (const [relative, data] of Object.entries(files)) {
    const filename = path.join(docsRoot, relative);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, data);
  }
  const mapping = structuredClone(base);
  mapping.approvedFiles = opts.approved ?? ['docs/platform/demo.md'];
  return { root, docsRoot, mapping };
}
function inventory(options = {}) {
  const folders = (options.folders || [{ key: 'PLATFORM', name: 'PLATFORM', id: 'folder-platform', parentId: 'root-test' }]);
  return { schemaVersion: 'capital-ai.doc-tree-inventory.v1', rootKey: 'CAPITAL-AI', rootId: 'root-test', folders, files: options.files || [] };
}
function docKey() { return stableSourceId('docs/platform/demo.md'); }

test('mapping schema has no active Drive credentials or remote access', () => {
  assert.equal(validateMapping(base), base);
  assert.equal(base.auth.mode, 'NONE');
  assert.equal(base.mode, 'DRY_RUN_ONLY');
  assert.equal(base.approvedFiles.length, 1);
  assert.ok(!JSON.stringify(base).includes('1q3R-enFc-')); // actual private target IDs stay out of git
});

test('path traversal, absolute paths, Windows separators and NUL are rejected', () => {
  for (const value of ['docs/../secret.md', '../private.md', 'docs//x.md', '/docs/x.md', 'C:/docs/x.md', 'docs\\x.md', 'docs/./x.md', 'docs/x.md\0']) {
    assert.throws(() => assertRepoPath(value), /INVALID_REPO_PATH/, value);
  }
  assert.throws(() => stableSourceId('elsewhere/file.md'), /OUTSIDE_DOCS_ROOT/);
});

test('stable IDs remain identical across repeated plans and differ for different paths', () => {
  assert.equal(docKey(), stableSourceId('docs/platform/demo.md'));
  assert.notEqual(docKey(), stableSourceId('docs/growth/demo.md'));
  assert.match(docKey(), /^caid-[0-9a-f]{64}$/);
});

test('PUBLIC/INTERNAL/RESTRICTED/SECRET classes are supported and fail closed', () => {
  const m = structuredClone(base);
  m.approvedFiles = ['docs/platform/demo.md', 'docs/product/public.md'];
  m.fileRules = [{ path: 'docs/product/public.md', folderKey: 'PRODUCT', classification: 'PUBLIC' }];
  assert.equal(classifyPath('docs/platform/demo.md', m).classification, 'INTERNAL');
  assert.equal(classifyPath('docs/product/public.md', m).classification, 'PUBLIC');
  assert.equal(classifyPath('docs/security/ops.md', m).classification, 'RESTRICTED');
  assert.equal(classifyPath('docs/platform/service-account.json', m).classification, 'SECRET');
  assert.equal(classifyPath('docs/unknown/guide.md', m).allowed, false);
});

test('unapproved documents are blocked, with no filename in blocked plan row', (t) => {
  const f = fixture(t, { 'platform/demo.md': 'demo', 'product/internal.md': 'internal' });
  const plan = buildPlan({ mapping: f.mapping, docsRoot: f.docsRoot, inventory: inventory() });
  assert.equal(plan.summary.PLAN_CREATE, 1);
  assert.equal(plan.summary.BLOCKED, 1);
  const blocked = plan.rows.find((row) => row.action === 'BLOCKED');
  assert.equal(blocked.reason, 'NOT_APPROVED');
  assert.equal(blocked.sourcePath, undefined);
  assert.equal(blocked.targetName, undefined);
  assert.equal(plan.writes, 0);
  assert.equal(plan.networkRequests, 0);
});

test('no provider inventory means never guess CREATE or UPDATE', (t) => {
  const f = fixture(t);
  const result = buildPlan({ mapping: f.mapping, docsRoot: f.docsRoot });
  assert.equal(result.summary.BLOCKED, 1);
  assert.equal(result.rows[0].reason, 'REMOTE_INVENTORY_REQUIRED');
});

test('known target folder produces only an offline PLAN_CREATE', (t) => {
  const f = fixture(t);
  const p = buildPlan({ mapping: f.mapping, docsRoot: f.docsRoot, inventory: inventory() });
  assert.equal(p.rows[0].action, 'PLAN_CREATE');
  assert.equal(p.rows[0].sourcePath, 'docs/platform/demo.md');
  assert.equal(p.writes, 0);
});

test('hash parity skips and content delta plans update', (t) => {
  const f = fixture(t);
  const current = buildPlan({ mapping: f.mapping, docsRoot: f.docsRoot, inventory: inventory() }).rows[0];
  const files = [{ id: 'remote-file-1', name: 'demo.md', parentId: 'folder-platform', syncKey: docKey(), sha256: current.sha256 }];
  assert.equal(buildPlan({ mapping: f.mapping, docsRoot: f.docsRoot, inventory: inventory({ files }) }).rows[0].action, 'SKIP');
  fs.writeFileSync(path.join(f.docsRoot, 'platform/demo.md'), 'new body');
  assert.equal(buildPlan({ mapping: f.mapping, docsRoot: f.docsRoot, inventory: inventory({ files }) }).rows[0].action, 'PLAN_UPDATE');
});

test('case-insensitive duplicate local paths are rejected', (t) => {
  const f = fixture(t, { 'platform/Demo.md': '1', 'platform/demo.md': '2' });
  assert.throws(() => walkDocs(f.docsRoot), /LOCAL_CASEFOLD_DUPLICATE/);
});

test('symlinks never followed, even when name is on allowlist', (t) => {
  const f = fixture(t, { 'platform/safe.md': 'public' }, { approved: ['docs/platform/link.md'] });
  fs.symlinkSync(path.join(f.docsRoot, 'platform/safe.md'), path.join(f.docsRoot, 'platform/link.md'));
  const plan = buildPlan({ mapping: f.mapping, docsRoot: f.docsRoot, inventory: inventory() });
  assert.equal(plan.rows.find((r) => r.sourceId === stableSourceId('docs/platform/link.md')).reason, 'SYMLINK_DENIED');
  assert.equal(plan.summary.PLAN_CREATE, 0);
});

test('symlinked docs root is rejected', (t) => {
  const f = fixture(t);
  const linked = path.join(f.root, 'linked-docs');
  fs.symlinkSync(f.docsRoot, linked, 'dir');
  assert.throws(() => walkDocs(linked), /INVALID_LOCAL_ROOT/);
});

test('duplicate folder mapping names and remote filenames fail closed', (t) => {
  const f = fixture(t);
  const broken = structuredClone(f.mapping);
  broken.folders.push({ key: 'platform', name: 'platform', parentKey: 'CAPITAL-AI' });
  assert.throws(() => validateMapping(broken), /DUPLICATE_FOLDER_MAPPING/);
  const files = [
    { id: 'id-a', name: 'demo.md', parentId: 'folder-platform', syncKey: docKey() },
    { id: 'id-b', name: 'DEMO.md', parentId: 'folder-platform', syncKey: stableSourceId('docs/platform/another.md') }
  ];
  assert.throws(() => buildPlan({ mapping: f.mapping, docsRoot: f.docsRoot, inventory: inventory({ files }) }), /DUPLICATE_REMOTE_NAME/);
});

test('unknown or duplicate remote source IDs are rejected', (t) => {
  const f = fixture(t);
  const files = [
    { id: 'id-a', name: 'demo.md', parentId: 'folder-platform', syncKey: docKey() },
    { id: 'id-b', name: 'other.md', parentId: 'folder-platform', syncKey: docKey() }
  ];
  assert.throws(() => buildPlan({ mapping: f.mapping, docsRoot: f.docsRoot, inventory: inventory({ files }) }), /DUPLICATE_REMOTE_SOURCE_ID/);
});

test('existing filename with another identity is not overwritten', (t) => {
  const f = fixture(t);
  const files = [{ id: 'id-a', name: 'demo.md', parentId: 'folder-platform', syncKey: stableSourceId('docs/platform/other.md') }];
  const row = buildPlan({ mapping: f.mapping, docsRoot: f.docsRoot, inventory: inventory({ files }) }).rows[0];
  assert.equal(row.action, 'CONFLICT');
  assert.equal(row.reason, 'NAME_COLLISION');
});

test('cross-folder remote folder parent is rejected', (t) => {
  const f = fixture(t);
  const folders = [{ key: 'PLATFORM', name: 'PLATFORM', id: 'folder-platform', parentId: 'untrusted-root' }];
  assert.throws(() => buildPlan({ mapping: f.mapping, docsRoot: f.docsRoot, inventory: inventory({ folders }) }), /CROSS_FOLDER_TARGET/);
});

test('cross-folder remote file parent is rejected', (t) => {
  const f = fixture(t);
  const files = [{ id: 'f-1', name: 'demo.md', parentId: 'untrusted-folder', syncKey: docKey() }];
  assert.throws(() => buildPlan({ mapping: f.mapping, docsRoot: f.docsRoot, inventory: inventory({ files }) }), /CROSS_FOLDER_FILE/);
});

test('same stable ID under a different allowed folder is a conflict, not an update', (t) => {
  const f = fixture(t);
  const folders = [
    { key: 'PLATFORM', name: 'PLATFORM', id: 'folder-platform', parentId: 'root-test' },
    { key: 'TRUST', name: 'TRUST', id: 'folder-trust', parentId: 'root-test' }
  ];
  const files = [{ id: 'f-1', name: 'demo.md', parentId: 'folder-trust', syncKey: docKey() }];
  const row = buildPlan({ mapping: f.mapping, docsRoot: f.docsRoot, inventory: inventory({ files, folders }) }).rows[0];
  assert.equal(row.action, 'CONFLICT');
  assert.equal(row.reason, 'CROSS_FOLDER_OR_RENAME');
});

test('secret filenames and restricted directories are blocked regardless of approval', (t) => {
  const f = fixture(t, { 'platform/service-account.json': '{"private_key":"fake"}', 'security/confidential.md': 'not for projection', 'platform/demo.md': 'okay' }, { approved: ['docs/security/confidential.md', 'docs/platform/demo.md'] });
  const rows = buildPlan({ mapping: f.mapping, docsRoot: f.docsRoot, inventory: inventory() }).rows;
  assert.equal(rows.find((r) => r.sourceId === stableSourceId('docs/platform/service-account.json')).reason, 'SENSITIVE_FILENAME');
  assert.equal(rows.find((r) => r.sourceId === stableSourceId('docs/security/confidential.md')).reason, 'RESTRICTED_CLASS');
  assert.equal(rows.filter((r) => r.action === 'PLAN_CREATE').length, 1);
});

test('sensitive secret content blocks otherwise-approved Markdown', (t) => {
  const f = fixture(t, { 'platform/demo.md': '-----BEGIN PRIVATE KEY-----\nFAKE-SECRET-TEST\n-----END PRIVATE KEY-----' });
  const row = buildPlan({ mapping: f.mapping, docsRoot: f.docsRoot, inventory: inventory() }).rows[0];
  assert.equal(row.reason, 'CONTENT_SECRET_SIGNATURE');
  assert.equal(row.sourcePath, undefined);
});

test('size limit blocks approved Markdown', (t) => {
  const f = fixture(t);
  f.mapping.maxFileBytes = 10;
  assert.equal(buildPlan({ mapping: f.mapping, docsRoot: f.docsRoot, inventory: inventory() }).rows[0].reason, 'FILE_TOO_LARGE');
});

test('runtime enabling auth, uploads or broad extensions is rejected', () => {
  const m = structuredClone(base);
  m.mode = 'APPLY';
  assert.throws(() => validateMapping(m), /INVALID_MAPPING_CONTRACT/);
  m.mode = 'DRY_RUN_ONLY'; m.auth.remoteAccess = true;
  assert.throws(() => validateMapping(m), /AUTH_MUST_BE_DISABLED/);
  m.auth.remoteAccess = false; m.allowedExtensions.push('.json');
  assert.throws(() => validateMapping(m), /UNSAFE_EXTENSION_ALLOWLIST/);
});

test('CLI refuses --apply and does not emit blocked private paths', (t) => {
  const f = fixture(t, { 'platform/demo.md': 'okay', 'security/private.md': 'secret' });
  const configFile = path.join(f.root, 'mapping.json');
  fs.writeFileSync(configFile, JSON.stringify(f.mapping));
  const script = path.join(currentDir, 'drive-sync-plan.mjs');
  const bad = spawnSync(process.execPath, [script, '--mapping', configFile, '--docs-root', f.docsRoot, '--apply'], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /UNSUPPORTED_CLI_ARGUMENT/);
  const good = spawnSync(process.execPath, [script, '--mapping', configFile, '--docs-root', f.docsRoot], { encoding: 'utf8' });
  assert.equal(good.status, 0, good.stderr);
  const output = JSON.parse(good.stdout);
  assert.equal(output.writes, 0);
  assert.equal(output.networkRequests, 0);
  assert.ok(!good.stdout.includes('security/private.md'));
  assert.equal(output.summary.BLOCKED, 2); // approved file cannot proceed without a remote inventory
});


test('hardlinked allowlisted Markdown is denied', (t) => {
  const f = fixture(t, { 'platform/original.md': 'data' }, { approved: ['docs/platform/duplicate.md'] });
  fs.linkSync(path.join(f.docsRoot, 'platform/original.md'), path.join(f.docsRoot, 'platform/duplicate.md'));
  const result = buildPlan({ mapping: f.mapping, docsRoot: f.docsRoot, inventory: inventory() });
  assert.equal(result.rows.find((r) => r.sourceId === stableSourceId('docs/platform/duplicate.md')).reason, 'FILE_CHANGED_OR_HARDLINK_DENIED');
});

test('file-class rule cannot promote protected security path', () => {
  const m = structuredClone(base);
  m.approvedFiles = ['docs/security/internal.md'];
  m.fileRules = [{path:'docs/security/internal.md',folderKey:'PLATFORM',classification:'PUBLIC'}];
  assert.equal(classifyPath('docs/security/internal.md',m).classification, 'RESTRICTED');
  assert.equal(classifyPath('docs/security/internal.md',m).allowed, false);
});

test('remote names with traversal separators are rejected', (t) => {
  const f = fixture(t);
  const files = [{ id: 'f1', name: '../demo.md', parentId:'folder-platform', syncKey:docKey() }];
  assert.throws(() => buildPlan({mapping:f.mapping,docsRoot:f.docsRoot,inventory:inventory({files})}), /INVALID_REMOTE_NAME/);
});

test('different local paths flattened to one target folder/name are conflicts', (t) => {
  const f = fixture(t, { 'platform/same.md': 'one', 'architecture/same.md': 'two' }, { approved: ['docs/platform/same.md', 'docs/architecture/same.md'] });
  const plan = buildPlan({ mapping: f.mapping, docsRoot: f.docsRoot, inventory: inventory() });
  assert.equal(plan.summary.CONFLICT, 2);
  assert.equal(plan.summary.PLAN_CREATE, 0);
  assert.ok(plan.rows.every((r) => r.reason === 'LOCAL_TARGET_NAME_COLLISION'));
});
