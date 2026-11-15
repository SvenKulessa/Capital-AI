import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import edition from './homeEditorialEdition.json';
import {planContentCampaign} from '../../contracts/contentEngine.ts';
import {projectHomeEditorial} from './homeEditorialAdmission.mjs';

const day = '2026-11-15';
const clone = () => structuredClone(edition);
const allowed = {decision:'APPROVED',websiteAllowed:true,
  evidenceRef:'TEST_ONLY_VERIFIED_FIXTURE_NOT_A_PRODUCTION_LICENSE',reviewedAt:'2026-11-14'};
function admitFixture() {
  const snapshot = clone();
  for (const story of snapshot.stories) {
    story.evidence.rights.story={...allowed};
    story.evidence.rights.source={...allowed};
    story.evidence.rights.graphic={...allowed};
  }
  return snapshot;
}
test('homepage uses actual verified Content Engine plan and keeps publication disabled',()=>{
  const plan = planContentCampaign(edition.contentEngine.campaign);
  assert.equal(plan.contractVersion,'CAPITAL_AI_CONTENT_ENGINE@1');
  assert.equal(plan.cadsQuality.technicalStatus,'PASS');
  assert.equal(plan.publication.publicPublishAllowed,false);
  assert.equal(edition.contentEngine.publicPublishAllowed,false);
  const sources=edition.stories.map(s=>[s.source.url,s.source.date]).sort((a,b)=>a[0].localeCompare(b[0]));
  assert.equal(edition.contentEngine.campaign.sourceSha,
    createHash('sha256').update(JSON.stringify(sources)).digest('hex'));
});
test('unreviewed source and image rights fail closed without claiming freshness or license',()=>{
  const result=projectHomeEditorial(edition,day,planContentCampaign);
  assert.equal(result.status,'RIGHTS_BLOCKED');
  assert.equal(result.stories.length,0);
});
test('fixture-approved fresh news keeps source, graphic, score and freshness metadata together',()=>{
  const result=projectHomeEditorial(admitFixture(),day,planContentCampaign);
  assert.equal(result.status,'READY');
  assert.equal(result.stories.length,2);
  assert.equal(result.stories[0].source.url,edition.stories[0].source.url);
  assert.equal(result.stories[0].graphic.caption,edition.stories[0].graphic.caption);
  assert.equal(result.stories[0].score.version,'CAPITAL_AI_HOME_EDITORIAL_SCORE@1');
  assert.equal(result.stories[0].score.value,88);
  assert.equal(result.stories[0].score.ageDays,3);
  assert.equal(result.stories.some(s=>s.id==='solana'),false);
});
test('stale fallback shows no dated claims, numbers or unapproved old articles',()=>{
  const result=projectHomeEditorial(admitFixture(),'2026-12-30',planContentCampaign);
  assert.equal(result.status,'STALE_FALLBACK');
  assert.deepEqual(result.stories,[]);
});
test('rights denial for source, article or graphic cannot be offset by high score',()=>{
  for (const key of ['story','source','graphic'] as const) {
    const item=admitFixture();
    for (const story of item.stories) {
      story.evidence.rights[key]={decision:'BLOCK',websiteAllowed:false,evidenceRef:null,reviewedAt:null};
    }
    const result=projectHomeEditorial(item,day,planContentCampaign);
    assert.equal(result.status,'RIGHTS_BLOCKED',key);
    assert.equal(result.stories.length,0,key);
  }
});
test('partial admission shows only actually approved and fresh content',()=>{
  const item=admitFixture();
  item.stories[0].evidence.rights.graphic={decision:'REVIEW_REQUIRED',websiteAllowed:false,evidenceRef:null,reviewedAt:null};
  const result=projectHomeEditorial(item,day,planContentCampaign);
  assert.equal(result.status,'READY');
  assert.deepEqual(result.stories.map(s=>s.id),['xrpl']);
});
test('missing source, invalid graphic evidence, pricing payload and contract tampering fail closed',()=>{
  const missing=clone();
  delete (missing.stories[0] as any).source;
  assert.equal(projectHomeEditorial(missing,day,planContentCampaign).status,'MISSING_DATA');
  const graphic=admitFixture();
  graphic.stories[1].evidence.graphic.assetId='home-other-vector-v1';
  assert.equal(projectHomeEditorial(graphic,day,planContentCampaign).status,'MISSING_DATA');
  const pricing=admitFixture();
  (pricing.stories[0].evidence as any).priceData={symbol:'SOL',price:999};
  assert.equal(projectHomeEditorial(pricing,day,planContentCampaign).status,'MISSING_DATA');
  const injected=admitFixture();
  injected.contentEngine.campaign.sourceUrls=['https://evil.example/'];
  assert.equal(projectHomeEditorial(injected,day,planContentCampaign).status,'MISSING_DATA');
  const pub=admitFixture();
  pub.contentEngine.publicPublishAllowed=true;
  assert.equal(projectHomeEditorial(pub,day,planContentCampaign).status,'MISSING_DATA');
});
