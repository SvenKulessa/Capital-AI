import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workflowDir = join(root, '.github', 'workflows');
const workflowFiles = readdirSync(workflowDir).filter(name => /\.ya?ml$/.test(name)).sort();

test('alle versionierten Workflows deklarieren explizite Permissions', () => {
  assert.ok(workflowFiles.length > 0);
  for (const name of workflowFiles) {
    const source = readFileSync(join(workflowDir, name), 'utf8');
    assert.match(source, /^permissions:\s*(?:\n|$)/m, `${name}: top-level permissions fehlen`);
  }
});

test('alle externen GitHub Actions sind auf volle Commit-SHAs gepinnt', () => {
  const fullSha = /^[0-9a-f]{40}$/;
  for (const name of workflowFiles) {
    const source = readFileSync(join(workflowDir, name), 'utf8');
    for (const line of source.split('\n')) {
      const match = line.match(/^\s*(?:-\s*)?uses:\s*([^\s#]+)(?:\s+#.*)?$/);
      if (!match) continue;
      const spec = match[1];
      if (spec.startsWith('./') || spec.startsWith('docker://')) continue;
      const at = spec.lastIndexOf('@');
      assert.ok(at > 0, `${name}: unversionierte Action ${spec}`);
      assert.match(spec.slice(at + 1), fullSha, `${name}: Action nicht SHA-gepinnt: ${spec}`);
    }
  }
});

test('Branch Early Feedback bleibt leicht', () => {
  const source = readFileSync(join(workflowDir, 'pre-pr-critical.yml'), 'utf8');
  assert.match(source, /name: Branch Early Feedback/);
  assert.match(source, /contents: read/);
  assert.match(source, /git diff --check origin\/main\.\.\.HEAD/);
  assert.doesNotMatch(source, /npm ci|preflight:full|gh pr create|gh pr merge/);
});

test('Post-Merge bleibt linear und erzeugt keine neuen PRs oder Branches', () => {
  const source = readFileSync(join(workflowDir, 'post-merge-correlation.yml'), 'utf8');
  assert.match(source, /pull_request:/);
  assert.match(source, /contents: write/);
  assert.match(source, /linear-post-merge-correlation\.json/);
  assert.match(source, /\[HOLD\]/);
  assert.doesNotMatch(source, /gh pr create|gh pr merge|checkout -b|git switch -c/);
});

test('Pflichtreview ist nicht mehr periodisch', () => {
  const source = readFileSync(join(workflowDir, 'mandatory-review.yml'), 'utf8');
  assert.match(source, /workflow_dispatch/);
  assert.doesNotMatch(source, /schedule:/);
});
