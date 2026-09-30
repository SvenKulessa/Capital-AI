import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createClient } from 'redis';
import { connect } from '@nats-io/transport-node';
import { jetstream, jetstreamManager, StorageType, DiscardPolicy } from '@nats-io/jetstream';
import { validateStreamConfig } from '../server/infrastructure.mjs';

export async function verifyPrivateBrokers(env = process.env) {
  if (!env.REDIS_URL || !env.NATS_URL || !env.NATS_TOKEN?.trim()) throw new Error('BROKER_CREDENTIALS_REQUIRED');
  const id = randomUUID().replaceAll('-', '');
  const stream = `CAPITAL_PROBE_${id}`;
  const subject = `capital.probe.${id}.quote`;
  const key = `capital:probe:${id}:cache`, channel = `capital:probe:${id}:events`;
  const payload = JSON.stringify({ probe: true, nonce: id });
  const hash = value => createHash('sha256').update(value).digest('hex');
  const redis = createClient({ url: env.REDIS_URL, disableOfflineQueue: true,
    socket: { connectTimeout: 3000, reconnectStrategy: false } });
  redis.on('error', () => {});
  let subscriber, nc, manager, created = false, stage = 'connect', cleanupFailed = false;
  const results = [];
  try {
    await redis.connect();
    const options = { servers: env.NATS_URL, token: env.NATS_TOKEN, timeout: 3000, reconnect: false };
    nc = await connect(options);
    manager = await jetstreamManager(nc, { timeout: 3000 });
    validateStreamConfig((await manager.streams.info('CAPITAL_FACTS')).config, Number(env.NATS_REPLICAS || 1));
    stage = 'authentication';
    let denied = false;
    try { const unauthorized = await connect({ ...options, token: randomUUID() }); await unauthorized.close(); }
    catch (error) { denied = /authorization|authentication/i.test(String(error.code || error.name || error.message)); }
    assert.ok(denied, 'Wrong token must be rejected by authentication, not a network timeout');
    results.push({ step: 1, check: 'authenticated_connections_and_stream_policy', status: 'PASS' });

    stage = 'isolated_pubsub';
    subscriber = redis.duplicate(); subscriber.on('error', () => {}); await subscriber.connect();
    let timer, resolveDelivery;
    const delivery = new Promise(resolve => { resolveDelivery = resolve; });
    await subscriber.subscribe(channel, message => resolveDelivery(message));
    try {
      // Exercise the application's atomic SET/PUBLISH pattern, on probe-only names with short TTL.
      await redis.eval("redis.call('SET',KEYS[1],ARGV[1],'PX',5000);return redis.call('PUBLISH',ARGV[2],ARGV[1])",
        { keys: [key], arguments: [payload, channel] });
      const received = await Promise.race([delivery, new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('PUBSUB_TIMEOUT')), 3000);
      })]);
      assert.equal(received, payload); assert.equal(await redis.get(key), payload);
      const ttl = await redis.pTTL(key); assert.ok(ttl > 0 && ttl <= 5000);
    } finally { clearTimeout(timer); }
    results.push({ step: 2, check: 'isolated_atomic_cache_pubsub_and_ttl', status: 'PASS' });

    stage = 'isolated_jetstream';
    await manager.streams.add({ name: stream, subjects: [subject], storage: StorageType.File,
      num_replicas: 1, discard: DiscardPolicy.New, max_bytes: 1048576, max_msgs: 2,
      max_msg_size: 1024, max_age: 120e9, duplicate_window: 30e9 });
    created = true;
    const js = jetstream(nc, { timeout: 3000 });
    const ack = await js.publish(subject, payload, { msgID: hash(payload) });
    const duplicate = await js.publish(subject, payload, { msgID: hash(payload) });
    assert.equal(ack.stream, stream); assert.equal(ack.seq, duplicate.seq); assert.equal(duplicate.duplicate, true);
    assert.equal(hash((await manager.streams.getMessage(stream, { seq: ack.seq })).string()), hash(payload));
    results.push({ step: 3, check: 'isolated_file_ack_deduplication_and_hash_replay', status: 'PASS' });

    stage = 'reconnect';
    await nc.close(); nc = await connect(options); manager = await jetstreamManager(nc, { timeout: 3000 });
    assert.equal(hash((await manager.streams.getMessage(stream, { seq: ack.seq })).string()), hash(payload));
    results.push({ step: 4, check: 'new_connection_replay', status: 'PASS' });
  } catch {
    throw new Error(`BROKER_PROBE_FAILED_${stage.toUpperCase()}`);
  } finally {
    // Never delete application streams/keys. Any leftover probe stream is age/size bounded.
    if (created) { try { await manager.streams.delete(stream); } catch { cleanupFailed = true; } }
    if (redis.isReady) { try { await redis.del(key); } catch { cleanupFailed = true; } }
    if (subscriber?.isOpen) subscriber.destroy();
    if (redis.isOpen) redis.destroy();
    try { await nc?.close(); } catch { cleanupFailed = true; }
    if (cleanupFailed) throw new Error('BROKER_PROBE_CLEANUP_FAILED');
  }
  return { status: 'PASS', productionQuotesWritten: false, productionProcessesRestarted: false, results };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await verifyPrivateBrokers(), null, 2)); }
  catch (error) { console.error(JSON.stringify({ status: 'FAIL', code: error.message })); process.exitCode = 1; }
}
