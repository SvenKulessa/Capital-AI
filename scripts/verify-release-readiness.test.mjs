import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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


// Source-version projection only. Never infer live service status from a lockfile.
test('inventory must match lockfiles and immutable build identities', () => {
  const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
  const inventory = read('src/data/externalComponentInventory.ts');
  const root = JSON.parse(read('package-lock.json'));
  const runtime = JSON.parse(read('deploy/runtime/package-lock.json'));
  const block = id => {
    const row = inventory.split("id: '" + id + "'")[1]?.split('\n  },')[0];
    assert.ok(row, 'Missing inventory component: ' + id);
    return row;
  };
  const version = name => root.packages['node_modules/' + name]?.version;
  const web = block('web-build-stack');
  for (const [label, name] of [['Vite', 'vite'], ['TypeScript', 'typescript'], ['Tailwind', 'tailwindcss'],
    ['React', 'react'], ['Lucide', 'lucide-react'], ['Motion', 'motion'], ['Three.js', 'three']]) {
    assert.ok(web.includes(label + ' ' + version(name)), 'Outdated web inventory: ' + name);
  }
  assert.match(web, /TypeScript 7\.0\.2 BLOCKED/);
  const ai = block('google-genai');
  assert.ok(ai.includes(version('@google/genai') + ' (package-lock.json)'));
  const runtimeRow = block('web-runtime-dependencies');
  for (const [label, name] of [['NATS JS', '@nats-io/jetstream'], ['redis', 'redis'],
    ['zod', 'zod'], ['nodemailer', 'nodemailer']]) {
    assert.ok(runtimeRow.includes(label + ' ' + runtime.packages['node_modules/' + name]?.version),
      'Outdated runtime inventory: ' + name);
  }
  const natsDockerfile = read('deploy/Dockerfile.nats');
  const nats = block('nats-jetstream');
  const binaryVersion = natsDockerfile.match(/^ENV NATS_SERVER=([0-9.]+)/m)?.[1];
  assert.ok(binaryVersion && nats.includes('nats-server ' + binaryVersion));
  assert.match(nats, /activeVersion: null/);
  assert.match(nats, /deployed runtime NOT_PROVEN/);
  const docker = read('Dockerfile');
  const node = block('node-runtime');
  const pin = docker.match(/^FROM node:([0-9.]+)-alpine@(sha256:[a-f0-9]{64})/m);
  assert.ok(pin && node.includes("activeVersion: '" + pin[1] + "'") && node.includes(pin[2]));
});

test('dependabot keeps isolated backend scopes and leaves Android builds to the Mobile repository', () => {
  const policy = readFileSync(new URL('../.github/dependabot.yml', import.meta.url), 'utf8');
  assert.match(policy, /package-ecosystem: npm\n    directory: \/deploy\/runtime/);
  assert.match(policy, /dependency-name: "typescript"[\s\S]*?versions:[\s\S]*?- "7\.0\.2"/);
  assert.doesNotMatch(policy, /directory: \/mobile\//);
  assert.doesNotMatch(policy, /package-ecosystem: gradle/);
  const index = readFileSync(new URL('../server/index.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(index, /createMobileScorer|\/api\/mobile\/enterprise-score/);
  const docker = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
  assert.doesNotMatch(docker, /server\/mobile-scorer\.mjs/);
  const catalog = readFileSync(new URL('../server/repository-tool-catalog.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(catalog, /mobile\/android-private/);
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.match(readme, /SvenKulessa\/Capital-AI-Mobile/);
});
