import { createHash } from 'node:crypto';
import { createClient } from 'redis';
import { connect } from '@nats-io/transport-node';
import { jetstream, jetstreamManager, StorageType, DiscardPolicy } from '@nats-io/jetstream';
import { observeCadsOperation } from './cads-observability.mjs';
import { natsConnectionAuth } from './infrastructure.mjs';

const STREAM = 'CAPITAL_SCORES';
const SUBJECT_PREFIX = 'capital.scores.crypto';
export const SCORE_CHANNEL = 'capital:score:events:v1';
const MAX_SCORE_BYTES = 256 * 1024;

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const validSymbol = symbol => /^[A-Z0-9][A-Z0-9._-]{0,31}$/.test(symbol);

export class EnterpriseScorerBus {
  constructor(env = process.env) {
    this.env = env;
    this.redis = null;
    this.nc = null;
    this.js = null;
    this.manager = null;
    this.opening = null;
  }

  async start() {
    if (this.redis?.isReady && this.nc && !this.nc.isClosed() && this.manager) return true;
    if (this.opening) return this.opening;
    this.opening = this.open().finally(() => { this.opening = null; });
    return this.opening;
  }

  async open() {
    if (this.env.MARKET_BROKER_PAUSED === 'true') return false;
    if (!this.env.REDIS_URL || !this.env.NATS_URL) return false;
    let natsAuth;
    try { natsAuth = natsConnectionAuth(this.env); } catch { return false; }
    try {
      await this.close();
      this.redis = createClient({
        url: this.env.REDIS_URL,
        disableOfflineQueue: true,
        socket: { connectTimeout: 3000, reconnectStrategy: false },
      });
      this.redis.on('error', () => {});
      await observeCadsOperation({ layer:'network', service:'valkey', operation:'scorer.connect' }, () => this.redis.connect());

      const { mode: natsAuthMode, ...credentials } = natsAuth;
      this.natsAuthMode = natsAuthMode;
      this.nc = await observeCadsOperation({ layer:'network', service:'nats', operation:'scorer.connect' }, () => connect({
        servers: this.env.NATS_URL,
        ...credentials,
        timeout: 3000,
        maxReconnectAttempts: 3,
        reconnectTimeWait: 1000,
      }));
      this.js = jetstream(this.nc, { timeout: 3000 });
      this.manager = await jetstreamManager(this.nc, { timeout: 3000 });

      const replicas = Number(this.env.NATS_REPLICAS || 1);
      if (![1, 3, 5].includes(replicas)) throw new Error('INVALID_REPLICAS');

      let info;
      try {
        info = await this.manager.streams.info(STREAM);
      } catch (error) {
        if (Number(error?.code) !== 404 && error?.apiError?.().code !== 404) throw error;
        info = await this.manager.streams.add({
          name: STREAM,
          subjects: [`${SUBJECT_PREFIX}.*`],
          storage: StorageType.File,
          num_replicas: replicas,
          discard: DiscardPolicy.New,
          max_bytes: 256 * 1024 * 1024,
          max_msg_size: MAX_SCORE_BYTES,
          max_age: 0,
          deny_delete: true,
          deny_purge: true,
          duplicate_window: 120e9,
        });
      }

      const config = info.config;
      if (
        config.storage !== StorageType.File ||
        config.discard !== DiscardPolicy.New ||
        !config.deny_delete ||
        !config.deny_purge ||
        config.max_age !== 0 ||
        config.num_replicas !== replicas ||
        config.subjects?.length !== 1 ||
        config.subjects[0] !== `${SUBJECT_PREFIX}.*`
      ) throw new Error('UNSAFE_SCORE_STREAM_CONFIG');

      return true;
    } catch {
      await this.close();
      return false;
    }
  }

  status() {
    const connected = Boolean(this.redis?.isReady && this.nc && !this.nc.isClosed() && this.manager);
    return {
      status: connected ? 'connected' : 'unavailable',
      nats: this.nc && !this.nc.isClosed() ? 'connected' : 'unavailable',
      valkey: this.redis?.isReady ? 'connected' : 'unavailable',
      pubsub: this.redis?.isReady ? 'connected' : 'unavailable',
      stream: STREAM,
      channel: SCORE_CHANNEL,
      authMode: this.natsAuthMode || 'unconfigured',
    };
  }

