import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFile } from 'node:fs/promises';
import {
  advanceNewsEdition, retireNews, newsArchivePath, proposeMarketImpact, appendMarketImpactAssessment, newsBiImpactRows, newsBiCsv, publishedNews,
} from '../../shared/news-lifecycle.mjs';
import { selectHomeEdition } from './home-editorial-edition.mjs';
import { archiveContentSnapshot, archiveRightsAdmitted, marketImpactAdmitted, NEWS_ARCHIVE_REVIEW_VERSION, NEWS_ARCHIVE_USE_CASES } from '../../shared/news-archive-rights.mjs';
import { plannedNewsFiles, writeNewsLifecycle } from './news-lifecycle-materialize.mjs';

const original = JSON.parse(readFileSync(new URL('../../src/features/home/homeEditorialEdition.json', import.meta.url), 'utf8'));
const empty = {version: 1, overview: [], archive: []};
const nextWith = (previous, n) => ({
  ...previous, date: '2026-11-15',
  stories: [ { ...previous.stories[0], id: 'new-' + n,
    source: {...previous.stories[0].source, url: 'https://polygon.technology/blog/synthetic-' + n} },
    ...previous.stories.slice(0, 2)],
});
test('displaced stories go to overview (max 3), then dated category folders in archive', () => {
  let before = original;
  let index = empty;
  for (let n = 1; n <= 5; n++) {
    const after = nextWith(before, n);
    index = retireNews(before, after, index, '2026-11-15');
    assert.ok(index.overview.length <= 3);
    before = after;
  }
  assert.equal(index.overview.length, 3);
  assert.equal(index.archive.length, 2);
  assert.equal(new Set([...index.overview, ...index.archive].map(x => x.id)).size, 5);
  assert.match(index.archive[0].archivePath, /^news-archive\/[a-z]+\/2026\/11\/\d{2}\/[a-z0-9-]+\.json$/);
  assert.equal(index.archive[0].rights.status, 'REVIEW_REQUIRED');
  assert.equal(index.archive[0].marketImpact.status, 'NOT_PROVEN');
});
test('no replacement keeps previous history and prevents replay, duplicates or mutation', () => {
  assert.equal(retireNews(original, original, empty), empty);
  const after = nextWith(original, 1);
  const state = retireNews(original, after, empty);
  assert.throws(() => retireNews(original, after, state), /replay/);
  assert.throws(() => retireNews(original, {...after, stories: [after.stories[0], after.stories[0], after.stories[2]]}, empty), /Duplicate/);
  assert.throws(() => retireNews(original, {...original, stories: original.stories.map((s, i) => i ? s : {...s, title: 'Tampered'})}, empty), /snapshot changed/);
  assert.throws(() => newsArchivePath({...original.stories[0], id:'../escape'}), /Invalid news ID/);
});
test('existing content selection is reused without duplicating lifecycle, no fabricated replacement', () => {
  const output = advanceNewsEdition(original, empty, selectHomeEdition(original, [], '2026-11-15'));
  assert.equal(output.edition, original);
  assert.equal(output.index, empty);
});
test('retrospective impact remains pending despite numerical calculation; provenance and dates required', () => {
  const story = retireNews(original, nextWith(original, 1), empty).overview[0];
  const input = {asset:'POL', benchmark:'MARKET', provider:'Licensed Provider', licenseEvidenceRef:'license:123',
    dataEvidenceRef:'data:456', reviewer:'Reviewer', assessedAt:'2026-12-15', observedAt:'2026-11-28',
    assetBefore:100, assetAfter:112, benchmarkBefore:100, benchmarkAfter:106,
    persistence:3, breadth:2, windowDays:30};
  const result = proposeMarketImpact(story, input);
  assert.equal(result.status, 'REVIEW_REQUIRED');
  assert.equal(result.verifiedScore, null);
  assert.ok(result.proposedScore > 0);
  assert.ok(Math.abs(result.relativeChangePp - 6) < 0.001);
  assert.throws(() => proposeMarketImpact(story, {...input, licenseEvidenceRef:''}), /provenance/);
  assert.throws(() => proposeMarketImpact(story, {...input, assetBefore:0}), /market data/);
  assert.throws(() => proposeMarketImpact(story, {...input, observedAt:'2026-01-01'}), /window/);
});
test('public projection and CSV fail closed, avoid formula injection', () => {
  const story = retireNews(original, nextWith(original, 1), empty).overview[0];
  assert.equal(publishedNews([story]).length, 0);
  const presented = {...story, rights:{status:'APPROVED',evidenceRef:'review:123'}};
  assert.equal(publishedNews([presented]).length, 0); // Candidate metadata cannot grant public display.
  const records = Object.entries(NEWS_ARCHIVE_USE_CASES).map(([kind, allowedUse]) => ({
    version:NEWS_ARCHIVE_REVIEW_VERSION, decision:'APPROVED', kind, allowedUse,
    storyId:story.id, evidenceRef:'review:123', reviewer:'synthetic-test-owner',
    reviewedAt:'2026-11-15', contentSnapshot:archiveContentSnapshot(presented),
  }));
  assert.equal(publishedNews([presented], records).length, 1);
  assert.equal(publishedNews([presented], records.slice(0, 2)).length, 0, 'no approval without independent graphic receipt');
  assert.equal(publishedNews([{...presented, summary:'Tampered'}], records).length, 0);
  assert.equal(publishedNews([{...presented, graphic:{kind:'flow',caption:'Tampered',labels:['X','Y']}}], records).length, 0);
  assert.equal(publishedNews([presented], records.map(record => ({...record, evidenceRef:'fake'}))).length, 0);
  assert.equal(publishedNews([{...presented,source:{...presented.source,url:'javascript:alert(1)'}}], records).length, 0);
  const csv = newsBiCsv([{...story, id:'=HYPERLINK("evil")'}]);
  assert.match(csv, /'=/);
  assert.match(csv, /NOT_PROVEN/);
  assert.doesNotMatch(csv, /,100,/);
});

test('market impact cannot self-certify a verified publication score', () => {
  const story = retireNews(original, nextWith(original, 1), empty).overview[0];
  const fake = {...story,marketImpact:{status:'VERIFIED',verifiedScore:95,assessments:[]}};
  assert.equal(marketImpactAdmitted(fake), false);
  assert.equal(marketImpactAdmitted(fake, [{version:'CAPITAL_AI_NEWS_MARKET_IMPACT_REVIEW@1',
    decision:'APPROVED',storyId:story.id,reviewer:'synthetic-test-owner',evidenceRef:'review:123',
    assessmentSnapshot:JSON.stringify(fake.marketImpact)}]), true);
  assert.equal(marketImpactAdmitted({...fake,marketImpact:{...fake.marketImpact,verifiedScore:96}},
    [{version:'CAPITAL_AI_NEWS_MARKET_IMPACT_REVIEW@1',decision:'APPROVED',
      storyId:story.id,reviewer:'synthetic-test-owner',evidenceRef:'review:123',assessmentSnapshot:JSON.stringify(fake.marketImpact)}]),false);
});
test('materializer rejects unapproved news and writes only an empty reviewed manifest offline', async () => {
  const displaced = retireNews(original, nextWith(original, 1), empty);
  assert.throws(() => plannedNewsFiles({edition:nextWith(original, 1),index:displaced}), /RIGHTS_NOT_ADMITTED/);
  const planned = plannedNewsFiles({edition:original,index:empty});
  assert.equal(planned.length,2);
  const tmp = mkdtempSync(join(tmpdir(), 'news-lifecycle-'));
  try {
    const files = await writeNewsLifecycle({edition:original,index:empty},tmp);
    assert.equal(files.length,2);
    const stored = JSON.parse(await readFile(join(tmp,'src/features/analysis/newsLifecycleIndex.json'),'utf8'));
    assert.deepEqual(stored,empty);
  } finally { rmSync(tmp,{recursive:true,force:true}); }
});
test('impact observation is fixed to the requested publication-plus-horizon date', () => {
  const story = retireNews(original, nextWith(original, 1), empty).overview[0];
  const input = {asset:'POL',benchmark:'MARKET',provider:'licensed',licenseEvidenceRef:'l',dataEvidenceRef:'d',
    reviewer:'r',assessedAt:'2026-12-15',observedAt:'2026-11-28',assetBefore:1,assetAfter:1.1,
    benchmarkBefore:1,benchmarkAfter:1.02,persistence:2,breadth:1,windowDays:30};
  assert.ok(proposeMarketImpact(story,input).proposedScore >= 0);
  assert.throws(() => proposeMarketImpact(story,{...input,observedAt:'2026-11-27'}), /window/);
  assert.throws(() => proposeMarketImpact(story,{...input,observedAt:'2026-11-29'}), /window/);
});

test('retrospective observations are append-only and BI impact facts are independently admitted', () => {
  const story = retireNews(original,nextWith(original,1),empty).overview[0];
  const input={asset:'POL',benchmark:'MARKET',provider:'licensed',licenseEvidenceRef:'rights',
    dataEvidenceRef:'evidence',reviewer:'owner',assessedAt:'2026-12-15',observedAt:'2026-11-28',
    assetBefore:100,assetAfter:110,benchmarkBefore:100,benchmarkAfter:105,
    persistence:2,breadth:3,windowDays:30};
  const first=appendMarketImpactAssessment(story,input);
  assert.equal(story.marketImpact.assessments.length,0);
  assert.equal(first.marketImpact.assessments.length,1);
  assert.equal(first.marketImpact.status,'NOT_PROVEN');
  assert.equal(first.marketImpact.assessments[0].status,'REVIEW_REQUIRED');
  assert.throws(()=>appendMarketImpactAssessment(first,input),/Duplicate/);
  assert.deepEqual(newsBiImpactRows([first]),[],'no BI leak of unapproved impact facts');
  const admitted={...first,marketImpact:{...first.marketImpact,status:'VERIFIED',verifiedScore:40}};
  assert.deepEqual(newsBiImpactRows([admitted]),[],'record flag alone never grants market data redistribution');
});
