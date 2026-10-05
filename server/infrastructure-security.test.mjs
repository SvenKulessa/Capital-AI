import test from 'node:test';
import assert from 'node:assert/strict';
import { MarketInfrastructure, natsConnectionAuth, validateStreamConfig } from './infrastructure.mjs';

const safe = { storage: 'file', discard: 'new', deny_delete: true, deny_purge: true,
  max_age: 0, num_replicas: 1, max_bytes: 1073741824, max_msg_size: 262144,
  subjects: ['capital.facts.quote.*'] };
test('stream drift cannot remove resource bounds or widen the event subject', () => {
  assert.doesNotThrow(() => validateStreamConfig(safe, 1));
  for (const change of [{ max_bytes: -1 }, { max_msg_size: -1 }, { subjects: ['capital.facts.quote.*', '>'] },
    { subjects: ['>'] }, { storage: 'memory' }, { deny_delete: false }, { deny_purge: false },
    { max_age: 1 }, { num_replicas: 3 }]) {
    assert.throws(() => validateStreamConfig({ ...safe, ...change }, 1), /UNSAFE_STREAM_CONFIG/);
  }
});
test('scoped NATS credentials are preferred and incomplete credentials fail closed', () => {
  assert.deepEqual(natsConnectionAuth({ NATS_APP_USER: 'capital-ai-market-runtime', NATS_APP_PASSWORD: 'secret', NATS_TOKEN: 'legacy' }),
    { user: 'capital-ai-market-runtime', pass: 'secret', mode: 'scoped_user' });
  assert.deepEqual(natsConnectionAuth({ NATS_TOKEN: 'legacy' }), { token: 'legacy', mode: 'legacy_token' });
  assert.throws(() => natsConnectionAuth({ NATS_APP_USER: 'capital-ai-market-runtime' }), /NATS_SCOPED_CREDENTIALS_INCOMPLETE/);
  assert.throws(() => natsConnectionAuth({}), /NATS_CREDENTIALS_REQUIRED/);
});
test('missing broker credentials fail closed before contacting Redis or NATS', async () => {
  const service = new MarketInfrastructure({ REDIS_URL: 'redis://127.0.0.1:1', NATS_URL: 'nats://127.0.0.1:1' });
  assert.equal(await service.start(), false);
  assert.equal(service.redis, null);
  assert.equal(service.nc, null);
  assert.equal(service.status().status, 'unavailable');
});
