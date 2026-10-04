import { createHash } from 'node:crypto';
import { QuoteFactSchema } from '../shared/market-contracts.mjs';

const EVIDENCE_ID = /^CAPITAL_FACTS:([1-9][0-9]*):([a-f0-9]{64})$/;
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function supabaseOrigin(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export class CanonicalMarketStore {
  constructor(env = process.env, fetchImpl = fetch) {
    this.env = env;
    this.fetchImpl = fetchImpl;
    this.lastPersistedAt = null;
    this.lastError = null;
  }

  config() {
    const origin = supabaseOrigin(this.env.SUPABASE_URL || this.env.VITE_SUPABASE_URL);
    const key = String(this.env.SUPABASE_SECRET_KEY || this.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    return origin && key.length >= 32 ? { origin, key } : null;
  }

  status() {
    return {
      status: this.config() ? (this.lastError ? 'degraded' : 'configured') : 'unavailable',
      configured: Boolean(this.config()),
      lastPersistedAt: this.lastPersistedAt,
    };
  }

  async readLatest(symbol) {
    const config = this.config();
    if (!config) return null;
    const normalized = String(symbol || '').toUpperCase().trim();
    if (!/^[A-Z0-9][A-Z0-9._-]{0,31}$/.test(normalized)) return null;

    const headers = { Accept: 'application/json', apikey: config.key };
    if (config.key.startsWith('eyJ')) headers.Authorization = `Bearer ${config.key}`;

    try {
      const params = new URLSearchParams({
        select: 'evidence_id,fact,observed_at',
        symbol: `eq.${normalized}`,
        order: 'observed_at.desc',
        limit: '1',
      });
      const response = await this.fetchImpl(
        `${config.origin}/rest/v1/canonical_market_facts?${params}`,
        { method: 'GET', headers, signal: AbortSignal.timeout(5000) },
      );
      if (!response.ok) throw new Error(`CANONICAL_DB_READ_${response.status}`);
      const rows = await response.json();
      if (!Array.isArray(rows) || rows.length !== 1) return null;
      const fact = QuoteFactSchema.parse(rows[0].fact);
      if (fact.symbol !== normalized || !EVIDENCE_ID.test(String(rows[0].evidence_id || ''))) return null;
      this.lastError = null;
      return { evidenceId: rows[0].evidence_id, fact };
    } catch (error) {
      this.lastError = String(error?.message || 'CANONICAL_DB_READ_FAILED').slice(0, 128);
      return null;
    }
  }

  async persist(delivery, envelope) {
    const config = this.config();
    if (!config) throw new Error('CANONICAL_DB_NOT_CONFIGURED');

    const match = EVIDENCE_ID.exec(String(delivery?.evidenceId || ''));
    if (!match) throw new Error('INVALID_EVIDENCE_ID');
    const fact = QuoteFactSchema.parse(envelope?.fact);
    if (JSON.stringify(fact) !== JSON.stringify(QuoteFactSchema.parse(delivery))) throw new Error('CANONICAL_FACT_MISMATCH');
    if (hash(envelope) !== match[2]) throw new Error('CANONICAL_ENVELOPE_HASH_MISMATCH');

    const row = {
      evidence_id: delivery.evidenceId,
      stream_name: 'CAPITAL_FACTS',
      stream_seq: Number(match[1]),
      envelope_hash: match[2],
      payload_hash: fact.payloadHash,
      schema_version: envelope.schemaVersion,
      symbol: fact.symbol,
      provider: fact.provider,
      venue: fact.venue,
      observed_at: new Date(fact.observedAt).toISOString(),
      received_at: new Date(fact.receivedAt).toISOString(),
      fact,
      raw_payload: envelope.rawPayload,
    };

    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      apikey: config.key,
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    };
    if (config.key.startsWith('eyJ')) headers.Authorization = `Bearer ${config.key}`;

    try {
      const response = await this.fetchImpl(
        `${config.origin}/rest/v1/canonical_market_facts?on_conflict=evidence_id`,
        { method: 'POST', headers, body: JSON.stringify(row), signal: AbortSignal.timeout(5000) },
      );
      if (!response.ok) throw new Error(`CANONICAL_DB_WRITE_${response.status}`);
      this.lastPersistedAt = Date.now();
      this.lastError = null;
      return row.evidence_id;
    } catch (error) {
      this.lastError = String(error?.message || 'CANONICAL_DB_WRITE_FAILED').slice(0, 128);
      throw error;
    }
  }
}

export const canonicalMarketStore = new CanonicalMarketStore();
