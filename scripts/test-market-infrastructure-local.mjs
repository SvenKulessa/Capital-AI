import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { connect } from '@nats-io/transport-node';
import { MarketInfrastructure, payloadHash, QUOTE_CHANNEL } from '../server/infrastructure.mjs';

if (!process.env.VALKEY_SERVER_BIN || !process.env.NATS_SERVER_BIN) throw new Error('Both local server binaries are required; this test never silently skips.');
async function port() { const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening'); const value = server.address().port; await new Promise(resolve => server.close(resolve)); return value; }
async function until(check, message, timeout = 5000) { const deadline = Date.now() + timeout; while (Date.now() < deadline) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 50)); } throw new Error(message); }
function launch(binary, args) { return spawn(binary, args, { stdio: ['ignore', 'ignore', 'ignore'] }); }
async function stop(child) { if (!child || child.exitCode !== null) return; const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited; }
const root = await mkdtemp(join(tmpdir(), 'capital-market-'));
const redisPort = await port(), natsPort = await port();
const env = { REDIS_URL: `redis://127.0.0.1:${redisPort}`, NATS_URL: `nats://127.0.0.1:${natsPort}`, NATS_TOKEN: 'local-test-only', NATS_REPLICAS: '1' };
const natsArgs = ['-a', '127.0.0.1', '-p', String(natsPort), '-js', '-sd', join(root, 'jetstream'), '--auth', env.NATS_TOKEN];
let valkey = launch(process.env.VALKEY_SERVER_BIN, ['--bind', '127.0.0.1', '--port', String(redisPort), '--save', '', '--appendonly', 'no']);
let nats = launch(process.env.NATS_SERVER_BIN, natsArgs);
const service = new MarketInfrastructure(env);
const events = [];
const raw = { testHarness: true, source: 'local-integration' };
const fact = { schemaVersion: '1.0.0', symbol: 'BTCUSD', venue: 'KRAKEN', provider: 'kraken', price: 100,
 quote: 'USD', bid: null, ask: null, volume24h: null, observedAt: Date.now() - 1000, receivedAt: Date.now(),
 mode: 'websocket', isDemo: false, licenseScope: 'unverified', payloadHash: payloadHash(raw) };
try {
 await until(() => service.start(), 'Local infrastructure did not start');
 await assert.rejects(connect({ servers: env.NATS_URL, token: 'wrong-test-token', reconnect: false, timeout: 1000 }));
 const unsubscribe = await service.subscribeQuotes(value => events.push(value));
 const confirmed = await service.persist(fact, raw);
 await until(() => events.length === 1, 'Acknowledged quote was not delivered');
 assert.equal(events[0].evidenceId, confirmed.evidenceId);
 assert.equal(events[0].actionable, false);
 assert.equal((await service.read('BTCUSD')).price, 100);
 await service.persist(fact, raw);
 await service.persist({ ...fact, observedAt: fact.observedAt - 1000, price: 90 }, raw);
 await service.redis.publish(QUOTE_CHANNEL, 'invalid-json');
 await service.redis.publish(QUOTE_CHANNEL, JSON.stringify({ ...confirmed, price: 999 }));
 await service.redis.publish(QUOTE_CHANNEL, JSON.stringify({ ...confirmed, isDemo: true }));
 const fresh = await service.persist({ ...fact, observedAt: Date.now(), receivedAt: Date.now(), price: 101 }, raw);
 await until(() => events.length === 2, 'Second valid quote did not arrive');
 assert.deepEqual(events.map(event => event.price), [100, 101]);
 console.log('PASS 1: fan-out, deduplication, ordering, schema and durable integrity');

 await stop(nats);
 await until(() => service.status().nats === 'unavailable', 'NATS outage not detected');
 await assert.rejects(service.persist(fact, raw), /INFRASTRUCTURE_UNAVAILABLE/);
 assert.equal(await service.read('BTCUSD'), null);
 nats = launch(process.env.NATS_SERVER_BIN, natsArgs);
 await until(() => service.start(), 'NATS reconnection failed');
 assert.equal((await service.replay(confirmed.evidenceId)).fact.price, 100);
 const recovered = await service.persist({ ...fact, observedAt: Date.now(), receivedAt: Date.now(), price: 102 }, raw);
 await until(() => events.some(event => event.evidenceId === recovered.evidenceId), 'Subscriber did not recover');
 console.log('PASS 2: NATS process restart retains evidence and restores subscriber');

 await stop(valkey);
 await until(() => service.status().redis === 'unavailable', 'Valkey outage not detected');
 await assert.rejects(service.persist(fact, raw), /INFRASTRUCTURE_UNAVAILABLE/);
 valkey = launch(process.env.VALKEY_SERVER_BIN, ['--bind', '127.0.0.1', '--port', String(redisPort), '--save', '', '--appendonly', 'no']);
 await until(() => service.start(), 'Valkey reconnection failed');
 assert.equal(await service.read('BTCUSD'), null, 'Cache restart must not invent a quote');
 assert.equal((await service.replay(fresh.evidenceId)).fact.price, 101);
 const final = await service.persist({ ...fact, observedAt: Date.now(), receivedAt: Date.now(), price: 103 }, raw);
 await until(() => events.some(event => event.evidenceId === final.evidenceId), 'Fan-out after Valkey restart failed');
 await unsubscribe();
 assert.equal(service.subscriber, null);
 console.log('PASS 3: empty Valkey restart, durable replay, bounded recovery and unsubscribe');

 const cacheOnly = new MarketInfrastructure({ REDIS_URL: env.REDIS_URL });
 try { assert.equal(await cacheOnly.start(), false); assert.equal(cacheOnly.status().redis, 'connected'); await assert.rejects(cacheOnly.persist(fact, raw), /INFRASTRUCTURE_UNAVAILABLE/); assert.equal(await cacheOnly.read('BTCUSD'), null); }
 finally { await cacheOnly.close(); }
 console.log('PASS 4: cache-only operation never substitutes for JetStream evidence');
} finally { await service.close(); await stop(nats); await stop(valkey); await rm(root, { recursive: true, force: true }); }
