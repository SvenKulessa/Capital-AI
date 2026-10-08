import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMMODITY_OWNER_PROMOTION_DECISION_CONTRACT_VERSION,
  assessCommodityOwnerPromotionDecision,
  COMMODITY_PROMOTION_PACKAGE_CONTRACT_VERSION,
} from '../CommodityModelPromotion.ts';
import {
  COMMODITY_P2_EVIDENCE_PIPELINE_VERSION,
  runCommodityP2EvidencePipeline,
} from '../CommodityP2EvidencePipeline.ts';
import { buildNewsDerivedSentimentFeatureAttestations } from '../SentimentNewsFeatureEvidenceAdapter.ts';

test('commodity P2 review remains a non-mutating evidence pipeline', () => {
  assert.equal(COMMODITY_P2_EVIDENCE_PIPELINE_VERSION, 'commodity-p2-evidence-pipeline/1.0.0');
  assert.equal(COMMODITY_PROMOTION_PACKAGE_CONTRACT_VERSION, 'commodity-model-promotion-package/1.0.0');
  assert.equal(typeof runCommodityP2EvidencePipeline, 'function');
});
test('commodity promotion rejects missing human-approval and never changes scoring runtime', () => {
 const p={readyForOwnerReview:false,packageFingerprint:'digest-123'} as Parameters<typeof assessCommodityOwnerPromotionDecision>[0];
 const d={
   contractVersion:COMMODITY_OWNER_PROMOTION_DECISION_CONTRACT_VERSION,
   principalType:'AGENT', principalId:'', decidedAt:'invalid',
   evidenceId:'',explicit:false,decision:'APPROVE',packageFingerprint:'wrong',
 } as unknown as Parameters<typeof assessCommodityOwnerPromotionDecision>[1];
 const r=assessCommodityOwnerPromotionDecision(p,d);
 assert.equal(r.valid,false);
 assert.equal(r.approvedForControlledPromotion,false);
 assert.equal(r.scoreEligible,false);
 assert.equal(r.registryMutationPerformed,false);
 assert.ok(r.blockers.includes('PROMOTION_PACKAGE_NOT_READY_FOR_OWNER_REVIEW'));
 assert.ok(r.blockers.includes('OWNER_DECISION_PRINCIPAL_TYPE_INVALID'));
 assert.ok(r.blockers.includes('OWNER_DECISION_PACKAGE_FINGERPRINT_MISMATCH'));
});
test('news sentiment only derives deterministic novelty and mentions, not polarity', () => {
 const now=Date.parse('2026-10-08T12:00:00.000Z');
 const records=[
  {evidenceRef:'news:a',publishedAt:'2026-10-08T10:00:00.000Z',headline:'Crypto Update'},
  {evidenceRef:'news:b',publishedAt:'2026-10-08T10:30:00.000Z',headline:'Crypto update!'},
  {evidenceRef:'news:old',publishedAt:'2026-10-06T10:30:00.000Z',headline:'Old'},
 ];
 const res=buildNewsDerivedSentimentFeatureAttestations(records,now);
 assert.equal(res.size,2);
 assert.equal(res.get('news:a')?.novelty?.value,0.5);
 assert.equal(res.get('news:b')?.mentionIntensity?.value,0.1);
 assert.equal(res.get('news:a')?.polarity,undefined);
 assert.equal(res.has('news:old'),false);
});
