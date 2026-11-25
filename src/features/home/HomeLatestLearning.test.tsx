import { learningArticleScene, structuredNewsScene } from './articleSceneModel';
import { getLicensedLearningGraphic, HOME_LEARNING_GRAPHICS } from './homeLearningGraphics';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HomeLatestLearning } from './HomeLatestLearning';
import { HomeSearchFocus } from './HomeSearchFocus';
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEARNING_ARTICLES, latestLearningArticles } from '../../data/learningArticles';

test('all home-feed entries require assigned public hub and published state', () => {
  assert.ok(LEARNING_ARTICLES.length > 0);
  for (const article of LEARNING_ARTICLES) {
    assert.ok(['learning', 'marketscreener', 'studio'].includes(article.hub));
    assert.equal(article.status, 'PUBLISHED');
    assert.match(article.publishedAt, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test('new editorial entries rise to the top and homepage never displays more than three', () => {
  const example = [
    {...LEARNING_ARTICLES[0],id:'old',publishedAt:'2026-09-01'},
    {...LEARNING_ARTICLES[1],id:'new',publishedAt:'2026-10-11'},
    {...LEARNING_ARTICLES[2],id:'mid',publishedAt:'2026-10-09'},
    {...LEARNING_ARTICLES[3],id:'ignored',publishedAt:'2026-10-01'},
  ];
  assert.deepEqual(latestLearningArticles(example).map(x=>x.id),['new','mid','ignored']);
  assert.deepEqual(latestLearningArticles(example,1).map(x=>x.id),['new']);
});

test('home entry cards expose exactly three public intent links with unique names', () => {
  const html = renderToStaticMarkup(<HomeSearchFocus />);
  for (const [path, label] of [['/learning', 'Zum Learning Hub'], ['/marketscreener', 'Analyse entdecken'], ['/marketscreener/scorer', 'Methodik ansehen']]) {
    assert.ok(html.includes('href="' + path + '"'));
    assert.ok(html.includes(label));
  }
  assert.equal((html.match(/<article /g) || []).length, 3);
  assert.doesNotMatch(html, /REVIEW_REQUIRED|DRAFT|Architecture A|Restricted/);
});
test('learning teaser renders at most three articles with dates and descriptive links', () => {
  const html = renderToStaticMarkup(<HomeLatestLearning onNavigate={() => {}} />);
  assert.ok((html.match(/<article /g) || []).length <= 3);
  assert.equal((html.match(/<time /g) || []).length, (html.match(/<article /g) || []).length);
  assert.match(html, /Lesen:/);
  assert.doesNotMatch(html, /Mehr erfahren|DRAFT|REVIEW_REQUIRED/);
});

 test('learning cards use decorative Universe accents with text categories', () => {
  const html = renderToStaticMarkup(<HomeLatestLearning onNavigate={() => {}} />);
  for (const color of ['#60A5FA', '#4ADE80', '#F9A8D4']) assert.ok(html.includes(color), color);
  assert.match(html, /Finanzwissen/);
});

 test('unlicensed learning graphics never enter the public article cards', () => {
  for (const article of LEARNING_ARTICLES) assert.equal(getLicensedLearningGraphic(article, HOME_LEARNING_GRAPHICS, []), undefined);
  assert.equal(getLicensedLearningGraphic(LEARNING_ARTICLES[0], [], []), undefined);
});

test('three interactive article models use clearly identified synthetic data and bounded inputs',()=>{
  const low=learningArticleScene('portfolio-risiko-korrelation',-1)!;
  const high=learningArticleScene('portfolio-risiko-korrelation',1)!;
  assert.equal(low.nodes[2].height,0);
  assert.equal(high.nodes[2].height,2);
  assert.equal(learningArticleScene('portfolio-risiko-korrelation',Infinity)!.nodes[2].height,Math.SQRT2);
  assert.match(learningArticleScene('liquiditaet-spread',2)!.nodes[0].detail,/99,00/);
  assert.match(learningArticleScene('liquiditaet-spread',2)!.nodes[2].detail,/101,00/);
  assert.match(learningArticleScene('quellenzeit',99)!.description,/14 Tage/);
  assert.equal(learningArticleScene('unreviewed-topic'),undefined);
  const html=renderToStaticMarkup(<HomeLatestLearning onNavigate={()=>{}}/>);
  assert.equal((html.match(/data-article-scene=/g)||[]).length,3);
  assert.match(html,/Synthetisches Beispiel/);
  assert.match(html,/3D-Modell erkunden/);
  assert.doesNotMatch(html,/<canvas/);
});
test('news scenes preserve admitted labels and never create numeric data',()=>{
  const scene=structuredNewsScene({kind:'status',rows:[{label:'Testnet',outcome:'Reset geplant'},{label:'Mainnet',outcome:'Läuft weiter'}]});
  assert.deepEqual(scene.nodes.map(({label,detail})=>({label,detail})),[{label:'Testnet',detail:'Reset geplant'},{label:'Mainnet',detail:'Läuft weiter'}]);
  assert.match(scene.description,/Kein Live-Marktdatenfeed/);
});
