import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { createClient } from 'redis';
import { connect } from '@nats-io/transport-node';
import { jetstreamManager } from '@nats-io/jetstream';
import { natsConnectionAuth, validateStreamConfig, validateCanonicalStreamConfig } from '../server/infrastructure.mjs';

export async function verifyPrivateBrokers(env = process.env) {
  if (!env.REDIS_URL || !env.NATS_URL) throw new Error('BROKER_ENDPOINTS_REQUIRED');
  const auth = natsConnectionAuth(env);
  const { mode: authMode, ...credentials } = auth;
  const id = randomUUID().replaceAll('-', '');
  const key = `capital:probe:${id}:cache`, channel = `capital:probe:${id}:events`;
  const payload = JSON.stringify({ probe: true, nonce: id });
  const redis = createClient({ url: env.REDIS_URL, disableOfflineQueue: true,
    socket: { connectTimeout: 3000, reconnectStrategy: false } });
  redis.on('error', () => {});
  let subscriber, nc, manager, stage = 'connect', cleanupFailed = false;
  const results = [];
  const timings = {};
  const timed = async (name, fn) => {
    const started = performance.now();
    try { return await fn(); }
    finally { timings[name] = +(performance.now() - started).toFixed(3); }
  };
  const options = { servers: env.NATS_URL, ...credentials, timeout: 3000, reconnect: false };
  try {
    await timed('valkey_connect_ms', () => redis.connect());
    nc = await timed('nats_connect_ms', () => connect(options));
    manager = await timed('jetstream_manager_ms', () => jetstreamManager(nc, { timeout: 3000 }));
    const facts = await manager.streams.info('CAPITAL_FACTS');
    validateStreamConfig(facts.config, Number(env.NATS_REPLICAS || 1));
    const canonical = await manager.streams.info('CAPITAL_CANONICAL');
    validateCanonicalStreamConfig(canonical.config, Number(env.NATS_REPLICAS || 1));

    stage = 'authentication';
    let denied = false;
    const badCredentials = authMode === 'scoped_user'
      ? { user: credentials.user, pass: randomUUID() }
      : { token: randomUUID() };
    try {
      const unauthorized = await connect({ servers: env.NATS_URL, ...badCredentials, timeout: 3000, reconnect: false });
      await unauthorized.close();
    } catch (error) {
      denied = /authorization|authentication/i.test(String(error.code || error.name || error.message));
    }
    assert.ok(denied, 'Wrong NATS credentials must be rejected by authentication, not a network timeout');
    results.push({ step: 1, check: 'scoped_authentication_and_market_stream_policies', authMode, status: 'PASS' });

    stage = 'isolated_pubsub';
    subscriber = redis.duplicate(); subscriber.on('error', () => {}); await subscriber.connect();
    let timer, resolveDelivery;
    const delivery = new Promise(resolve => { resolveDelivery = resolve; });
    await subscriber.subscribe(channel, message => resolveDelivery(message));
    try {
      await timed('valkey_set_publish_ms', () => redis.eval("redis.call('SET',KEYS[1],ARGV[1],'PX',5000);return redis.call('PUBLISH',ARGV[2],ARGV[1])",
        { keys: [key], arguments: [payload, channel] }));
      const received = await Promise.race([delivery, new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('PUBSUB_TIMEOUT')), 3000);
      })]);
      assert.equal(received, payload); assert.equal(await timed('valkey_get_ms', () => redis.get(key)), payload);
      const ttl = await redis.pTTL(key); assert.ok(ttl > 0 && ttl <= 5000);
    } finally { clearTimeout(timer); }
    results.push({ step: 2, check: 'isolated_atomic_cache_pubsub_and_ttl', status: 'PASS' });

    stage = 'read_only_replay_authority';
    const factsState = facts.state || {};
    let lastEvidenceReadable = null;
    if (Number.isSafeInteger(factsState.last_seq) && factsState.last_seq > 0) {
      const message = await timed('jetstream_last_message_read_ms',
        () => manager.streams.getMessage('CAPITAL_FACTS', { seq: factsState.last_seq }));
      assert.ok(message, 'Last CAPITAL_FACTS evidence message must be readable');
      lastEvidenceReadable = true;
    }
    results.push({ step: 3, check: 'capital_facts_read_only_replay_authority', status: 'PASS',
      streamMessages: factsState.messages ?? null, lastEvidenceReadable });

    stage = 'reconnect';
    await nc.close();
    nc = await timed('nats_reconnect_ms', () => connect(options));
    manager = await jetstreamManager(nc, { timeout: 3000 });
    validateStreamConfig((await manager.streams.info('CAPITAL_FACTS')).config, Number(env.NATS_REPLICAS || 1));
    validateCanonicalStreamConfig((await manager.streams.info('CAPITAL_CANONICAL')).config, Number(env.NATS_REPLICAS || 1));
    results.push({ step: 4, check: 'scoped_reconnect_and_stream_policy', status: 'PASS' });
  } catch {
    throw new Error(`BROKER_PROBE_FAILED_${stage.toUpperCase()}`);
  } finally {
    if (redis.isReady) { try { await redis.del(key); } catch { cleanupFailed = true; } }
    if (subscriber?.isOpen) subscriber.destroy();
    if (redis.isOpen) redis.destroy();
    try { await nc?.close(); } catch { cleanupFailed = true; }
    if (cleanupFailed) throw new Error('BROKER_PROBE_CLEANUP_FAILED');
  }
  const measured = Object.values(timings);
  return {
    status: 'PASS',
    schema: 'CAPITAL_AI_PRIVATE_BROKER_PROBE@3',
    natsAuthMode: authMode,
    productionQuotesWritten: false,
    productionStreamsMutated: false,
    productionProcessesRestarted: false,
    timings,
    latencySummary: {
      samples: measured.length,
      maxMs: measured.length ? +Math.max(...measured).toFixed(3) : null,
      totalMeasuredMs: +measured.reduce((sum, value) => sum + value, 0).toFixed(3),
    },
    results,
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await verifyPrivateBrokers(), null, 2)); }
  catch (error) { console.error(JSON.stringify({ status: 'FAIL', code: error.message })); process.exitCode = 1; }
}
