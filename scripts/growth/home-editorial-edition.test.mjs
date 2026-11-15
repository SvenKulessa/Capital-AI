import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {editorialScore,selectHomeEdition} from './home-editorial-edition.mjs';

const published = JSON.parse(await readFile(new URL('../../src/features/home/homeEditorialEdition.json',import.meta.url)));
const asOf = '2026-11-15';
const label = value => new Intl.DateTimeFormat('de-DE',{dateStyle:'long',timeZone:'UTC'}).format(new Date(value));
const edition = {...published,stories:published.stories.map((story,i)=>({
  ...story,
  source:{...story.source,date:i===2?'2026-10-29':'2026-11-12',
    label:label(i===2?'2026-10-29':'2026-11-12')},
  editorial:{relevance:i===2?4:5,impact:i===2?3:4},
}))};
const allow = {decision:'APPROVED',websiteAllowed:true,
  evidenceRef:'TEST_ONLY_SYNTHETIC_RIGHTS_FIXTURE',reviewedAt:'2026-11-14'};
const example = published.stories[0];
const candidate = {
  ...example,
  id:'synthetic-network-update',
  title:'Synthetische Netzwerkänderung',
  source:{name:'Solana',url:'https://solana.com/news/synthetic-network-update',
    date:'2026-11-14',label:label('2026-11-14')},
  editorial:{relevance:5,impact:5},
  evidence:{...example.evidence,
    graphic:{...example.evidence.graphic,assetId:'home-synthetic-network-update-vector-v1'},
    rights:{story:{...allow},source:{...allow},graphic:{...allow}},
  },
};
test('replaces only with better eligible rights-provenance candidate, preserving news and graphic',()=>{
  const next = selectHomeEdition(edition,[candidate,candidate],asOf);
  assert.equal(next.stories.length,3);
  assert.equal(next.stories[2].id,candidate.id);
  assert.deepEqual(next.stories[2].graphic,candidate.graphic);
  assert.deepEqual(next.stories[2].evidence,candidate.evidence);
  assert.equal(next.stories[2].source.label,'14. November 2026');
  assert.equal(editorialScore(candidate,asOf),98);
  assert.deepEqual(next.contentEngine.campaign.sourceUrls,next.stories.map(s=>s.source.url));
  const serialized = JSON.stringify(next.stories.map(s=>[s.source.url,s.source.date]).sort((a,b)=>a[0].localeCompare(b[0])));
  assert.equal(next.contentEngine.campaign.sourceSha,createHash('sha256').update(serialized).digest('hex'));
  assert.equal(next.contentEngine.publicPublishAllowed,false);
});
test('retains the same edition if candidates are not better, fresh and rights-admitted',()=>{
  assert.equal(selectHomeEdition(edition,[],asOf),edition);
  assert.equal(selectHomeEdition(edition,[example],asOf),edition);
  assert.equal(selectHomeEdition(edition,[{...candidate,title:example.title}],asOf),edition);
  assert.equal(selectHomeEdition(edition,[{...candidate,editorial:{relevance:1,impact:0}}],asOf),edition);
  const stale={...candidate,source:{...candidate.source,date:'2026-10-28',label:label('2026-10-28')}};
  assert.equal(selectHomeEdition(edition,[stale],asOf),edition);
  assert.equal(selectHomeEdition(edition,[{...candidate,editorial:{relevance:3,impact:2}}],asOf),edition);
  const pending={...candidate,evidence:{...candidate.evidence,
    rights:{...candidate.evidence.rights,story:{decision:'REVIEW_REQUIRED',
      websiteAllowed:false,evidenceRef:null,reviewedAt:null}}}};
  assert.equal(selectHomeEdition(edition,[pending],asOf),edition);
});
test('rejects missing media, hostile sources, futures, fabricated market data and invalid rights',()=>{
  assert.throws(()=>selectHomeEdition(edition,[{...candidate,graphic:null}],asOf),/HOME_GRAPHIC/);
  assert.throws(()=>selectHomeEdition(edition,[{...candidate,source:{...candidate.source,
    url:'https://solana.com.evil.test/news'}}],asOf),/HOME_SOURCE_ALLOWLIST/);
  assert.throws(()=>selectHomeEdition(edition,[{...candidate,source:{...candidate.source,
    date:'2026-11-16',label:label('2026-11-16')}}],asOf),/HOME_SOURCE_FUTURE/);
  assert.throws(()=>selectHomeEdition(edition,[{...candidate,evidence:{...candidate.evidence,
    priceData:{symbol:'XRP',price:9.99}}}],asOf),/HOME_EVIDENCE/);
  assert.throws(()=>selectHomeEdition(edition,[{...candidate,evidence:{...candidate.evidence,
    rights:{...candidate.evidence.rights,source:{...allow,evidenceRef:null}}}}],asOf),
    /HOME_RIGHTS_EVIDENCE_REQUIRED/);
  assert.throws(()=>selectHomeEdition(edition,[{...candidate,evidence:{...candidate.evidence,
    graphic:{...candidate.evidence.graphic,assetId:'home-other-vector-v1'}}}],asOf),
    /HOME_EVIDENCE/);
});
