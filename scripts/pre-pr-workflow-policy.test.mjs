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

test('Branch Early Feedback bleibt schnell, read-only und deckt alle Domain-Branches ab', () => {
  const source = read('.github/workflows/pre-pr-critical.yml');
  const name = '.github/workflows/pre-pr-critical.yml';

  assert.ok(source.includes('name: Branch Early Feedback'));
  for (const domain of ['product', 'market', 'platform', 'trust', 'growth']) {
    assert.ok(source.includes(`capital-ai-${domain}/**`), `${name}: Branch-Muster für ${domain} fehlt`);
  }

  assert.ok(source.includes('contents: read'));
  assert.ok(source.includes('node --test scripts/pre-pr-workflow-policy.test.mjs'));
  assert.ok(source.includes('git diff --name-only origin/main...HEAD -- .github/workflows'));
  assert.ok(source.includes('git diff --check origin/main...HEAD'));

  assert.ok(!source.includes('npm ci'), 'Early Feedback darf keine Dependency-Installation erzwingen');
  assert.ok(!source.includes('preflight:full'), 'Early Feedback darf keinen vollständigen Preflight ausführen');
  assert.ok(!source.includes('git push'), 'Early Feedback muss read-only bleiben');
  assert.ok(!source.includes('gh pr create'), 'Early Feedback darf keine PRs erzeugen');
});
