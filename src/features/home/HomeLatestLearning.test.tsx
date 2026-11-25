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