  async persist(symbol, scorePayload, correlationId = null) {
    symbol = String(symbol || '').toUpperCase().trim();
    if (!validSymbol(symbol)) throw new Error('INVALID_SCORE_SYMBOL');
    if (!scorePayload || typeof scorePayload !== 'object' || Array.isArray(scorePayload)) throw new Error('INVALID_SCORE_PAYLOAD');
    if (!(await this.start())) throw new Error('SCORER_BUS_UNAVAILABLE');

    const record = {
      contractVersion: 'mobile-enterprise-score/1.0.0',
      symbol,
      correlationId: correlationId ? String(correlationId).slice(0, 128) : null,
      observedAt: Date.now(),
      upstream: 'canonical-enterprise-scorer',
      payload: scorePayload,
    };
    const serialized = JSON.stringify(record);
    if (Buffer.byteLength(serialized) > MAX_SCORE_BYTES) throw new Error('SCORE_PAYLOAD_TOO_LARGE');

    const digest = hash(record);
    const ack = await observeCadsOperation({ layer:'stream', service:'nats-jetstream', operation:'score.publish_ack', correlationId }, () => this.js.publish(`${SUBJECT_PREFIX}.${symbol}`, serialized, { msgID: digest }));
    if (ack.stream !== STREAM || !Number.isInteger(ack.seq) || ack.seq < 1) throw new Error('SCORE_EVIDENCE_UNCONFIRMED');

    const delivery = {
      ...record,
      evidenceId: `${STREAM}:${ack.seq}:${digest}`,
      validated: true,
      actionable: false,
      reasonCodes: ['RESEARCH_OUTPUT', 'NO_TRADE_AUTHORITY'],
    };
    const ttlMs = Number(this.env.MOBILE_SCORE_CACHE_TTL_MS || 300000);
    const key = `capital:score:v1:${symbol}`;
    const body = JSON.stringify(delivery);
    await observeCadsOperation({ layer:'cache', service:'valkey', operation:'score.set_publish', correlationId }, () => this.redis.multi()
      .set(key, body, { PX: Math.max(10000, Math.min(ttlMs, 3600000)) })
      .publish(SCORE_CHANNEL, body)
      .exec());
    return delivery;
  }

  async read(symbol) {
    symbol = String(symbol || '').toUpperCase().trim();
    if (!validSymbol(symbol) || !(await this.start())) return null;
    try {
      const raw = await observeCadsOperation({ layer:'cache', service:'valkey', operation:'score.read', correlationId: symbol }, () => this.redis.get(`capital:score:v1:${symbol}`));
      if (!raw) return null;
      const delivery = JSON.parse(raw);
      if (delivery.symbol !== symbol || !delivery.evidenceId) return null;
      const original = await this.replay(delivery.evidenceId);
      if (JSON.stringify(original) !== JSON.stringify({
        contractVersion: delivery.contractVersion,
        symbol: delivery.symbol,
        correlationId: delivery.correlationId,
        observedAt: delivery.observedAt,
        upstream: delivery.upstream,
        payload: delivery.payload,
      })) return null;
      return delivery;
    } catch {
      return null;
    }
  }

  async replay(evidenceId) {
    if (!(await this.start())) throw new Error('SCORER_BUS_UNAVAILABLE');
    const match = /^CAPITAL_SCORES:([1-9][0-9]*):([a-f0-9]{64})$/.exec(String(evidenceId || ''));
    if (!match) throw new Error('INVALID_SCORE_EVIDENCE_ID');
    const message = await observeCadsOperation({ layer:'storage', service:'nats-jetstream', operation:'score.replay' }, () => this.manager.streams.getMessage(STREAM, { seq: Number(match[1]) }));
    if (!message) throw new Error('SCORE_EVIDENCE_NOT_FOUND');
    const record = JSON.parse(new TextDecoder().decode(message.data));
    if (hash(record) !== match[2]) throw new Error('SCORE_EVIDENCE_HASH_MISMATCH');
    return record;
  }

  async subscribe(listener) {
    if (typeof listener !== 'function' || !(await this.start())) throw new Error('SCORER_PUBSUB_UNAVAILABLE');
    const subscriber = this.redis.duplicate();
    subscriber.on('error', () => {});
    await subscriber.connect();
    await subscriber.subscribe(SCORE_CHANNEL, raw => {
      try {
        const delivery = JSON.parse(raw);
        if (delivery?.validated === true && validSymbol(delivery.symbol)) listener(delivery);
      } catch {}
    });
    return async () => {
      try { await subscriber.unsubscribe(SCORE_CHANNEL); } catch {}
      if (subscriber.isOpen) subscriber.destroy();
    };
  }

  async close() {
    if (this.redis?.isOpen) this.redis.destroy();
    await this.nc?.close();
    this.redis = null;
    this.nc = null;
    this.js = null;
    this.manager = null;
    this.natsAuthMode = null;
  }
}

export const scorerBus = new EnterpriseScorerBus();
