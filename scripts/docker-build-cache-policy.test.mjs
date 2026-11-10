import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workflow = readFileSync(resolve(root, '.github/workflows/build-security.yml'), 'utf8');
const scanner = readFileSync(resolve(root, 'Dockerfile.security'), 'utf8');

function namedStep(name) {
  const escaped = name.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp('^      - name: ' + escaped + '\\n([\\s\\S]*?)(?=^      - name: |^  publish_candidate:|$)', 'm');
  const match = workflow.match(pattern);
  assert.ok(match, 'Missing step: ' + name);
  return match[0];
}

test('BuildKit cache comes from immutable, pinned Docker actions with local-scanned images', () => {
  const build = namedStep('Build-Stufe ohne Installationswerkzeug bauen');
  const runtime = namedStep('Image mit Tests und isoliertem Frontend-Build bauen');
  const setup = namedStep('GitHub-gehosteten BuildKit-Layer-Cache vorbereiten');
  assert.match(setup, /uses: docker\/setup-buildx-action@[0-9a-f]{40}/);
  for (const step of [build, runtime]) {
    assert.match(step, /uses: docker\/build-push-action@[0-9a-f]{40}/);
    assert.match(step, /context: \.\n/);
    assert.match(step, /pull: true/);
    assert.match(step, /load: true/);
    assert.match(step, /push: false/);
    assert.match(step, /cache-from: type=gha,scope=capital-ai-verified-build/);
  }
  assert.match(build, /target: build/);
  assert.match(build, /tags: capital-ai-build:/);
  assert.match(runtime, /tags: capital-ai:/);
});

test('only trusted main push can export the shared BuildKit cache', () => {
  const build = namedStep('Build-Stufe ohne Installationswerkzeug bauen');
  const runtime = namedStep('Image mit Tests und isoliertem Frontend-Build bauen');
  assert.doesNotMatch(build, /cache-to:/);
  assert.match(runtime, /cache-to: \\$\{\{ github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
  assert.doesNotMatch(runtime, /ignore-error=true|cache-mode:\s*write/);
});

test('Required check, Trivy DB freshness, and scans remain in effect for every PR', () => {
  assert.match(workflow, /name: Docker Security Gate/);
  assert.match(workflow, /^  pull_request:/m);
  assert.match(workflow, /Quellcode, Secrets und Konfiguration scannen/);
  assert.match(workflow, /Build-Stufe auf Schwachstellen, Secrets und Lizenzen scannen/);
  assert.match(workflow, /Exaktes Image exportieren und scannen/);
  assert.match(workflow, /Runtime ohne Schreibrechte und Linux-Capabilities prüfen/);
  assert.match(scanner, /TRIVY_SKIP_DB_UPDATE=false/);
});
