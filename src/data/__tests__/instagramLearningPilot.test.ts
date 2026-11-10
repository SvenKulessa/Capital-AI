import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ContentCampaignBriefSchema } from '../../contracts/contentEngine.ts';
import { GrowthMarketingChannelSchema } from '../../contracts/growthAiPromotion.ts';
import { buildInstagramLearningTrackingUrl, readInstagramLearningTracking, INSTAGRAM_LEARNING_TRACKING } from '../../contracts/instagramCampaignTracking.ts';
import { ContentSocialPackageManifestSchema } from '../../contracts/contentSocialPackage.ts';
import { INSTAGRAM_PILOT_CAMPAIGN, INSTAGRAM_PILOT_PACKAGE,
  INSTAGRAM_PILOT_PLAN, INSTAGRAM_PILOT_SLIDES, INSTAGRAM_PILOT_STATUS,
  INSTAGRAM_PILOT_CAPTION, INSTAGRAM_PILOT_SOURCE_SHA, INSTAGRAM_PILOT_TRACKING_URL, INSTAGRAM_PILOT_CONTENT_ID } from '../instagramLearningPilot.ts';

test('Instagram uses existing campaign, CADS and Social Package contracts', () => {
  assert.equal(GrowthMarketingChannelSchema.parse('INSTAGRAM'), 'INSTAGRAM');
  assert.ok(ContentCampaignBriefSchema.parse(INSTAGRAM_PILOT_CAMPAIGN).channels.includes('INSTAGRAM'));
  assert.equal(INSTAGRAM_PILOT_PLAN.cadsQuality.technicalStatus, 'PASS');
  assert.equal(INSTAGRAM_PILOT_PLAN.publication.publicPublishAllowed, false);
  assert.equal(ContentSocialPackageManifestSchema.parse(INSTAGRAM_PILOT_PACKAGE).sourceSha, INSTAGRAM_PILOT_SOURCE_SHA);
  assert.equal(INSTAGRAM_PILOT_PACKAGE.publicationAuthority, 'SOCIAL_MEDIA_ENGINE_ONLY');
  assert.deepEqual(INSTAGRAM_PILOT_PACKAGE.approvals, []);
  assert.deepEqual(INSTAGRAM_PILOT_PACKAGE.deliveries, []);
});
test('SVG byte integrity, accessibility and dimensions are checked', () => {
  assert.equal(INSTAGRAM_PILOT_SLIDES.length, 3);
  for (const slide of INSTAGRAM_PILOT_SLIDES) {
    assert.match(slide.alt, /Grafik/);
    const bytes = readFileSync(new URL('../../../public'+slide.path, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), slide.sha256);
    const svg = bytes.toString('utf8');
    assert.match(svg, /width="1080" height="1350"/);
    assert.match(svg, /<title>.*<\/title>/);
    assert.match(svg, /<desc>.*<\/desc>/);
    assert.doesNotMatch(svg, /<script|foreignObject|<image|onload=|url\(/i);
    assert.doesNotMatch(svg, /(?:href|src)=["']https?:\/\//i);
  }
  assert.equal(INSTAGRAM_PILOT_PACKAGE.assets.length, 3);
  assert.ok(INSTAGRAM_PILOT_PACKAGE.assets.every((asset,i)=>asset.sha256===INSTAGRAM_PILOT_SLIDES[i].sha256));
});
test('synthetic spread, review and no auto-publish are explicit', () => {
  assert.equal(Number((100.10-99.90).toFixed(2)),0.20);
  for (const number of ['100,10','99,90','0,20']) assert.ok(INSTAGRAM_PILOT_CAPTION.includes(number));
  assert.match(INSTAGRAM_PILOT_CAPTION,/synthetisch/);
  assert.match(INSTAGRAM_PILOT_CAPTION,/Keine individuelle Anlageberatung/);
  assert.equal(INSTAGRAM_PILOT_STATUS.publicPublishAllowed,false);
  assert.equal(INSTAGRAM_PILOT_STATUS.providerCalls,0);
  assert.equal(INSTAGRAM_PILOT_STATUS.scheduled,false);
  const studio=readFileSync(new URL('../../features/studio/ContentStudioPanel.tsx',import.meta.url),'utf8');
  const panel=readFileSync(new URL('../../features/studio/InstagramLearningPilot.tsx',import.meta.url),'utf8');
  assert.match(studio,/<InstagramLearningPilot\s*\/>/);
  assert.match(panel,/readOnly rows=\{10\}/);
  assert.match(panel,/PNG herunterladen/);
  assert.doesNotMatch(panel,/provider-publish|publishPost|fetch\(/);
});

test('source-bound Instagram UTM link is non-identifying and rejects modified or duplicate campaign fields', () => {
  assert.equal(INSTAGRAM_PILOT_TRACKING_URL, buildInstagramLearningTrackingUrl());
  const url = new URL(INSTAGRAM_PILOT_TRACKING_URL);
  assert.equal(url.origin, 'https://capital-ai.online');
  assert.equal(url.pathname, '/learning');
  assert.equal(url.searchParams.get('utm_source'), 'instagram');
  assert.equal(url.searchParams.get('utm_medium'), 'organic_social');
  assert.equal(url.searchParams.get('utm_campaign'), INSTAGRAM_PILOT_CAMPAIGN.campaignId);
  assert.equal(url.searchParams.get('utm_content'), INSTAGRAM_PILOT_CONTENT_ID);
  assert.equal(INSTAGRAM_PILOT_CAMPAIGN.campaignId, INSTAGRAM_LEARNING_TRACKING.campaignId);
  assert.equal(INSTAGRAM_PILOT_CONTENT_ID, INSTAGRAM_LEARNING_TRACKING.contentId);
  assert.deepEqual(readInstagramLearningTracking(url.search), INSTAGRAM_LEARNING_TRACKING);
  assert.deepEqual(readInstagramLearningTracking(url.search + '&fbclid=untrusted&email=private%40example.test'), INSTAGRAM_LEARNING_TRACKING);
  assert.equal(readInstagramLearningTracking(url.search + '&utm_source=instagram'), null);
  assert.equal(readInstagramLearningTracking(url.search.replace('utm_source=instagram', 'utm_source=attacker')), null);
  assert.equal(readInstagramLearningTracking('?utm_source=instagram'), null);
  assert.equal(readInstagramLearningTracking(null), null);
  assert.ok(!url.searchParams.has('user') && !url.searchParams.has('email'));
  const studio = readFileSync(new URL('../../features/studio/InstagramLearningPilot.tsx', import.meta.url), 'utf8');
  assert.match(studio, /Profil-Link kopieren/);
  assert.match(studio, /readOnly type="text" value=\{INSTAGRAM_PILOT_TRACKING_URL\}/);
});
