import assert from 'node:assert/strict';
import test from 'node:test';
import '../eif-product/index.test.mjs';
import '../eif-product/handoff.test.mjs';
import { CHAT_BENCHMARK_DIMENSIONS, CHAT_BENCHMARK_VERSION, createChatBenchmark, createPublicChatBenchmarkProjection } from './chat-quality.mjs';

const dimensions = Object.fromEntries(Object.entries(CHAT_BENCHMARK_DIMENSIONS).map(([id, maxScore]) => [id, {
  score: maxScore,
  status: 'VERIFIED',
  evidenceRefs: [`evidence://${id}`],
  findings: [],
  improvementActions: [],
}]));

test('chat quality score and coverage are deterministic', () => {
  const value = createChatBenchmark({ benchmarkId: 'chat-1', taskClass: 'PRODUCT', evaluatedAt: '2026-11-20T06:00:00.000Z', dimensions });
  assert.equal(value.schemaVersion, CHAT_BENCHMARK_VERSION);
  assert.equal(value.score, 100);
  assert.equal(value.coverage, 100);
  assert.equal(value.publishable, true);
  assert.equal(value.decision.productionEligible, false);
});

test('not proven evidence reduces coverage and cannot be published', () => {
  const partial = structuredClone(dimensions);
  partial.evidenceQuality = { score: 0, status: 'NOT_PROVEN', evidenceRefs: ['evidence://missing'], findings: [], improvementActions: ['Collect evidence'] };
  const value = createChatBenchmark({ benchmarkId: 'chat-2', dimensions: partial });
  assert.equal(value.coverage, 80);
  assert.equal(value.publishable, false);
  assert.equal(createPublicChatBenchmarkProjection(value), null);
});

test('verified dimensions require an evidence reference before they can be published', () => {
  const missing = structuredClone(dimensions);
  missing.evidenceQuality.evidenceRefs = [];
  assert.throws(() => createChatBenchmark({ benchmarkId: 'chat-5', dimensions: missing }),
    /VERIFIED_CHAT_BENCHMARK_EVIDENCE_REQUIRED/);
});

test('scores outside their dimension budget fail closed', () => {
  const invalid = structuredClone(dimensions);
  invalid.communicationAndAccessibility.score = 11;
  assert.throws(() => createChatBenchmark({ benchmarkId: 'chat-3', dimensions: invalid }), /INVALID_CHAT_BENCHMARK_SCORE/);
});

test('public projection strips evidence references and findings', () => {
  const value = createChatBenchmark({ benchmarkId: 'chat-4', dimensions });
  const projection = createPublicChatBenchmarkProjection(value);
  assert.equal(projection.score, 100);
  assert.equal('evidenceRefs' in projection.dimensions.taskCompletion, false);
});

// Document hygiene profile: synthetic reference cases only.
import { HYGIENE_WEIGHTS, createDocumentHygieneBenchmark, compareDocumentHygieneBenchmarks } from './document-hygiene.mjs';
const CRITICAL_CONTROLS=['security','privacy','rights','integrity'];
function fixture(runId="run-1",score=80){return {runId,scopeDigest:"a".repeat(64),methodId:"fixture-v1",dimensions:Object.fromEntries(Object.keys(HYGIENE_WEIGHTS).map(k=>[k,{score,sampleSize:2,evidenceRefs:["synthetic:"+k]}])),criticalControls:Object.fromEntries(CRITICAL_CONTROLS.map(k=>[k,{status:"PASS",evidenceRefs:["synthetic:"+k]}]))}}
function checks(){
const results=[];function check(name,fn){try{if(fn()!==true)throw Error("assertion");results.push([name,true])}catch(e){results.push([name,false,String(e)])}}
const a=fixture(),b=fixture("run-2",90);
check("weighted score",()=>createDocumentHygieneBenchmark(a).score===80);
check("complete remains review only",()=>{const v=createDocumentHygieneBenchmark(a);return v.coverage===100&&v.status==="REVIEW_REQUIRED"&&!v.authorityGranted&&!v.productionEligible&&!v.commercialEligible});
check("missing dimension",()=>{const v=fixture();v.dimensions.freshness=null;const r=createDocumentHygieneBenchmark(v);return r.coverage===85&&r.score===80&&r.status==="NOT_PROVEN"});
check("no measurement is null",()=>{const v=fixture();for(const k of Object.keys(v.dimensions))v.dimensions[k]=null;return createDocumentHygieneBenchmark(v).score===null});
check("critical failure beats perfect score",()=>{const v=fixture("run-3",100);v.criticalControls.rights.status="FAIL";return createDocumentHygieneBenchmark(v).status==="BLOCKED"});
check("missing critical control",()=>{const v=fixture();v.criticalControls.privacy=null;return createDocumentHygieneBenchmark(v).status==="NOT_PROVEN"});
check("missing refs denied",()=>{const v=fixture();v.dimensions.provenance.evidenceRefs=[];try{createDocumentHygieneBenchmark(v);return false}catch{return true}});
check("out of range denied",()=>{const v=fixture();v.dimensions.freshness.score=101;try{createDocumentHygieneBenchmark(v);return false}catch{return true}});
check("same scope comparison",()=>{const r=compareDocumentHygieneBenchmarks(a,b);return r.comparable&&r.deltaPoints===10&&r.relativePercent===12.5});
check("different scope rejected",()=>{const v=fixture("run-2");v.scopeDigest="b".repeat(64);return !compareDocumentHygieneBenchmarks(a,v).comparable});
check("different sample rejected",()=>{const v=fixture("run-2");v.dimensions.freshness.sampleSize=3;return !compareDocumentHygieneBenchmarks(a,v).comparable});
check("critical regression",()=>{const v=fixture("run-2",100);v.criticalControls.integrity=null;return compareDocumentHygieneBenchmarks(a,v).criticalRegression});
check("zero baseline relative null",()=>compareDocumentHygieneBenchmarks(fixture("run-0",0),b).relativePercent===null);
check("duplicate ref denied",()=>{const v=fixture();v.dimensions.freshness.evidenceRefs=["x","x"];try{createDocumentHygieneBenchmark(v);return false}catch{return true}});
return results}
for(const [name,passed,error] of checks()) test('document hygiene: '+name,()=>assert.equal(passed,true,error));
