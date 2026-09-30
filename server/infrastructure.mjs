import { createHash } from 'node:crypto';
import { createClient } from 'redis';
import { connect } from '@nats-io/transport-node';
import { jetstream, jetstreamManager, StorageType, DiscardPolicy } from '@nats-io/jetstream';
import { QuoteFactSchema, QuoteDeliverySchema, isFresh } from '../shared/market-contracts.mjs';

const STREAM = 'CAPITAL_FACTS';
export const payloadHash = payload => createHash('sha256').update(JSON.stringify(payload)).digest('hex');
export class MarketInfrastructure {
  constructor(env = process.env) { this.env = env; this.redis = null; this.nc = null; this.js = null; this.manager = null; this.natsConnected = false; this.state = 'unavailable'; this.natsConnected = false; this.opening = null; }
  async start() {
    if (this.opening) return this.opening;
    this.opening = this.open().finally(() => { this.opening = null; });
    return this.opening;
  }
  async open() {
    if (!this.env.REDIS_URL || !this.env.NATS_URL) return false;
    try {
      await this.close();
      this.redis = createClient({ url: this.env.REDIS_URL, disableOfflineQueue: true,
        socket: { connectTimeout: 3000, reconnectStrategy: false } });
      this.redis.on('error', () => { this.state = 'degraded'; });
      await this.redis.connect();
      this.nc = await connect({ servers: this.env.NATS_URL, token: this.env.NATS_TOKEN,
        timeout: 3000, maxReconnectAttempts: 3, reconnectTimeWait: 1000 });
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
      if (info.config.storage !== StorageType.File || info.config.discard !== DiscardPolicy.New ||
          !info.config.deny_delete || !info.config.deny_purge || info.config.max_age !== 0 ||
          info.config.num_replicas !== replicas || !info.config.subjects.includes('capital.facts.quote.*')) throw new Error('UNSAFE_STREAM_CONFIG');
      this.state = 'connected';
      return true;
    } catch { await this.close(); return false; }
  }
  status() { return { status: this.state === 'connected' && (!this.redis?.isReady || !this.natsConnected || this.nc?.isClosed()) ? 'degraded' : this.state, redis: this.redis?.isReady ? 'connected' : 'unavailable',
    nats: this.natsConnected && this.nc && !this.nc.isClosed() && !this.nc.isDraining() ? 'connected' : 'unavailable',
    stream: STREAM, storage: 'file', replicasConfigured: Number(this.env.NATS_REPLICAS || 1) }; }
  async persist(fact, rawPayload) {
    QuoteFactSchema.parse(fact);
    if (!isFresh(fact) || payloadHash(rawPayload) !== fact.payloadHash) throw new Error('INVALID_FACT');
    if (!this.redis?.isReady || !this.js || this.nc.isClosed() || !this.natsConnected) throw new Error('INFRASTRUCTURE_UNAVAILABLE');
    const envelope = { schemaVersion: '1.0.0', fact, rawPayload };
    const hash = payloadHash(envelope);
    const ack = await this.js.publish(`capital.facts.quote.${fact.symbol}`, JSON.stringify(envelope), { msgID: hash });
    if (ack.stream !== STREAM || !Number.isInteger(ack.seq) || ack.seq < 1) throw new Error('EVIDENCE_UNCONFIRMED');
    const delivery = QuoteDeliverySchema.parse({ ...fact, evidenceId: `${STREAM}:${ack.seq}:${hash}`,
      availability: 'live', validated: true, actionable: false, reasonCodes: ['PROVIDER_RIGHTS_UNVERIFIED', 'ANALYSIS_INPUTS_INCOMPLETE'] });
    // Store only acknowledged facts. Compare timestamp atomically across ingress instances.
    const script = `local old=redis.call('GET',KEYS[1]); if old then local v=cjson.decode(old); if v.observedAt>tonumber(ARGV[2]) then return 0 end end; redis.call('SET',KEYS[1],ARGV[1],'PX',ARGV[3]); return 1`;
    const ttl = 30000 - (Date.now() - fact.observedAt);
    if (ttl <= 0) throw new Error('FACT_EXPIRED_DURING_WRITE');
    await this.redis.eval(script, { keys: [`capital:quote:v1:${fact.symbol}`], arguments: [JSON.stringify(delivery), String(fact.observedAt), String(ttl)] });
    return delivery;
  }
  async read(symbol) {
    if (!this.redis?.isReady) return null;
    try {
      const value = await this.redis.get(`capital:quote:v1:${symbol}`);
      if (!value) return null;
      const fact = QuoteDeliverySchema.parse(JSON.parse(value));
      if (fact.symbol !== symbol || !isFresh(fact)) return null;
      // Cache contents are not evidence: verify the durable original before serving.
      const record = await this.replay(fact.evidenceId);
      if (JSON.stringify(record.fact) !== JSON.stringify(QuoteFactSchema.parse(fact))) return null;
      return { ...fact, availability: 'cached' };
    } catch { this.state = 'degraded'; return null; }
  }
  async replay(id) {
    const match = /^CAPITAL_FACTS:([1-9][0-9]*):([a-f0-9]{64})$/.exec(id);
    if (!match || !this.manager || !Number.isSafeInteger(Number(match[1]))) throw new Error('INVALID_EVIDENCE_ID');
    const msg = await this.manager.streams.getMessage(STREAM, { seq: Number(match[1]) });
    if (!msg) throw new Error('EVIDENCE_NOT_FOUND');
    const record = JSON.parse(new TextDecoder().decode(msg.data));
    if (payloadHash(record) !== match[2] || payloadHash(record.rawPayload) !== record.fact.payloadHash) throw new Error('EVIDENCE_HASH_MISMATCH');
    record.fact = QuoteFactSchema.parse(record.fact);
    return record;
  }
  async close() {
    if (this.redis?.isOpen) this.redis.destroy();
    await this.nc?.close();
    this.redis = null; this.nc = null; this.js = null; this.manager = null; this.natsConnected = false; this.state = 'unavailable';
  }
}
export const infrastructure = new MarketInfrastructure();
