import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOfficialRss, buildNewsLearningDraft } from './news-to-learning.mjs';

test('real Content Engine, CADS and Social Package contracts accept safe offline ECB fixture', async () => {
  const xml = '<rss version="2.0"><channel><item>'
    + '<title>ECB releases an update on payment systems</title>'
    + '<link>https://www.ecb.europa.eu/press/pr/date/2026/html/test.en.html</link>'
    + '<pubDate>Thu, 12 Nov 2026 12:00:00 GMT</pubDate>'
    + '</item></channel></rss>';
  const [entry] = parseOfficialRss(xml, {asOf:new Date('2026-11-14T00:00:00Z')});
  const result = await buildNewsLearningDraft(entry);
  assert.equal(result.plan.contractVersion,'CAPITAL_AI_CONTENT_ENGINE@1');
  assert.equal(result.plan.cadsQuality.technicalStatus,'PASS');
  assert.equal(result.socialPackage.contractVersion,'CAPITAL_AI_CONTENT_SOCIAL_PACKAGE@1');
  assert.equal(result.socialPackage.sourceSha,result.sourceSha);
  assert.equal(result.socialPackage.assets.length,4);
  assert.equal(result.socialPackage.approvals.length,0);
  assert.equal(result.socialPackage.deliveries.length,0);
  assert.equal(result.publicPublishAllowed,false);
});
