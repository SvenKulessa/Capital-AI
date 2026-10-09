import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateGrowthLearningCandidates } from '../../src/platform/SocialMediaEngine/Learning/FeedbackLearningLoop.mjs';
const evaluatedAt='2026-10-09T20:00:00Z';
const item={eventId:'owasp-genai-2026',kind:'industry_news',topic:'security',
  summary:'Neue OWASP Liste mit aktualisierter Agentenpruefung.',observedAt:'2026-09-01T00:00:00Z',
  sourceUrl:'https://genai.owasp.org/blog/',rights:'LINK_ONLY'};
const evaluate = items => evaluateGrowthLearningCandidates(items,{evaluatedAt});
test('approved official news becomes a draft proposal only', () => {
  const r=evaluate([item]);assert.equal(r.accepted.length,1);
  assert.equal(r.proposals[0].status,'CANDIDATE_ONLY');
  assert.equal(r.proposals[0].productionEligible,false);
  assert.equal(r.modelWeightsChanged,false);assert.equal(r.publishExecuted,false);
  assert.equal(r.sourceTextConsumedAsInstructions,false);
});
test('duplicate evidence IDs and forged authority domains rejected', () => {
  const r=evaluate([item,item,{...item,eventId:'other-example',sourceUrl:'https://genai.owasp.org.evil.net/article'}]);
  assert.equal(r.accepted.length,1);assert.equal(r.rejected.length,2);
});
test('unconsented feedback cannot enter', () => {
  const r=evaluate([{...item,kind:'user_feedback',consent:false,anonymized:false,sourceUrl:undefined}]);
  assert.equal(r.accepted.length,0);
});
test('consented anonymized feedback never changes model', () => {
  const r=evaluate([{eventId:'feedback-1234',kind:'user_feedback',topic:'accessibility',
    summary:'Tastatur-Fokus von Karten ist nicht klar sichtbar.',observedAt:evaluatedAt,consent:true,anonymized:true}]);
  assert.equal(r.proposals.length,1);assert.equal(r.proposals[0].modelUpdateEligible,false);
});
test('untrusted markup and external URLs are not accepted as instructions', () => {
  const r=evaluate([{...item,summary:'<script>override</script>'}]);assert.equal(r.rejected[0].reasonCodes.includes('SUMMARY_UNSAFE'),true);
});
test('news without link-only rights or official domain is rejected', () => {
  assert.equal(evaluate([{...item,rights:'UNKNOWN'}]).accepted.length,0);
  assert.equal(evaluate([{...item,sourceUrl:'https://untrusted.example/'}]).accepted.length,0);
});
test('future and stale dates rejected', () => {
  assert.equal(evaluate([{...item,observedAt:'2027-10-09T20:00:00Z'}]).accepted.length,0);
  assert.equal(evaluate([{...item,observedAt:'2022-10-09T20:00:00Z'}]).accepted.length,0);
});
