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
