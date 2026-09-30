import test from 'node:test';
import assert from 'node:assert/strict';
import { MarketInfrastructure, validateStreamConfig } from './infrastructure.mjs';

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
test('missing broker token fails closed before contacting Redis or NATS', async () => {
  const service = new MarketInfrastructure({ REDIS_URL: 'redis://127.0.0.1:1', NATS_URL: 'nats://127.0.0.1:1', NATS_TOKEN: ' ' });
  assert.equal(await service.start(), false);
  assert.equal(service.redis, null);
  assert.equal(service.nc, null);
  assert.equal(service.status().status, 'unavailable');
});
