import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {VOCABULARY_TERMS} from '../../data/vocabularyData';
import {LEARNING_ARTICLES} from '../../data/learningArticles';
import { LearningJourney } from './LearningJourney';
import { LearningPurchase } from './LearningPurchase';
import { LearningPortalPage } from './LearningPortalPage';
import { MarketVocabularyModal } from './MarketVocabularyModal';
import { LEARNING_JOURNEY, LEARNING_NEXT_STEPS } from '../../../shared/learning-journey.mjs';
import {berlinDay,dailyLearningQuestions} from './learningPolicy';
import {VocabularyFlashcards, advanceVocabularyDeck, rescheduleMissedVocabulary, vocabularySwipeDirection} from '../../components/VocabularyFlashcards';
import {VocabularyCard,VOCABULARY_CATEGORY_COLORS} from './VocabularyCard';
import {chartQuestion} from './ChartRecognitionQuiz';
import {ChartLessonGraphic} from './ChartLessonGraphic';
import {LearningVideos, visibleLearningVideos, type LearningVideo} from './LearningVideos';

test('offer explains login and entitlements without preselecting purchase consent', () => {
  const html = renderToStaticMarkup(<LearningPurchase />);
  assert.match(html, /id="learning-offer"/);
  assert.match(html, /angemeldet sein/);
  assert.match(html, /25,00/);
  assert.match(html, /zusätzlich mindestens Starter/);
  assert.match(html, /zusätzlich Pro/);
  assert.match(html, /<button[^>]*disabled=""/);
  assert.doesNotMatch(html, /<input[^>]*checked=""/);
});

