import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {VOCABULARY_TERMS} from '../../data/vocabularyData';
import {LEARNING_ARTICLES} from '../../data/learningArticles';
import {freeVocabularySelection,berlinDay,dailyLearningQuestions} from './learningPolicy';
import {VocabularyFlashcards} from '../../components/VocabularyFlashcards';
import {VocabularyCard,VOCABULARY_CATEGORY_COLORS} from './VocabularyCard';
import {chartQuestion} from './ChartRecognitionQuiz';
import {ChartLessonGraphic} from './ChartLessonGraphic';
import {visibleLearningVideos, type LearningVideo} from './LearningVideos';
test('free video previews remain fixed per category before category filtering',()=>{
 const videos: LearningVideo[] = ['Architektur','Fintech Deepdive','Social'].flatMap(category => [1,2].map(n => ({id:`${category}-${n}`,category:category as LearningVideo['category'],title:`Video ${n}`,youtubeId:'abcdefghijk'})));
 assert.deepEqual(visibleLearningVideos(videos,false).map(video=>video.id),['Architektur-1','Fintech Deepdive-1','Social-1']);
 assert.equal(visibleLearningVideos(videos,true).length,6);
 assert.equal(visibleLearningVideos([{...videos[0],youtubeId:'invalid'}],true).length,0);
});
test('free glossary selection is fixed at seven per skill level before filtering',()=>{
 const selected=freeVocabularySelection(VOCABULARY_TERMS);for(const level of ['Einsteiger','Fortgeschritten','Quant / Pro']) assert.ok(selected.filter(term=>term.level===level).length<=7);
 assert.deepEqual(freeVocabularySelection(VOCABULARY_TERMS).map(t=>t.id),selected.map(t=>t.id));
});
test('free flashcards contain five words; paid cards retain all supplied words',()=>{
 const free=renderToStaticMarkup(<VocabularyFlashcards onNavigate={()=>{}} terms={VOCABULARY_TERMS}/>);
 assert.equal((free.match(/data-vocabulary-category=/g)??[]).length,1);assert.match(free,/Karte 1 von 5/);assert.match(free,/Noch üben und bald wiederholen/);
 const paid=renderToStaticMarkup(<VocabularyFlashcards onNavigate={()=>{}} terms={VOCABULARY_TERMS} entitled/>);
 assert.equal((paid.match(/data-vocabulary-category=/g)??[]).length,1);assert.match(paid,new RegExp('Karte 1 von '+VOCABULARY_TERMS.length));
});
test('mobile vocabulary is discoverable in the category-diverse free learning sample',()=>{
 assert.ok(VOCABULARY_TERMS.some(term=>term.category==='MOBILE_RUNTIME'));
 assert.ok(freeVocabularySelection(VOCABULARY_TERMS).some(term=>term.category==='MOBILE_RUNTIME'));
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
