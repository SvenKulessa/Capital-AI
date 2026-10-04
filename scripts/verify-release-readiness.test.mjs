import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyReleaseReadiness as evaluateReadiness, REQUIRED_ASSET_CLASSES } from './verify-release-readiness.mjs';
import { productReleaseFixture } from './test-fixtures/product-release-bundle.mjs';

const digest='ghcr.io/svenkulessa/capital-ai@sha256:'+'a'.repeat(64);
const productEvidence = productReleaseFixture('b'.repeat(40), digest);
process.on('exit', productEvidence.cleanup);
const verifyReleaseReadiness = evidence => evaluateReadiness(evidence, { productEvidenceManifest: productEvidence.manifest, productEvidenceDirectory: productEvidence.directory });
const base={
  sourceSha:'b'.repeat(40), currentMainSha:'b'.repeat(40), requiredChecks:'PASS',
  brokers:{nats:{authenticated:true,jetstream:true},valkey:{connected:true}},
  pipeline:{scope:'FULL_PIPELINE',samples:600,p50Ms:20,p95Ms:80,maxMs:150},
  cads:{dataLeakFindings:0,coveredLayers:['ingress','normalization','scoring','stream','cache','storage','api','presentation']},
  assetClasses:REQUIRED_ASSET_CLASSES.map(assetClass=>({assetClass,concurrent:100,attempted:100,succeeded:100,failed:0,scoreEngine:'PASS',productionEligibility:'PASS',dataRights:'PASS'})),
  imageRef:digest, productionHandoff:'PASS'
};

test('all release gates permit only immutable digest deployment',()=>{
  const r=verifyReleaseReadiness(base);
  assert.equal(r.deployAllowed,true);
  assert.equal(r.assetClasses.length,6);
});

test('readiness never bypasses missing mandatory product prerequisites', () => {
  const report = evaluateReadiness(base);
  assert.equal(report.deployAllowed, false);
  assert.ok(report.reasons.includes('GATE_FAILED:productReleasePrerequisites'));
});

test('missing one asset class blocks deployment',()=>{
  const r=verifyReleaseReadiness({...base,assetClasses:base.assetClasses.filter(x=>x.assetClass!=='fixed_income')});
  assert.equal(r.deployAllowed,false);
  assert.ok(r.reasons.includes('ASSET_CLASS_NOT_PROVEN:fixed_income'));
});

test('200ms is strict and max latency at boundary blocks deployment',()=>{
  const r=verifyReleaseReadiness({...base,pipeline:{...base.pipeline,maxMs:200}});
  assert.equal(r.deployAllowed,false);
  assert.equal(r.checks.latencyBelow200ms,false);
});

test('control-plane availability without authenticated NATS JetStream evidence is insufficient',()=>{
  const r=verifyReleaseReadiness({...base,brokers:{...base.brokers,nats:{authenticated:false,jetstream:false}}});
  assert.equal(r.deployAllowed,false);
  assert.equal(r.checks.natsReachable,false);
});

test('repository head never implies NATS redeploy',()=>{
  assert.equal(verifyReleaseReadiness(base).policy.natsHeadOnlyRedeploy,false);
});


test('synthetic engine capacity never substitutes production eligibility or rights',()=>{
  const assetClasses=base.assetClasses.map((row,index)=>index===0?{...row,productionEligibility:'CAPACITY_ONLY',dataRights:'RESEARCH_ONLY'}:row);
  const r=verifyReleaseReadiness({...base,assetClasses});
  assert.equal(r.deployAllowed,false);
  assert.equal(r.assetClasses.find(x=>x.assetClass==='crypto').pass,false);
});

test('caller pass flag cannot override calculated capacity admission',()=>{
  const rows=base.assetClasses.map(row=>({...row,pass:true,productionEligibility:'CAPACITY_ONLY'}));
  const r=verifyReleaseReadiness({...base,assetClasses:rows});
  assert.equal(r.checks.assetClasses100Concurrent,false);
  assert.ok(r.assetClasses.every(row=>row.pass===false));
  assert.equal(r.deployAllowed,false);
});

test('duplicate class evidence is ambiguous regardless of input order',()=>{
  for(const rows of [[...base.assetClasses,base.assetClasses[0]],[base.assetClasses[0],...base.assetClasses]]) {
    const r=verifyReleaseReadiness({...base,assetClasses:rows});
    assert.equal(r.checks.uniqueAssetClassEvidence,false);
    assert.equal(r.deployAllowed,false);
  }
});

test('counts must be finite nonnegative integers with consistent totals',()=>{
  for(const change of [{concurrent:Infinity},{attempted:'100'},{failed:null},{succeeded:100.5},{attempted:101},{concurrent:101}]) {
    const rows=base.assetClasses.map((row,i)=>i===0?{...row,...change}:row);
    assert.equal(verifyReleaseReadiness({...base,assetClasses:rows}).assetClasses[0].pass,false);
  }
});
