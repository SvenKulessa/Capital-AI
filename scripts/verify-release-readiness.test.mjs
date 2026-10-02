import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyReleaseReadiness, REQUIRED_ASSET_CLASSES } from './verify-release-readiness.mjs';

const digest='ghcr.io/svenkulessa/capital-ai@sha256:'+'a'.repeat(64);
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
