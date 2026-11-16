import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import edition from './homeEditorialEdition.json';
import {planContentCampaign} from '../../contracts/contentEngine.ts';
import {projectHomeEditorial} from './homeEditorialAdmission.mjs';
import {
  HOME_EDITORIAL_REVIEW_VERSION, HOME_RIGHTS_USE_CASES,
  homeReviewContentSnapshot,
} from './homeEditorialRightsLedger.mjs';

const day = '2026-11-15';
const clone = () => structuredClone(edition);
const allowed = {decision:'APPROVED',websiteAllowed:true,
  evidenceRef:'TEST_ONLY_VERIFIED_FIXTURE_NOT_A_PRODUCTION_LICENSE',reviewedAt:'2026-11-14'};
function admitFixture() {
  const snapshot = clone();
  for (const story of snapshot.stories) {
    Object.assign(story.evidence.rights.story,allowed);
    Object.assign(story.evidence.rights.source,allowed);
    Object.assign(story.evidence.rights.graphic,allowed);
  }
  return snapshot;
}
function fixtureReviews(editionFixture: ReturnType<typeof clone>) {
  return editionFixture.stories.flatMap(story =>
    (['story','source','graphic'] as const).map(kind => ({
      reviewVersion:HOME_EDITORIAL_REVIEW_VERSION,
      decision:'APPROVED',
      storyId:story.id,
      kind,
      allowedUse:HOME_RIGHTS_USE_CASES[kind],
      evidenceRef:story.evidence.rights[kind].evidenceRef,
      reviewedAt:story.evidence.rights[kind].reviewedAt,
      contentSnapshot:homeReviewContentSnapshot(story),
    }))
  );
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
test('forged APPROVED flags without independent rights review cannot grant display',()=>{
  const result=projectHomeEditorial(admitFixture(),day,planContentCampaign);
  assert.equal(result.status,'RIGHTS_BLOCKED');
  assert.deepEqual(result.stories,[]);
});
test('fixture-approved fresh news keeps source, graphic, score and freshness metadata together',()=>{
  const item=admitFixture();
  const result=projectHomeEditorial(item,day,planContentCampaign,fixtureReviews(item));
  assert.equal(result.status,'READY');
  assert.equal(result.stories.length,2);
  assert.equal(result.stories[0].source.url,edition.stories[0].source.url);
  assert.equal(result.stories[0].graphic.caption,edition.stories[0].graphic.caption);
  assert.equal(result.stories[0].score.version,'CAPITAL_AI_HOME_EDITORIAL_SCORE@1');
  assert.equal(result.stories[0].score.value,88);
  assert.equal(result.stories[0].score.ageDays,3);
  assert.equal(result.stories.some((s: {id:string})=>s.id==='solana'),false);
});
test('stale fallback shows no dated claims, numbers or unapproved old articles',()=>{
  const item=admitFixture();
  const result=projectHomeEditorial(item,'2026-12-30',planContentCampaign,fixtureReviews(item));
  assert.equal(result.status,'STALE_FALLBACK');
  assert.deepEqual(result.stories,[]);
});
test('rights denial for source, article or graphic cannot be offset by high score',()=>{
  for (const key of ['story','source','graphic'] as const) {
    const item=admitFixture();
    const reviews=fixtureReviews(item);
    for (const story of item.stories) {
      Object.assign(story.evidence.rights[key],{decision:'BLOCK',websiteAllowed:false,evidenceRef:null,reviewedAt:null});
    }
    const result=projectHomeEditorial(item,day,planContentCampaign,reviews);
    assert.equal(result.status,'RIGHTS_BLOCKED',key);
    assert.equal(result.stories.length,0,key);
  }
});
test('partial admission shows only actually approved and fresh content',()=>{
  const item=admitFixture();
  const reviews=fixtureReviews(item);
  Object.assign(item.stories[0].evidence.rights.graphic,{decision:'REVIEW_REQUIRED',websiteAllowed:false,evidenceRef:null,reviewedAt:null});
  const result=projectHomeEditorial(item,day,planContentCampaign,reviews);
  assert.equal(result.status,'READY');
  assert.deepEqual(result.stories.map((s: {id:string})=>s.id),['xrpl']);
});
test('missing source, invalid graphic evidence, pricing payload and contract tampering fail closed',()=>{
  const missing=clone();
  delete (missing.stories[0] as any).source;
  assert.equal(projectHomeEditorial(missing,day,planContentCampaign).status,'MISSING_DATA');
  const graphic=admitFixture();
  graphic.stories[1].evidence.graphic.assetId='home-other-vector-v1';
  assert.equal(projectHomeEditorial(graphic,day,planContentCampaign).status,'MISSING_DATA');
  const pricing=admitFixture();
  Object.assign(pricing.stories[0].evidence,{priceData:{symbol:'SOL',price:999}});
  assert.equal(projectHomeEditorial(pricing,day,planContentCampaign).status,'MISSING_DATA');
  const injected=admitFixture();
  injected.contentEngine.campaign.sourceUrls=['https://evil.example/'];
  assert.equal(projectHomeEditorial(injected,day,planContentCampaign).status,'MISSING_DATA');
  const pub=admitFixture();
  Object.assign(pub.contentEngine,{publicPublishAllowed:true});
  assert.equal(projectHomeEditorial(pub,day,planContentCampaign).status,'MISSING_DATA');
});

test('separate verified snapshot vetoes edited or swapped content after approval',()=>{
  const item=admitFixture();
  const reviews=fixtureReviews(item);
  item.stories[0].summary+=' Nicht überprüfter neuer Satz.';
  const modified=projectHomeEditorial(item,day,planContentCampaign,reviews);
  assert.equal(modified.status,'READY');
  assert.deepEqual(modified.stories.map((s: {id:string})=>s.id),['xrpl']);
  const changed=admitFixture();
  const oldReviews=fixtureReviews(changed);
  (changed.stories[0].graphic as {labels: string[]}).labels.push('Zusätzliche Grafik');
  const graphic=projectHomeEditorial(changed,day,planContentCampaign,oldReviews);
  assert.equal(graphic.status,'READY'); // change is structurally valid, but approval is now stale
  assert.deepEqual(graphic.stories.map((s: {id:string})=>s.id),['xrpl']);
});
test('link-only evidence must not substitute for an original-summary or graphic review',()=>{
  const item=admitFixture();
  const reviews=fixtureReviews(item).filter(r=>r.kind==='source');
  assert.equal(projectHomeEditorial(item,day,planContentCampaign,reviews).status,'RIGHTS_BLOCKED');
});

test('real XRPL and revised Polygon drafts are not self-licensed; outdated Polygon OMS is excluded',()=>{
  const polygon=edition.stories.find(story=>story.id==='polygon');
  const xrpl=edition.stories.find(story=>story.id==='xrpl');
  const old=edition.stories.find(story=>story.id==='solana');
  assert.ok(polygon && xrpl && old);
  assert.equal(polygon.source.date,'2026-11-12');
  assert.match(polygon.title,/SoFiUSD/);
  assert.match(polygon.summary,/SoFi-App/);
  assert.match(polygon.context,/kein Bankguthaben/);
  assert.match(polygon.context,/FDIC/);
  assert.match(polygon.context,/SIPC/);
  for(const story of [polygon,xrpl,old]) {
    for(const kind of ['story','source','graphic'] as const) {
      assert.equal(story.evidence.rights[kind].decision,'REVIEW_REQUIRED');
      assert.equal(story.evidence.rights[kind].websiteAllowed,false);
      assert.equal(story.evidence.rights[kind].evidenceRef,null);
    }
  }
  assert.equal(old.source.date,'2026-10-29');
  assert.equal(projectHomeEditorial(edition,day,planContentCampaign).status,'RIGHTS_BLOCKED');
  const fixture=admitFixture();
  const review=fixtureReviews(fixture);
  const eligible=projectHomeEditorial(fixture,day,planContentCampaign,review);
  assert.equal(eligible.status,'READY');
  assert.deepEqual(eligible.stories.map((story:{id:string})=>story.id),['polygon','xrpl']);
});
