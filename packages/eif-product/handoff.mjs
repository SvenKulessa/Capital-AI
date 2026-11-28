// Read-only adapter for the existing #1019 report contracts. Input is untrusted.
import { createHash } from 'node:crypto';
import { HYGIENE_WEIGHTS, createDocumentHygieneBenchmark } from '../benchmark-core/document-hygiene.mjs';
const hex64 = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const hex40 = x => typeof x === 'string' && /^[a-f0-9]{40}$/.test(x);
const thread = x => typeof x === 'string' && /^offline-[a-f0-9]{40}$/.test(x);
const count = x => Number.isInteger(x) && x >= 0 && x <= 1000000;
const exact = (x, keys) => x !== null && typeof x === 'object' && !Array.isArray(x) && Object.keys(x).length === keys.length && keys.every(k => Object.hasOwn(x,k));
const hash = b => createHash('sha256').update(b).digest('hex');
const iso = x => typeof x === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/.test(x) && Number.isFinite(Date.parse(x));
const keys = ['contractVersion','threadId','runId','sourceSha','observedAt','scopeDigest','sourceDigest','contentDigest','methodId','checked','affected','missing','score','coverage','status','authorityGranted'];
export function parseHandoff(raw) {
  if (typeof raw !== 'string' || Buffer.byteLength(raw) > 16384) throw Error('INVALID_HANDOFF_SIZE');
  const d = JSON.parse(raw);
  if (!exact(d,keys) || d.contractVersion !== 'CAPITAL_AI_HYGIENE_HANDOFF@1' || (d.threadId !== null && !thread(d.threadId)) || !hex40(d.sourceSha) || !iso(d.observedAt) || ![d.scopeDigest,d.sourceDigest,d.contentDigest].every(hex64) || d.runId !== 'hygiene-'+d.sourceDigest || d.methodId !== 'doc-drift-claims-v1' || ![d.checked,d.affected,d.missing].every(count) || d.affected>d.checked || d.status !== 'NOT_PROVEN' || d.authorityGranted !== false) throw Error('INVALID_HYGIENE_HANDOFF');
  const benchmark = createDocumentHygieneBenchmark({runId:d.runId,scopeDigest:d.scopeDigest,methodId:d.methodId,dimensions:{...Object.fromEntries(Object.keys(HYGIENE_WEIGHTS).map(k=>[k,null])),freshness:d.checked?{score:Math.round(100*(d.checked-d.affected)/d.checked),sampleSize:d.checked,evidenceRefs:[d.sourceDigest]}:null},criticalControls:{security:null,privacy:null,rights:null,integrity:null}});
  if (benchmark.score !== d.score || benchmark.coverage !== d.coverage || benchmark.status !== d.status) throw Error('HANDOFF_SCORE_MISMATCH');
  return {handoff:d,benchmark,importSha256:hash(raw),sourceAuthentication:'NOT_PROVEN',threadCorrelation:d.threadId===null?'NONE':'DECLARED_ONLY',commercialEligible:false};
}
// Keep the actual scanner receipt byte-identical for existing Owner Control Center import.
export function validateOwnerHandoff(raw) { parseHandoff(raw); return raw; }
