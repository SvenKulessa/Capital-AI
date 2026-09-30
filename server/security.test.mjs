import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from './index.mjs';

test('HTTP security boundaries and static-file isolation', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'capital-security-'));
  await writeFile(path.join(root, 'index.html'), '<html>test</html>');
  await writeFile(path.join(root, '.env'), 'SECRET=hidden');
  await writeFile(path.join(root, 'THIRD_PARTY_NOTICES.txt'), 'Third-party copyright notice');
  await writeFile(path.join(root, 'frontend-license-inventory.json'), '{"schemaVersion":1}');
  await symlink('/etc/passwd', path.join(root, 'escape.txt'));
  const server = createApp(root);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const health = await fetch(base + '/healthz');
    assert.equal(health.status, 200);
    assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(health.headers.get('x-frame-options'), 'DENY');
    assert.equal(health.headers.get('cache-control'), 'no-store');
    const healthBody = await health.json();
    assert.equal(typeof healthBody.buildIdentity?.bound, 'boolean');
    if (healthBody.buildIdentity.bound) {
      assert.match(healthBody.buildIdentity.sourceSha, /^[0-9a-f]{40}$/);
      assert.equal(healthBody.buildIdentity.builder, 'SvenKulessa/Capital-AI/.github/workflows/build-security.yml');
    } else {
      assert.deepEqual(healthBody.buildIdentity, { bound: false, sourceSha: null });
    }
    const notices = await fetch(base + '/THIRD_PARTY_NOTICES.txt');
    assert.equal(notices.status, 200);
    assert.equal(notices.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert.equal(await notices.text(), 'Third-party copyright notice');
    const inventory = await fetch(base + '/frontend-license-inventory.json');
    assert.equal(inventory.headers.get('content-type'), 'application/json; charset=utf-8');
    assert.deepEqual(await inventory.json(), {schemaVersion: 1});
    assert.equal((await fetch(base + '/.env')).status, 404);
    assert.equal((await fetch(base + '/escape.txt')).status, 404);
    assert.equal((await fetch(base + '/api/unknown')).status, 404);
    assert.equal((await fetch(base + '/%ZZ')).status, 400);
    assert.equal((await fetch(base + '/healthz', {method: 'POST'})).status, 405);
    assert.equal((await fetch(base + '/profile')).status, 200);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(root, {recursive: true, force: true});
  }
});
