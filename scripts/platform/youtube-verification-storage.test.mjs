import test from 'node:test';
import assert from 'node:assert/strict';
import { readDemoObject } from './youtube-verification-storage.mjs';

const options = { bucket: 'private-demo-test', generation: '1730991234567890', token: 'synthetic-storage-token' };

test('reads the fixed object at the exact generation and rejects redirects', async () => {
  const bytes = Buffer.from('encrypted fixture');
  const result = await readDemoObject({ ...options, fetchImpl: async (url, init) => {
    const target = new URL(url);
    assert.equal(target.origin, 'https://storage.googleapis.com');
    assert.equal(target.pathname, '/storage/v1/b/private-demo-test/o/youtube-verification%2Fdemo-key-rotation-01.mp4.enc');
    assert.equal(target.searchParams.get('generation'), options.generation);
    assert.equal(target.searchParams.get('alt'), 'media');
    assert.equal(init.headers.Authorization, 'Bearer ' + options.token);
    assert.equal(init.redirect, 'error');
    return new Response(bytes);
  } });
  assert.deepEqual(result, bytes);
});

test('invalid bucket, missing generation or invalid token never sends a request', async () => {
  const fetchImpl = () => assert.fail('unexpected request');
  for (const patch of [{ bucket: 'other/b/path' }, { generation: '' }, { token: 'token with spaces' }]) {
    await assert.rejects(() => readDemoObject({ ...options, ...patch, fetchImpl }));
  }
});

test('provider denials and empty objects cannot reach media validation', async () => {
  await assert.rejects(() => readDemoObject({ ...options, fetchImpl: async () => new Response('denied', { status: 403 }) }), /STORAGE_READ_FAILED/);
  await assert.rejects(() => readDemoObject({ ...options, fetchImpl: async () => new Response('') }), /STORAGE_OBJECT_EMPTY/);
});