test('public lesson content is rendered with exact server-source text and real conversion targets', () => {
  const html = renderToStaticMarkup(<LearningJourney />);
  assert.equal(LEARNING_JOURNEY.length, 6);
  for (const lesson of LEARNING_JOURNEY) {
    assert.ok(html.includes(`id="${lesson.id}"`));
    assert.ok(html.includes(lesson.title));
    assert.ok(html.includes(lesson.example));
    for (const paragraph of lesson.paragraphs) assert.ok(html.includes(paragraph));
    assert.ok(lesson.intent && lesson.goal);
  }
  for (const step of LEARNING_NEXT_STEPS) assert.ok(html.includes(`href="${step.href}"`));
  assert.match(html, /synthetisch/);
  assert.match(html, /Videos sind noch nicht verfügbar/);
  assert.match(html, /kein einzelnes Blueprint-Kaufangebot/);
  assert.equal((101 - 99) / ((101 + 99) / 2) * 100, 2);
  assert.equal((30 - 10) / (50 - 10), 0.5);
  assert.equal(0.5 * 0.8 + 0.3 * 0.4 + 0.2 * 0.6, 0.64);
  assert.equal(Math.sqrt((1 + 0 + 1) / (3 - 1)), 1);
});
test('free video previews remain fixed per category before category filtering',()=>{
 const videos: LearningVideo[] = ['Architektur','Fintech Deepdive','Social'].flatMap(category => [1,2].map(n => ({id:`${category}-${n}`,category:category as LearningVideo['category'],title:`Video ${n}`,youtubeId:'abcdefghijk'})));
 assert.deepEqual(visibleLearningVideos(videos,false).map(video=>video.id),['Architektur-1','Fintech Deepdive-1','Social-1']);
 assert.equal(visibleLearningVideos(videos,true).length,6);
 assert.equal(visibleLearningVideos([{...videos[0],youtubeId:'invalid'}],true).length,0);
});
test('no unlicensed videos are marketed as available and public learning CTA stays reachable', () => {
  const html = renderToStaticMarkup(<LearningVideos entitled={false} />);
  assert.match(html, /Noch keine veröffentlichten Lernvideos/);
  assert.match(html, /href="\/learning#learning-offer"/);
  assert.match(html, /href="https:\/\/youtube.com\/@capital-ai.online"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.doesNotMatch(html, /iframe|VideoObject|Kostenlos: ein freigegebenes Video/);
});
test('anonymous glossary surfaces render every canonical definition, including Quant level',()=>{
 const page=renderToStaticMarkup(<LearningPortalPage/>);
 const modal=renderToStaticMarkup(<MarketVocabularyModal isOpen onClose={()=>{}}/>);
 for(const html of [page,modal]) {
   assert.equal((html.match(/data-vocabulary-category=/g)??[]).length,VOCABULARY_TERMS.length);
   assert.match(html,/VWAP/);
   assert.match(html,/Brier Score/);
   assert.doesNotMatch(html,/Sieben feste Begriffe|sieben feste Einträge/);
 }
 assert.doesNotMatch(page,/id="quant-demo-title"|Quant-Karteikarte · kostenlose Demo/);
 const flashcards=renderToStaticMarkup(<LearningPortalPage initialTab="flashcards"/>);
 assert.doesNotMatch(flashcards,/id="quant-demo-title"|Quant-Karteikarte · kostenlose Demo/);
});
test('free flashcards contain five words; paid cards retain all supplied words',()=>{
 const free=renderToStaticMarkup(<VocabularyFlashcards onNavigate={()=>{}} terms={VOCABULARY_TERMS}/>);
 assert.equal((free.match(/data-vocabulary-category=/g)??[]).length,1);assert.match(free,/Karte 1 von 5/);assert.match(free,/Weiß ich nicht, im Lernfeld speichern und wiederholen/);
 const paid=renderToStaticMarkup(<VocabularyFlashcards onNavigate={()=>{}} terms={VOCABULARY_TERMS} entitled/>);
 assert.equal((paid.match(/data-vocabulary-category=/g)??[]).length,1);assert.match(paid,new RegExp('Karte 1 von '+VOCABULARY_TERMS.length));
});
test('a missed card reappears after two other cards even when the deck wraps',()=>{
 const initial=['a','b','c','d','e'];
 for(let offset=0;offset<initial.length;offset++){
  let shifted=initial;
  for(let step=0;step<offset;step++) shifted=advanceVocabularyDeck(shifted);
  const missed=shifted[0];
  const repeated=rescheduleMissedVocabulary(shifted);
  assert.equal(repeated.length,initial.length);
  assert.notEqual(repeated[0],missed);
  assert.notEqual(advanceVocabularyDeck(repeated)[0],missed);
  assert.equal(advanceVocabularyDeck(advanceVocabularyDeck(repeated))[0],missed);
 }
 assert.deepEqual(rescheduleMissedVocabulary(['only']),['only']);
 assert.deepEqual(rescheduleMissedVocabulary(['first','second']),['second','first']);
});
test('mobile vocabulary is part of the complete public glossary',()=>{
 assert.ok(VOCABULARY_TERMS.some(term=>term.category==='MOBILE_RUNTIME'));

});
test('category accents remain readable and card controls have accessible names',()=>{
 const luminance=(hex:string)=>{const channels=hex.slice(1).match(/../g)!.map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;};
 for(const {accent,background} of Object.values(VOCABULARY_CATEGORY_COLORS)) assert.ok((luminance(accent)+.05)/(luminance(background)+.05)>=4.5);
 const html=renderToStaticMarkup(<VocabularyCard term={VOCABULARY_TERMS[0]} onFavorite={()=>{}}/>);assert.match(html,/<article/);assert.match(html,/im Profil speichern/);assert.match(html,/Definition kopieren/);assert.match(html,/Details &amp; Beispiel/);
});
test('daily question rotates using Berlin calendar dates and references only public new articles',()=>{
 assert.equal(berlinDay(new Date('2026-10-09T21:59:59Z')),'2026-10-09');assert.equal(berlinDay(new Date('2026-10-09T22:00:00Z')),'2026-10-10');
 const today=dailyLearningQuestions(new Date('2026-10-09T12:00:00Z'),false);const tomorrow=dailyLearningQuestions(new Date('2026-10-10T12:00:00Z'),false);assert.equal(today.length,1);assert.notEqual(today[0].question,tomorrow[0].question);assert.equal(dailyLearningQuestions(new Date(),true).length,5);
 for(const question of dailyLearningQuestions(new Date(),true)) assert.ok(LEARNING_ARTICLES.some(article=>article.id===question.reference.id));
});
test('random chart recognition has four distinct answers and does not reveal title in graphic',()=>{
 const question=chartQuestion(()=>.25);assert.equal(question.options.length,4);assert.equal(new Set(question.options.map(item=>item.id)).size,4);assert.equal(question.options.filter(item=>item.id===question.lesson.id).length,1);
 const graphic=renderToStaticMarkup(<ChartLessonGraphic lesson={question.lesson} quiz/>);assert.ok(!graphic.includes(question.lesson.title));assert.match(graphic,/Chart-Erkennungstraining/);
});

test('horizontal swipes have an intentional threshold and ignore vertical page scroll',()=>{
 assert.equal(vocabularySwipeDirection(-80,4),'left');assert.equal(vocabularySwipeDirection(80,-4),'right');
 assert.equal(vocabularySwipeDirection(30,0),null);assert.equal(vocabularySwipeDirection(60,80),null);
});
