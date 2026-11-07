import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VOCABULARY_TERMS, vocabularySkillLevel } from '../vocabularyData';
import researched from '../../../shared/researched-vocabulary.json';
import { vocabularyMetadata } from '../../../shared/vocabulary-metadata.mjs';
import { matchesVocabularySearch,lookupVocabulary } from '../../../shared/vocabulary-lookup.mjs';
import { answerLocally } from '../../../Chat Buddy/src/brain';
import { retrieve } from '../../../Chat Buddy/src/core/graph';
import { planContentCampaign } from '../../contracts/contentEngine';
import { buildDraftContentSocialPackage } from '../../contracts/contentSocialPackage';

test('known definitions beat unrelated financial intent guesses and have a reversible source trace',()=>{
  for(const [question,id] of [['Erkläre Governance as Code','learning-governance-as-code'],['Was ist land graph?','learning-langgraph-architecture'],['Was bedeutet OCC v2?','learning-occ-v2']]) {
    const result=answerLocally(question,'de',false);
    const canonical=VOCABULARY_TERMS.find(t=>t.id===id)!;
    assert.ok(result.answer.includes(canonical.shortDefinition),question);
    assert.ok(result.hits.some(hit=>hit.id===id));
    assert.ok(result.trace.steps.some(step=>step.detail.includes('/vocabulary/'+id)));
    assert.doesNotMatch(result.answer,/DCF|WACC/);
    assert.equal(result.intent,'explain');
  }
});
test('unknown terms cannot manufacture DCF/WACC evidence from the explain intent',()=>{
  assert.deepEqual(retrieve('ZZZunbekannt',2,'de','explain'),[]);
  const answer=answerLocally('Erkläre ZZZunbekannt','de',false);
  assert.equal(answer.hits.length,0);
  assert.match(answer.answer,/keine passende Definition/);
  assert.ok(retrieve('EZB Leitzins',2,'de','explain').length>0);
});
test('Hub and modal use normalized tags and the same lookup without substring evidence for answers',()=>{
  const langgraph=VOCABULARY_TERMS.find(t=>t.id==='learning-langgraph-architecture')!;
  assert.equal(matchesVocabularySearch(langgraph,'  land graph  '),true);
  assert.equal(lookupVocabulary('land graph')[0].id,langgraph.id);
  assert.equal(lookupVocabulary('inferenzfehler').some(t=>t.id==='inference'),false);
  assert.equal(lookupVocabulary('es gibt eine frage').some(t=>t.id==='expected-shortfall'),false);
  assert.equal(lookupVocabulary('Was ist TS?')[0].id,'typescript');
  assert.equal(lookupVocabulary('Was ist Telemetrie?')[0].id,'finance-voc-docmin-0006');
  assert.deepEqual(lookupVocabulary('supression').map(t=>t.id),['suppression-marketing','suppression-security']);
  assert.equal(lookupVocabulary('midi')[0].id,'mifid-ii');
  for(const file of ['src/features/learning/LearningPortalPage.tsx','src/features/learning/MarketVocabularyModal.tsx']) {
    assert.match(readFileSync(file,'utf8'),/matchesVocabularySearch\(term,\s*(?:searchQuery|query)\)/);
  }
});
test('61 additions have complete lessons, unique identities and accessible skill categories across consumers',()=>{
  const additions=researched.filter(t=>t.reviewedAt==='2026-11-06');assert.equal(additions.length,61);
  assert.equal(VOCABULARY_TERMS.length,386);assert.equal(vocabularyMetadata.length,386);
  for(const term of additions) {
    assert.equal(VOCABULARY_TERMS.filter(t=>t.id===term.id).length,1);
    const ui=VOCABULARY_TERMS.find(t=>t.id===term.id)!;
    assert.ok(['Starter','Elite','Enterprise','Quant'].includes(vocabularySkillLevel(ui)));
    assert.ok(lookupVocabulary(term.term).some(t=>t.id===term.id),term.id);
    assert.ok(answerLocally('Erkläre '+term.term,'de',false).answer.includes(term.shortDefinition),term.id);
    assert.ok(term.sources.length&&term.practicalExample&&term.formulaOrRule&&term.keyTakeaway);
    assert.equal(new Set(term.thesaurus).size,3);
  }
  assert.ok(!VOCABULARY_TERMS.some(t=>['langgraph','backpressure','telemetry'].includes(t.id)));
});
test('Content and Social attach identical dictionary definitions without granting publication rights',()=>{
  const campaign={campaignId:'glossary',productId:'learning',sourceSha:'a'.repeat(40),canonicalUrl:'https://capital-ai.online/learning',locale:'de-DE' as const,
    objective:'MiFID II und Firecrawl erklären',audience:['FinTech Teams'],channels:['WEBSITE'] as ['WEBSITE'],outputs:['TEXT'] as ['TEXT'],sourceUrls:[]};
  const plan=planContentCampaign(campaign),social=buildDraftContentSocialPackage({campaign,contentId:'draft',assets:[{assetId:'text',contentId:'draft',sourceSha:campaign.sourceSha,kind:'TEXT',sha256:'b'.repeat(64),mimeType:'text/plain',evidenceRef:'owned:test'}]});
  assert.deepEqual(plan.vocabularyContext,social.vocabularyContext);
  assert.equal(plan.vocabularyContext!.catalogCount,386);
  assert.ok(plan.vocabularyContext!.terms.some(t=>t.id==='mifid-ii'));
  assert.equal(plan.publication.publicPublishAllowed,false);
  assert.deepEqual(social.approvals,[]);assert.deepEqual(social.deliveries,[]);
});
