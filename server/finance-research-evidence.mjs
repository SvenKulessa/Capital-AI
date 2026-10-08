// SPDX-License-Identifier: MIT
// Research-only transport: immutable JetStream receipt -> private Postgres receipt -> ephemeral Valkey.
// Never publishes source observations, BYOK payloads, scores, personal identifiers or credentials.
import { createHash } from 'node:crypto';
import { StorageType, DiscardPolicy } from '@nats-io/jetstream';
import { scorerBus } from './scorer-bus.mjs';

export const FINANCE_RESEARCH_RECEIPT_SCHEMA = 'CAPITAL_AI_FINANCE_RESEARCH_RECEIPT@1';
export const FINANCE_RESEARCH_STREAM = 'CAPITAL_FINANCE_RESEARCH';
export const FINANCE_RESEARCH_CHANNEL = 'capital:finance:research:receipts:v1';
const MAX_BYTES = 8192;
const HEX = /^[a-f0-9]{64}$/;
const MODEL = /^[a-z][a-z0-9-]{1,79}$/;
const ASSET_CLASSES = new Set(['crypto', 'equity_us', 'equity_eu', 'forex', 'commodities', 'fixed_income']);
const CONTEXT_FIELDS = new Set([
  'assetClass', 'instrumentFingerprint', 'rightsEvidenceFingerprint',
  'sourceScope', 'rightsDecision', 'evaluatedAt',
]);
const EVALUATION_FIELDS = new Set([
  'contractVersion', 'state', 'modelId', 'sourceModelVersion',
  'sourceIdentityFingerprint', 'featureFingerprint', 'effectiveWeightFingerprint',
  'research', 'reasons', 'scoreEligible', 'rankEligible', 'decisionEligible', 'productionEligible',
]);
const digest = value => createHash('sha256').update(value).digest('hex');
const hasOnly = (input, allowed) => Object.keys(input).every(field => allowed.has(field));

export function projectFinanceResearchReceipt(evaluation, context, now = Date.now()) {
  if (!evaluation || typeof evaluation !== 'object' || Array.isArray(evaluation) ||
      !context || typeof context !== 'object' || Array.isArray(context) ||
      !hasOnly(context, CONTEXT_FIELDS) || !hasOnly(evaluation, EVALUATION_FIELDS)) {
    throw new Error('RESEARCH_RECEIPT_CONTRACT_INVALID');
  }
  if (evaluation.contractVersion !== 'CAPITAL_AI_FINANCE_MODEL_EVALUATION@1' ||
      evaluation.state !== 'RESEARCH_EVALUATED' || !evaluation.research ||
      evaluation.scoreEligible !== false || evaluation.rankEligible !== false ||
      evaluation.decisionEligible !== false || evaluation.productionEligible !== false ||
      !Array.isArray(evaluation.reasons) || evaluation.reasons.length !== 0) {
    throw new Error('RESEARCH_ONLY_RESULT_REQUIRED');
  }
  if (!ASSET_CLASSES.has(context.assetClass) ||
      !HEX.test(context.instrumentFingerprint || '') ||
      !HEX.test(context.rightsEvidenceFingerprint || '') ||
      !HEX.test(evaluation.sourceIdentityFingerprint || '') ||
      !HEX.test(evaluation.featureFingerprint || '') ||
      !HEX.test(evaluation.effectiveWeightFingerprint || '') ||
      !MODEL.test(evaluation.modelId || '') ||
      !/^[0-9]+(?:\.[0-9]+){1,3}$/.test(evaluation.sourceModelVersion || '') ||
      !Number.isSafeInteger(context.evaluatedAt) || context.evaluatedAt <= 0 ||
      context.evaluatedAt > now + 3000) {
    throw new Error('RESEARCH_PROVENANCE_INVALID');
  }
  // Exact positive admission, not inferred from BYOK, provider connectivity, or a source PASS.
  if (context.sourceScope !== 'NON_PRIVATE_OPEN_DATA' ||
      context.rightsDecision !== 'OPEN_SOURCE_OPEN_DATA_ADMITTED') {
    throw new Error('RESEARCH_PRIVATE_OR_RIGHTS_BLOCKED');
  }
  const record = Object.freeze({
    schema: FINANCE_RESEARCH_RECEIPT_SCHEMA,
    assetClass: context.assetClass,
    instrumentFingerprint: context.instrumentFingerprint,
    modelId: evaluation.modelId,
    modelVersion: evaluation.sourceModelVersion,
    evaluatedAt: context.evaluatedAt,
    rightsEvidenceFingerprint: context.rightsEvidenceFingerprint,
    sourceIdentityFingerprint: evaluation.sourceIdentityFingerprint,
    featureFingerprint: evaluation.featureFingerprint,
    effectiveWeightFingerprint: evaluation.effectiveWeightFingerprint,
    sourceScope: 'NON_PRIVATE_OPEN_DATA',
    state: 'RESEARCH_EVALUATED',
    scoreEligible: false,
    rankEligible: false,
    decisionEligible: false,
    productionEligible: false,
  });
  // Do not include evaluation.research: it can contain protected feature values/provenance.
  const raw = JSON.stringify(record);
  if (Buffer.byteLength(raw) > MAX_BYTES) throw new Error('RESEARCH_RECEIPT_TOO_LARGE');
  return Object.freeze({ record, eventId: digest(raw), raw });
}

