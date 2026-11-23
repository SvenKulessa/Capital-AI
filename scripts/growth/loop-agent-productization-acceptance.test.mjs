import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {runSyntheticLoopProductAcceptance} from './loop-agent-productization-acceptance.mjs';
test('complete synthetic subscription to bounded Loop to receipt, with billing and Growth denied',async()=>{
  const r=await runSyntheticLoopProductAcceptance();
  assert.equal(r.contract,'CAPITAL_AI_LOOP_SYNTHETIC_E2E@1');
  assert.equal(r.status,'SOURCE_IMPLEMENTED');
  assert.equal(r.mode,'SYNTHETIC_OFFLINE');
  assert.equal(r.authorization,'ADMITTED_NON_PRODUCTION');
  assert.equal(r.entitlement,'PRO');
  assert.equal(r.eventReplay,'REPLAY_IGNORED');
  assert.equal(r.subscriptionCount,1);
  assert.equal(r.usageCount,1);
  assert.match(r.usageReceiptSha256,/^[a-f0-9]{64}$/);
  assert.equal(r.growthEvidence,'NOT_PROVEN');
  assert.equal(r.providerBillingEvidence,'NOT_PROVEN');
  assert.equal(r.revenueEvidence,'NOT_PROVEN');
  assert.equal(r.cads.funnel,'NO_DATA');
});
test('synthetic acceptance deterministic across isolated replays',async()=>{
  const [a,b]=await Promise.all([runSyntheticLoopProductAcceptance(),runSyntheticLoopProductAcceptance()]);
  assert.deepEqual(a,b);
});
test('CLI never exposes sensitive evidence or real revenue claims',()=>{
  const raw=execFileSync(process.execPath,[new URL('./loop-agent-productization-acceptance.mjs',import.meta.url).pathname],{encoding:'utf8'});
  const r=JSON.parse(raw);
  assert.equal(r.mode,'SYNTHETIC_OFFLINE');
  assert.equal(r.growthEvidence,'NOT_PROVEN');
  assert.equal(raw.includes('whsec_'),false);
  assert.equal(raw.includes('sk_live_'),false);
});
