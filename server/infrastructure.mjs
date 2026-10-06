import { createHash } from 'node:crypto';
import { createClient } from 'redis';
import { connect } from '@nats-io/transport-node';
import { jetstream, jetstreamManager, StorageType, DiscardPolicy } from '@nats-io/jetstream';
import { QuoteFactSchema, QuoteDeliverySchema, cacheTtlMs, deliveryReasonCodes, isFresh } from '../shared/market-contracts.mjs';
import { observeCadsOperation } from './cads-observability.mjs';

const STREAM = 'CAPITAL_FACTS';
export function validateStreamConfig(config, replicas) {
  if (!config || config.storage !== StorageType.File || config.discard !== DiscardPolicy.New ||
      !config.deny_delete || !config.deny_purge || config.max_age !== 0 ||
      config.num_replicas !== replicas || config.max_bytes !== 1024 * 1024 * 1024 ||
      config.max_msg_size !== 262144 || config.subjects?.length !== 1 ||
      config.subjects[0] !== 'capital.facts.quote.*') throw new Error('UNSAFE_STREAM_CONFIG');
}
export const QUOTE_CHANNEL = 'capital:quote:events:v1';
export const payloadHash = payload => createHash('sha256').update(JSON.stringify(payload)).digest('hex');
export function natsConnectionAuth(env = process.env) {
  const user = String(env.NATS_APP_USER || '').trim();
  const pass = String(env.NATS_APP_PASSWORD || '').trim();
  if (user || pass) {
    if (!user || !pass) throw new Error('NATS_SCOPED_CREDENTIALS_INCOMPLETE');
    return { user, pass, mode: 'scoped_user' };
  }
  const token = String(env.NATS_TOKEN || '').trim();
  if (token) return { token, mode: 'legacy_token' };
  throw new Error('NATS_CREDENTIALS_REQUIRED');
}
export class MarketInfrastructure {
  constructor(env = process.env) { this.env = env; this.redis = null; this.nc = null; this.js = null; this.manager = null; this.natsConnected = false; this.state = 'unavailable'; this.opening = null; this.subscriber = null; this.listeners = new Set(); this.pendingSymbols = new Set(); this.subscribing = null; this.pubsubEnabled = env.MARKET_PUBSUB_ENABLED !== 'false'; this.deliveryMetrics = { verified: 0, lastVerifiedDeliveryAt: null, lastVerifiedSymbol: null }; }
  async start() {
    if (this.status().status === 'connected') return true;
    if (this.opening) return this.opening;
    this.opening = this.open().finally(() => { this.opening = null; });
    return this.opening;
  }
  async open() {
    if (!this.env.REDIS_URL) return false;
    // Never fall back to an anonymous connection when the configured broker is reachable.
    let natsAuth = null;
    if (this.env.NATS_URL) {
      try { natsAuth = natsConnectionAuth(this.env); }
      catch { await this.close(); return false; }
    }
    // A cache connection is useful independently; it is never durable evidence.
    if (this.redis?.isReady && !this.env.NATS_URL) { this.state = 'degraded'; return false; }
    try {
      await this.close();
      this.redis = createClient({ url: this.env.REDIS_URL, disableOfflineQueue: true,
        socket: { connectTimeout: 3000, reconnectStrategy: false } });
      this.redis.on('error', () => { this.state = 'degraded'; });
      await observeCadsOperation({ layer:'network', service:'valkey', operation:'connect' }, () => this.redis.connect());
      if (this.listeners.size) await this.ensureSubscriber();
      if (!this.env.NATS_URL) { this.state = 'degraded'; return false; }
      const { mode: natsAuthMode, ...credentials } = natsAuth;
      this.natsAuthMode = natsAuthMode;
      this.nc = await observeCadsOperation({ layer:'network', service:'nats', operation:'connect' }, () => connect({ servers: this.env.NATS_URL, ...credentials,
        timeout: 3000, maxReconnectAttempts: 3, reconnectTimeWait: 1000 }));
      this.natsConnected = true;
      const connection = this.nc;
      void (async () => { for await (const event of connection.status()) {
        if (connection !== this.nc) break;
        if (event.type === 'disconnect' || event.type === 'error') this.natsConnected = false;
        if (event.type === 'reconnect') this.natsConnected = true;
      } })().catch(() => { if (connection === this.nc) this.natsConnected = false; });
      this.js = jetstream(this.nc, { timeout: 3000 });
      this.manager = await jetstreamManager(this.nc, { timeout: 3000 });
      const replicas = Number(this.env.NATS_REPLICAS || 1);
      if (![1, 3, 5].includes(replicas)) throw new Error('INVALID_REPLICAS');
      let info;
      try { info = await this.manager.streams.info(STREAM); }
      catch (e) { if (Number(e.code) !== 404 && e.apiError?.().code !== 404) throw e;
        info = await this.manager.streams.add({ name: STREAM, subjects: ['capital.facts.quote.*'],
          storage: StorageType.File, num_replicas: replicas, discard: DiscardPolicy.New,
          max_bytes: 1024 * 1024 * 1024, max_msg_size: 262144,
          max_age: 0, deny_delete: true, deny_purge: true, duplicate_window: 120e9 }); }
      validateStreamConfig(info.config, replicas);
      this.state = 'connected';
      return true;
    } catch {
      await this.nc?.close();
      this.nc = null; this.js = null; this.manager = null; this.natsConnected = false;
      if (this.redis?.isReady) this.state = 'degraded';
      else await this.close();
      return false;
    }
  }
  status() { return { status: this.state === 'connected' && (!this.redis?.isReady || !this.natsConnected || this.nc?.isClosed() || (this.listeners.size && !this.subscriber?.isReady)) ? 'degraded' : this.state, redis: this.redis?.isReady ? 'connected' : 'unavailable',
    nats: this.natsConnected && this.nc && !this.nc.isClosed() && !this.nc.isDraining() ? 'connected' : 'unavailable',
    pubsub: !this.pubsubEnabled ? 'disabled' : this.redis?.isReady ? 'connected' : 'unavailable',
    subscriber: !this.pubsubEnabled ? 'disabled' : !this.listeners.size ? 'idle' : this.subscriber?.isReady ? 'connected' : 'unavailable',
    subscriberListeners: this.listeners.size,
    verifiedDeliveries: this.deliveryMetrics.verified,
    lastVerifiedDeliveryAt: this.deliveryMetrics.lastVerifiedDeliveryAt,
    lastVerifiedSymbol: this.deliveryMetrics.lastVerifiedSymbol,
    stream: STREAM, storage: 'file', replicasConfigured: Number(this.env.NATS_REPLICAS || 1),
    authMode: this.natsAuthMode || 'unconfigured' }; }
  async subscribeQuotes(listener) {
    if (typeof listener !== 'function') throw new TypeError('INVALID_QUOTE_LISTENER');
    if (this.listeners.size >= 32) throw new Error('PUBSUB_LISTENER_LIMIT');
    if (!this.pubsubEnabled || !this.redis?.isReady) throw new Error('PUBSUB_UNAVAILABLE');
    this.listeners.add(listener);
    try { await this.ensureSubscriber(); }
    catch (error) { this.listeners.delete(listener); throw error; }
    return async () => {
      this.listeners.delete(listener);
      if (!this.listeners.size && this.subscriber?.isOpen) { this.subscriber.destroy(); this.subscriber = null; }
    };
  }
  async ensureSubscriber() {
    if (!this.pubsubEnabled || this.subscriber?.isReady) return;
    if (this.subscribing) return this.subscribing;
    this.subscribing = (async () => {
      if (this.subscriber?.isOpen) this.subscriber.destroy();
      this.subscriber = this.redis.duplicate();
      this.subscriber.on('error', () => {}); // Recovered by the bounded infrastructure retry.
      await this.subscriber.connect();
      await this.subscriber.subscribe(QUOTE_CHANNEL, message => { void this.notifyQuote(message); });
    })().finally(() => { this.subscribing = null; });
    return this.subscribing;
  }
  async notifyQuote(message) {
    // Pub/Sub is ephemeral and untrusted. At most one in-flight notification per instrument.
    if (message.length > 262144) return;
    let delivery;
    try { delivery = QuoteDeliverySchema.parse(JSON.parse(message)); } catch { return; }
    if (!isFresh(delivery) || this.pendingSymbols.has(delivery.symbol)) return;
    this.pendingSymbols.add(delivery.symbol);
    try {
      const record = await this.replay(delivery.evidenceId);
      if (!isFresh(delivery) || JSON.stringify(record.fact) !== JSON.stringify(QuoteFactSchema.parse(delivery))) return;
      const verified = QuoteDeliverySchema.parse({ ...record.fact, evidenceId: delivery.evidenceId,
        availability: record.fact.timeSemantics === 'reference' ? 'reference' : 'live',
        validated: true, actionable: false, reasonCodes: deliveryReasonCodes(record.fact) });
      this.deliveryMetrics.verified += 1;
      this.deliveryMetrics.lastVerifiedDeliveryAt = Date.now();
      this.deliveryMetrics.lastVerifiedSymbol = verified.symbol;
      await Promise.allSettled([...this.listeners].map(listener => Promise.resolve().then(() => listener(verified))));
    } catch { /* Missing or invalid durable evidence never becomes an event. */ }
    finally { this.pendingSymbols.delete(delivery.symbol); }
  }
  async persist(fact, rawPayload) {
    QuoteFactSchema.parse(fact);
    if (!isFresh(fact) || payloadHash(rawPayload) !== fact.payloadHash) throw new Error('INVALID_FACT');
    if (!this.redis?.isReady || !this.js || this.nc.isClosed() || !this.natsConnected) throw new Error('INFRASTRUCTURE_UNAVAILABLE');
    const envelope = { schemaVersion: '1.0.0', fact, rawPayload };
    const hash = payloadHash(envelope);
    const ack = await observeCadsOperation({ layer:'stream', service:'nats-jetstream', operation:'quote.publish_ack', correlationId: fact.symbol }, () => this.js.publish(`capital.facts.quote.${fact.symbol}`, JSON.stringify(envelope), { msgID: hash }));
    if (ack.stream !== STREAM || !Number.isInteger(ack.seq) || ack.seq < 1) throw new Error('EVIDENCE_UNCONFIRMED');
    const delivery = QuoteDeliverySchema.parse({ ...fact, evidenceId: `${STREAM}:${ack.seq}:${hash}`,
      availability: fact.timeSemantics === 'reference' ? 'reference' : 'live',
      validated: true, actionable: false, reasonCodes: deliveryReasonCodes(fact) });
    // Store only acknowledged facts. Compare timestamp atomically across ingress instances.
    const script = `local old=redis.call('GET',KEYS[1]); if old then local v=cjson.decode(old); if v.observedAt>tonumber(ARGV[2]) then return 0 end; if v.evidenceId==ARGV[4] then return 0 end end; redis.call('SET',KEYS[1],ARGV[1],'PX',ARGV[3]); if ARGV[5]=='true' then redis.call('PUBLISH',ARGV[6],ARGV[1]) end; return 1`;
    const ttl = cacheTtlMs(fact);
    if (ttl <= 0) throw new Error('FACT_EXPIRED_DURING_WRITE');
    await observeCadsOperation({ layer:'cache', service:'valkey', operation:'quote.atomic_set_publish', correlationId: fact.symbol }, () => this.redis.eval(script, { keys: [`capital:quote:v1:${fact.symbol}`], arguments: [JSON.stringify(delivery), String(fact.observedAt), String(ttl), delivery.evidenceId, String(this.pubsubEnabled), QUOTE_CHANNEL] }));
    return delivery;
  }
  async read(symbol) {
    if (!this.redis?.isReady) return null;
    try {
      const value = await observeCadsOperation({ layer:'cache', service:'valkey', operation:'quote.read', correlationId: symbol }, () => this.redis.get(`capital:quote:v1:${symbol}`));
      if (!value) return null;
      const fact = QuoteDeliverySchema.parse(JSON.parse(value));
      if (fact.symbol !== symbol || !isFresh(fact)) return null;
      // Cache contents are not evidence: verify the durable original before serving.
      const record = await this.replay(fact.evidenceId);
      if (JSON.stringify(record.fact) !== JSON.stringify(QuoteFactSchema.parse(fact))) return null;
      return { ...fact, availability: fact.timeSemantics === 'reference' ? 'reference' : 'cached' };
    } catch { this.state = 'degraded'; return null; }
  }
  async replay(id) {
    const match = /^CAPITAL_FACTS:([1-9][0-9]*):([a-f0-9]{64})$/.exec(id);
    if (!match || !this.manager || !Number.isSafeInteger(Number(match[1]))) throw new Error('INVALID_EVIDENCE_ID');
    const msg = await observeCadsOperation({ layer:'storage', service:'nats-jetstream', operation:'quote.replay' }, () => this.manager.streams.getMessage(STREAM, { seq: Number(match[1]) }));
    if (!msg) throw new Error('EVIDENCE_NOT_FOUND');
    const record = JSON.parse(new TextDecoder().decode(msg.data));
    if (payloadHash(record) !== match[2] || payloadHash(record.rawPayload) !== record.fact.payloadHash) throw new Error('EVIDENCE_HASH_MISMATCH');
    record.fact = QuoteFactSchema.parse(record.fact);
    return record;
  }
  async close() {
    if (this.subscriber?.isOpen) this.subscriber.destroy();
    this.subscriber = null;
    if (this.redis?.isOpen) this.redis.destroy();
    await this.nc?.close();
    this.redis = null; this.nc = null; this.js = null; this.manager = null; this.natsConnected = false; this.natsAuthMode = null; this.state = 'unavailable';
  }
}
export const infrastructure = new MarketInfrastructure();
