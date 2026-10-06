import { createHash } from 'node:crypto';

const HASH_REF = /^sha256:[0-9a-f]{64}$/;
const REF = /^[A-Za-z0-9._:-]{1,128}$/;
const ADAPTER_ID = /^[A-Za-z0-9._:-]{1,80}$/;
const FORBIDDEN_KEY = /(secret|password|authorization|cookie|api[_-]?key|private[_-]?key|credential|access[_-]?token|auth[_-]?token|bearer[_-]?token|rawprompt|prompttext|rawdata|payload)/i;
const ALLOWED_HIT_KEYS = new Set(['id', 'label', 'snippet', 'score', 'hop', 'relation']);

function sha256(value) {
  return 'sha256:' + createHash('sha256').update(String(value)).digest('hex');
}

function assertNoForbiddenKeys(value, depth = 0) {
  if (depth > 6 || value == null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) assertNoForbiddenKeys(item, depth + 1);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEY.test(key)) throw new Error('GRAPHRAG_OUTPUT_FORBIDDEN');
    assertNoForbiddenKeys(child, depth + 1);
  }
}

function validateHit(hit) {
  if (!hit || typeof hit !== 'object' || Array.isArray(hit)) throw new Error('GRAPHRAG_HIT_INVALID');
  assertNoForbiddenKeys(hit);
  for (const key of Object.keys(hit)) {
    if (!ALLOWED_HIT_KEYS.has(key)) throw new Error('GRAPHRAG_HIT_FIELD_NOT_ADMITTED');
  }
  if (typeof hit.id !== 'string' || !REF.test(hit.id)) throw new Error('GRAPHRAG_HIT_ID_INVALID');
  if (typeof hit.label !== 'string' || hit.label.length > 240) throw new Error('GRAPHRAG_HIT_LABEL_INVALID');
  if (typeof hit.snippet !== 'string' || hit.snippet.length > 4000) throw new Error('GRAPHRAG_HIT_SNIPPET_INVALID');
  if (!Number.isFinite(hit.score)) throw new Error('GRAPHRAG_HIT_SCORE_INVALID');
  if (!Number.isSafeInteger(hit.hop) || hit.hop < 0 || hit.hop > 3) throw new Error('GRAPHRAG_HIT_HOP_INVALID');
  if (hit.relation !== undefined && (typeof hit.relation !== 'string' || hit.relation.length > 800)) {
    throw new Error('GRAPHRAG_HIT_RELATION_INVALID');
  }
  return hit;
}

function shadowEvidenceRef(adapterId, hit) {
  const fingerprint = sha256(JSON.stringify({
    adapterId,
    id: hit.id,
    score: hit.score,
    hop: hit.hop,
  })).slice('sha256:'.length, 'sha256:'.length + 32);
  return `graphrag-shadow:${adapterId}:${fingerprint}`;
}

export function createAgentCoreGraphRagEvidenceRetriever({
  adapter,
  transientQuery,
  hops = 2,
} = {}) {
  if (!adapter || typeof adapter.search !== 'function') throw new Error('GRAPHRAG_ADAPTER_REQUIRED');
  if (typeof adapter.id !== 'string' || !ADAPTER_ID.test(adapter.id)) throw new Error('GRAPHRAG_ADAPTER_ID_INVALID');
  if (typeof transientQuery !== 'string' || transientQuery.length < 1 || transientQuery.length > 16000) {
    throw new Error('GRAPHRAG_QUERY_INVALID');
  }
  if (!Number.isSafeInteger(hops) || hops < 1 || hops > 3) throw new Error('GRAPHRAG_HOPS_INVALID');

  const expectedInputFingerprint = sha256(transientQuery);
  const methodRef = `method-graphrag:${adapter.id}`;

  return async function retrieveEvidence(request) {
    if (!request || typeof request !== 'object') throw new Error('GRAPHRAG_REQUEST_INVALID');
    if (!HASH_REF.test(String(request.inputFingerprint || ''))) throw new Error('GRAPHRAG_INPUT_FINGERPRINT_INVALID');
    if (request.inputFingerprint !== expectedInputFingerprint) throw new Error('GRAPHRAG_INPUT_FINGERPRINT_MISMATCH');
    if (!HASH_REF.test(String(request.stateFingerprint || ''))) throw new Error('GRAPHRAG_STATE_FINGERPRINT_INVALID');

    const hits = await adapter.search(transientQuery, hops);
    if (!Array.isArray(hits) || hits.length < 1 || hits.length > 16) throw new Error('GRAPHRAG_HITS_INVALID');

    const evidenceRefs = [...new Set(hits.map(hit => shadowEvidenceRef(adapter.id, validateHit(hit))))];
    return Object.freeze({
      evidenceRefs,
      methodRef,
    });
  };
}