function validSupabaseConfig(env) {
  let url;
  try { url = new URL(String(env.SUPABASE_URL || '')); } catch { return null; }
  const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
  let privileged = typeof key === 'string' && key.startsWith('sb_secret_') && key.length >= 24;
  if (!privileged && typeof key === 'string' && key.startsWith('eyJ')) {
    try {
      const body = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'));
      privileged = body.role === 'service_role';
    } catch { return null; }
  }
  if (!privileged || url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co') ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash || url.port) return null;
  return { origin: url.origin, key };
}

function postgrestHeaders(key) {
  return {
    apikey: key,
    ...(key.startsWith('eyJ') ? { Authorization: 'Bearer ' + key } : {}),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

async function saveReceipt(fetchImpl, config, projected, seq) {
  const entry = {
    event_id: projected.eventId,
    record_hash: projected.eventId,
    jetstream_sequence: seq,
    asset_class: projected.record.assetClass,
    instrument_fingerprint: projected.record.instrumentFingerprint,
    model_id: projected.record.modelId,
    model_version: projected.record.modelVersion,
    evaluated_at: new Date(projected.record.evaluatedAt).toISOString(),
    rights_evidence_fingerprint: projected.record.rightsEvidenceFingerprint,
    source_identity_fingerprint: projected.record.sourceIdentityFingerprint,
    feature_fingerprint: projected.record.featureFingerprint,
    effective_weight_fingerprint: projected.record.effectiveWeightFingerprint,
    state: 'RESEARCH_EVALUATED',
  };
  const url = new URL('/rest/v1/finance_research_receipts', config.origin);
  const response = await fetchImpl(url, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
    headers: { ...postgrestHeaders(config.key), Prefer: 'return=minimal' },
    body: JSON.stringify(entry),
  });
  if (response.status === 201) return;
  if (response.status !== 409) throw new Error('RESEARCH_SUPABASE_WRITE_UNCONFIRMED');
  // Replay is idempotent only if the existing immutable row matches this PubAck.
  url.search = new URLSearchParams({
    select: 'event_id,record_hash,jetstream_sequence',
    event_id: 'eq.' + projected.eventId,
    limit: '1',
  }).toString();
  const readback = await fetchImpl(url, {
    method: 'GET',
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
    headers: postgrestHeaders(config.key),
  });
  if (!readback.ok) throw new Error('RESEARCH_SUPABASE_READBACK_FAILED');
  const rows = await readback.json();
  if (!Array.isArray(rows) || rows.length !== 1 ||
      rows[0].event_id !== projected.eventId || rows[0].record_hash !== projected.eventId ||
      Number(rows[0].jetstream_sequence) !== seq) {
    throw new Error('RESEARCH_SUPABASE_IDEMPOTENCY_CONFLICT');
  }
}

async function ensureStream(bus, replicas) {
  let info;
  try { info = await bus.manager.streams.info(FINANCE_RESEARCH_STREAM); }
  catch (error) {
    if (Number(error?.code) !== 404 && error?.apiError?.().code !== 404) throw error;
    info = await bus.manager.streams.add({
      name: FINANCE_RESEARCH_STREAM,
      subjects: ['capital.research.score.*'],
      storage: StorageType.File,
      num_replicas: replicas,
      discard: DiscardPolicy.New,
      max_bytes: 64 * 1024 * 1024,
      max_msg_size: MAX_BYTES,
      max_age: 0,
      deny_delete: true,
      deny_purge: true,
      duplicate_window: 120e9,
    });
  }
  const c = info.config;
  if (c.storage !== StorageType.File || c.discard !== DiscardPolicy.New ||
      c.num_replicas !== replicas || c.max_age !== 0 || !c.deny_delete || !c.deny_purge ||
      c.max_bytes !== 64 * 1024 * 1024 || c.max_msg_size !== MAX_BYTES ||
      c.subjects?.length !== 1 || c.subjects[0] !== 'capital.research.score.*') {
    throw new Error('UNSAFE_FINANCE_RESEARCH_STREAM_CONFIG');
  }
}

export async function persistFinanceResearchReceipt(evaluation, context, {
  env = process.env, bus = scorerBus, fetchImpl = fetch, now = Date.now,
} = {}) {
  if (env.FINANCE_RESEARCH_TRANSPORT_ENABLED !== 'true') throw new Error('RESEARCH_TRANSPORT_DISABLED');
  const projected = projectFinanceResearchReceipt(evaluation, context, now());
  const config = validSupabaseConfig(env);
  if (!config) throw new Error('RESEARCH_SUPABASE_CONFIG_UNAVAILABLE');
  const replicas = Number(env.NATS_REPLICAS || 1);
  if (![1, 3, 5].includes(replicas)) throw new Error('RESEARCH_INVALID_REPLICAS');
  if (!(await bus.start())) throw new Error('RESEARCH_INFRASTRUCTURE_UNAVAILABLE');
  await ensureStream(bus, replicas);
  const subject = 'capital.research.score.' + projected.record.assetClass;
  const ack = await bus.js.publish(subject, projected.raw, { msgID: projected.eventId });
  if (ack.stream !== FINANCE_RESEARCH_STREAM || !Number.isSafeInteger(ack.seq) || ack.seq < 1) {
    throw new Error('RESEARCH_JETSTREAM_PUBACK_INVALID');
  }
  // Publication into the ephemeral cache MUST wait for durable Supabase confirmation.
  await saveReceipt(fetchImpl, config, projected, ack.seq);
  const delivery = {
    schema: projected.record.schema,
    eventId: projected.eventId,
    evidenceId: FINANCE_RESEARCH_STREAM + ':' + ack.seq + ':' + projected.eventId,
    assetClass: projected.record.assetClass,
    instrumentFingerprint: projected.record.instrumentFingerprint,
    modelId: projected.record.modelId,
    state: 'RESEARCH_EVALUATED',
    scoreEligible: false,
    rankEligible: false,
    decisionEligible: false,
    productionEligible: false,
  };
  const body = JSON.stringify(delivery);
  const redisKey = 'capital:finance:research:receipt:v1:' + projected.eventId;
  await bus.redis.multi().set(redisKey, body, { PX: 60_000 })
    .publish(FINANCE_RESEARCH_CHANNEL, body).exec();
  return Object.freeze(delivery);
}
