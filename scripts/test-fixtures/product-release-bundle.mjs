// Synthetic regression evidence only. Never publish this fixture as production evidence.
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { PRODUCT_RELEASE_REQUIREMENTS } from '../verify-product-release-prerequisites.mjs';

export function productReleaseFixture(sourceSha, imageRef, component = 'web') {
  const directory = mkdtempSync(join(tmpdir(), 'capital-release-test-'));
  const write = (path, value) => {
    const bytes = Buffer.from(JSON.stringify(value));
    writeFileSync(join(directory, path), bytes);
    return { path, sha256: 'sha256:' + createHash('sha256').update(bytes).digest('hex') };
  };
  const componentIds = Array.from({ length: 50 }, (_, i) => 'test-fixture-' + i);
  const components = componentIds.map(id => {
    const row = { id };
    for (const kind of ['prompt', 'content', 'implementation', 'test']) row[kind] = write(id + '-' + kind + '.json', { fixture: true, id, kind });
    row.result = write(id + '-result.json', { componentId: id, sourceSha, imageRef, component, status: 'PASS', environment: 'production', result: { fixture: true } });
    return row;
  });
  const requirements = Object.entries(PRODUCT_RELEASE_REQUIREMENTS).map(([id, checks]) => ({ id, evidence: write(id + '.json', { requirementId: id, sourceSha, imageRef, component, status: 'PASS', environment: 'production', observedAt: new Date().toISOString(), checks: Object.fromEntries(checks.map(check => [check, 'PASS'])), componentIds }) }));
  return { directory, manifest: { schema: 'CAPITAL_AI_PRODUCT_RELEASE_PREREQUISITES@1', sourceSha, imageRef, component, requirements, componentCatalog: write('components.json', { sourceSha, components }) }, cleanup: () => rmSync(directory, { recursive: true, force: true }) };
}
