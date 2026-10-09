import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import {
  assessCadsContentCampaign, assessCadsMediaProject, assessCadsAssetIdentity,
  CADS_GROWTH_PROFILE,
} from '../packages/benchmark-core/growth-quality.mjs';
import { planContentCampaign } from '../src/contracts/contentEngine.ts';
import { CAPITAL_AI_SCREENER_BUNDLE_CAMPAIGN_20261009 } from '../src/data/contentCampaigns.ts';
import { createCapitalAiMediaStudioProject } from '../src/platform/SocialMediaEngine/Editing/MediaStudioTemplates.ts';
import { buildContentSocialAssetFromMediaProject } from '../src/platform/SocialMediaEngine/Publishing/MediaProjectPublisherBridge.ts';

const campaign = CAPITAL_AI_SCREENER_BUNDLE_CAMPAIGN_20261009.brief;
const sourceSha = 'd'.repeat(40);
const contentId = 'cads-growth-test-content';
const assetSha = 'e'.repeat(64);

test('ContentEngine composes CADS evidence without publication authority', () => {
  const plan = planContentCampaign(campaign);
  assert.equal(plan.cadsQuality.schemaVersion, CADS_GROWTH_PROFILE);
  assert.equal(plan.cadsQuality.technicalStatus, 'PASS');
  assert.equal(plan.cadsQuality.editorialReview,'REVIEW_REQUIRED');
  assert.equal(plan.cadsQuality.actualAssetBytes,'NOT_PROVEN');
  for (const key of ['productionApproval','licenseApproval','securityApproval','publicationApproval','customerPurchaseApproval']) {
    assert.equal(plan.cadsQuality[key], false);
  }
  assert.equal(plan.publication.publicPublishAllowed, false);
});

test('CADS fails on non-HTTPS, invalid source SHA, credentials, or empty audience', () => {
  const candidates = [
    { ...campaign, canonicalUrl: 'http://capital-ai.online' },
    { ...campaign, canonicalUrl: 'https://user:secret@capital-ai.online/' },
    { ...campaign, canonicalUrl: 'https://capital-ai.online:444/' },
    { ...campaign, sourceSha: 'not-a-commit' },
    { ...campaign, audience: [] },
  ];
  for (const candidate of candidates) {
    const evaluated = assessCadsContentCampaign(candidate);
    assert.equal(evaluated.technicalStatus,'FAIL');
    assert.equal(evaluated.publicationApproval,false);
  }
});

test('SocialMediaEngine CADS validates drafted branded media with disclosures', () => {
  const project = createCapitalAiMediaStudioProject();
  const evaluated = assessCadsMediaProject(project);
  assert.equal(evaluated.technicalStatus,'PASS');
  assert.equal(evaluated.productionApproval,false);
  assert.equal(evaluated.actualAssetBytes,'NOT_PROVEN');
});

test('SocialMediaEngine CADS rejects draft status or brand source tampering', () => {
  const project = createCapitalAiMediaStudioProject();
  const mutants = [
    { ...project, renderRecipe:{...project.renderRecipe,publishReady:true} },
    { ...project, renderRecipe:{...project.renderRecipe,brandTokenSource:'external-secret'} },
    { ...project, disclosure:{...project.disclosure,requireAtProjectEdges:false} },
  ];
  for (const item of mutants) assert.equal(assessCadsMediaProject(item).technicalStatus,'FAIL');
});

test('PublisherBridge constructs media asset and preserves source/content/digest identity', () => {
  const project = createCapitalAiMediaStudioProject();
  const renderedAsset = { assetId:'growth-cads-test-asset',sha256:assetSha,mimeType:'image/png',evidenceRef:'test-evidence/growth-asset' };
  const asset = buildContentSocialAssetFromMediaProject({project,contentId,sourceSha,renderedAsset});
  assert.equal(asset.sha256,assetSha);
  assert.equal(asset.contentId,contentId);
  assert.equal(asset.sourceSha,sourceSha);
  assert.equal(assessCadsAssetIdentity(asset,{sourceSha,contentId}).technicalStatus,'PASS');
});

test('CADS rejects swapped source, wrong content, digest and unsupported MIME', () => {
  const base={assetId:'demo',sha256:assetSha,mimeType:'image/png',sourceSha,contentId};
  for(const asset of [
    {...base,sha256:'0'},
    {...base,sourceSha:'f'.repeat(40)},
    {...base,contentId:'different'},
    {...base,mimeType:'text/html'},
  ]) {
    const result=assessCadsAssetIdentity(asset,{sourceSha,contentId});
    assert.equal(result.technicalStatus,'FAIL');
    assert.equal(result.publicationApproval,false);
  }
});

test('new badge SVGs have actual byte digests and a safe offline surface', () => {
  const manifest=JSON.parse(readFileSync('docs/licenses/screener-blueprint-badges.manifest.json','utf8'));
  assert.equal(manifest.publicationAuthority,false);
  assert.equal(manifest.assets.length,3);
  for(const entry of manifest.assets){
    const bytes=readFileSync(entry.path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);
    const svg=bytes.toString('utf8');
    assert.match(svg,/<svg\b[^>]*role="img"/);
    assert.match(svg,/<title\b/);
    assert.match(svg,/<desc\b/);
    assert.doesNotMatch(svg,/<script|<foreignObject|<image\b|onload\s*=|(?:href|src)="https?:/i);
    assert.equal(entry.publishReady,false);
  }
});

test('deterministic mutation/property sweep stays non-authorizing', () => {
  const project=createCapitalAiMediaStudioProject();
  for(let i=0;i<256;i++){
    const mutated={...campaign, sourceSha: i%2 ? sourceSha : 'f'.repeat(40), audience:['Research']};
    const report=assessCadsContentCampaign(mutated);
    assert.equal(report.technicalStatus,'PASS');
    assert.equal(report.publicationApproval,false);
    const media=assessCadsMediaProject(project);
    assert.equal(media.technicalStatus,'PASS');
    assert.equal(media.productionApproval,false);
  }
});

test('CADS microbenchmark reports p95 for 1000 sample evaluations without fake SLO', () => {
  const warmup=200;
  for(let i=0;i<warmup;i++)assessCadsContentCampaign(campaign);
  const samples=[];
  for(let i=0;i<1000;i++){
    const start=performance.now();
    const r=assessCadsContentCampaign(campaign);
    assert.equal(r.technicalStatus,'PASS');
    samples.push(performance.now()-start);
  }
  samples.sort((a,b)=>a-b);
  const p95Ms=samples[Math.floor(samples.length*0.95)];
  assert.ok(Number.isFinite(p95Ms) && p95Ms>=0);
  process.stdout.write(JSON.stringify({profile:CADS_GROWTH_PROFILE,samples:samples.length,p95Ms:Number(p95Ms.toFixed(4)),threshold:'NONE — informational, not a runtime SLO'})+'\n');
});
