import { createHash } from 'node:crypto';
import { createDocumentHygieneBenchmark, compareDocumentHygieneBenchmarks, HYGIENE_WEIGHTS } from '../benchmark-core/document-hygiene.mjs';
export const PRODUCT = Object.freeze({schemaVersion:'CAPITAL_AI_EIF_PRODUCT@1', id:'CAPITAL-AI-PRODUCT:EIF', version:'0.2.0-demo', issue:895, status:'PRIVATE_DEMO_ONLY', formats:Object.freeze(['blueprint','cli','mcp-stdio']), checkoutEnabled:false, marketplaceEnabled:false, commercialEligible:false});
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const keys = Object.keys(HYGIENE_WEIGHTS);
const controls = ['security','privacy','rights','integrity'];
// Fixed synthetic metadata, not customer evidence. No external input, file access or provider calls.
export function syntheticInput(phase='before') {
  if (!['before','after','blocked','unknown'].includes(phase)) throw new Error('UNSUPPORTED_FIXTURE');
  const ids=['synthetic-doc-1','synthetic-doc-2','synthetic-doc-3','synthetic-doc-4'];
  const observations = ids.map((id,i)=>({id,checks:Object.fromEntries(keys.map(k=>[k,phase!=='before'||i!==0||!['freshness','correctness','structure','promptRouting'].includes(k)]))}));
  const dimensions = Object.fromEntries(keys.map(k=>[k,{score:100*observations.filter(d=>d.checks[k]).length/ids.length,sampleSize:ids.length,evidenceRefs:ids.map(id=>`${id}:${k}`)}]));
  const criticalControls=Object.fromEntries(controls.map(k=>[k,{status:phase==='blocked'&&k==='rights'?'FAIL':'PASS',evidenceRefs:[`synthetic-control:${k}`]}]));
  if(phase==='unknown') criticalControls.privacy=null;
  return {runId:`fixture-${phase}`,scopeDigest:hash(ids),methodId:'synthetic-metadata-v1',dimensions,criticalControls};
}
// Reuse the existing CADS scoring contract; caller observations are not independently verified.
export function evaluateObservations(input) {return createDocumentHygieneBenchmark(input);}
export function demo() {
  const before=syntheticInput(),after=syntheticInput('after');
  return {product:PRODUCT, evidenceClass:'SYNTHETIC_FIXTURE_ONLY', before:evaluateObservations(before),after:evaluateObservations(after),comparison:compareDocumentHygieneBenchmarks(before,after),blocked:evaluateObservations(syntheticInput('blocked')).status,unknown:evaluateObservations(syntheticInput('unknown')).status,externalProviderCalls:0};
}
