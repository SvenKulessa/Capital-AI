import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRaceDistribution,reconcileRaceDemand} from './agent-race-distribution.mjs';
const plan={"publicationState":"DRAFT_ONLY","publicPublishAllowed":false,"providerCalls":0,"campaignSpend":0,"products":[{"id":"agent-race"}]};
const fixture={"asOf":"2026-11-28T12:00:00Z","consents":[{"subjectKey":"0000000000000000000000000000000000000000000000000000000000000001","receiptSha256":"0000000000000000000000000000000000000000000000000000000000000002","grantedAt":"2026-11-28T08:00:00Z","expiresAt":"2026-11-29T08:00:00Z","revokedAt":null,"analytics":true}],"events":[{"subjectKey":"0000000000000000000000000000000000000000000000000000000000000001","receiptSha256":"0000000000000000000000000000000000000000000000000000000000000003","consentSha256":"0000000000000000000000000000000000000000000000000000000000000002","occurredAt":"2026-11-28T09:00:00Z","campaignId":"agent-race-pilot-v1","channel":"instagram","kind":"VISIT","priceCents":null},{"subjectKey":"0000000000000000000000000000000000000000000000000000000000000001","receiptSha256":"0000000000000000000000000000000000000000000000000000000000000004","consentSha256":"0000000000000000000000000000000000000000000000000000000000000002","occurredAt":"2026-11-28T10:00:00Z","campaignId":"agent-race-pilot-v1","channel":"instagram","kind":"COMPLETION","priceCents":null},{"subjectKey":"0000000000000000000000000000000000000000000000000000000000000001","receiptSha256":"0000000000000000000000000000000000000000000000000000000000000005","consentSha256":"0000000000000000000000000000000000000000000000000000000000000002","occurredAt":"2026-11-28T11:00:00Z","campaignId":"agent-race-pilot-v1","channel":"instagram","kind":"PRICE_RESPONSE","priceCents":990}]};
function checks(assert,build,reconcile,plan,fixture){
 const clone=x=>JSON.parse(JSON.stringify(x));const a=build(plan);assert(a.channels.length===10&&a.channels.every(c=>c.publication==="HOLD")&&a.providerCalls===0,"draft channels");assert(a.channels.filter(c=>c.smartClip).length===3,"SmartClip drafts");assert(JSON.stringify(a)===JSON.stringify(build(plan)),"determinism");
 let failed=false;try{build({...plan,publicPublishAllowed:true})}catch{failed=true}assert(failed,"publish denied");
 const r=reconcile(fixture);assert(r.candidateVisitors===1&&r.candidateCompleted===1&&r.candidatePositivePriceResponses===1&&r.liveVisitors===null,"valid candidate only");
 const dup=clone(fixture);dup.events.push({...dup.events[0],receiptSha256:"f".repeat(64),channel:"x"});assert(reconcile(dup).candidateVisitors===1,"cross-channel dedup");
 const revoke=clone(fixture);revoke.consents[0].revokedAt="2026-11-28T11:30:00Z";assert(reconcile(revoke).candidateVisitors===null,"revocation");
 const deny=clone(fixture);deny.consents[0].analytics=false;assert(reconcile(deny).candidateVisitors===null,"denial");
 const noConsent=clone(fixture);noConsent.consents=[];assert(reconcile(noConsent).candidateVisitors===null,"no consent");
 const replay=clone(fixture);replay.events.push(replay.events[0]);failed=false;try{reconcile(replay)}catch{failed=true}assert(failed,"replay rejected");
 const pii=clone(fixture);pii.events[0].email="test@example.invalid";failed=false;try{reconcile(pii)}catch{failed=true}assert(failed,"unknown PII rejected");
 const orphan=clone(fixture);orphan.events.shift();assert(reconcile(orphan).candidateCompleted===null,"no orphan conversion"); 
}
test('Agent Race offline draft and attribution safety',()=>checks((v,m)=>assert.ok(v,m),buildRaceDistribution,reconcileRaceDemand,plan,fixture));

import './agent-race-candidate.test.mjs';
