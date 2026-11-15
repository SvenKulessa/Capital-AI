import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { assessCadsContentCampaign, assessCadsMediaProject } from '../../packages/benchmark-core/growth-quality.mjs';
import { planContentCampaign, presentBlogArticle, CONTENT_ENGINE_UNIVERSE } from '../../src/contracts/contentEngine.ts';
import { CAPITAL_AI_SCORE_BUILDER_CAMPAIGN_20261007 } from '../../src/data/contentCampaigns.ts';
import {
  createCapitalAiMediaStudioProject,
  createCapitalAiLandingBlueprintVideoProject,
  createCapitalAiMasterclassChapterIntroProject,
  createCapitalAiTourVideoProject,
} from '../../src/platform/SocialMediaEngine/Editing/MediaStudioTemplates.ts';

const families = ['cyan', 'violet', 'gold', 'pink', 'rose', 'blue', 'green'];
const tokens = JSON.parse(readFileSync('public/branding/asset-pack/meta/social-render-tokens.json', 'utf8'));

test('image, article and source-bound campaign plans share one seven-colour identity', () => {
  const plan = planContentCampaign(CAPITAL_AI_SCORE_BUILDER_CAMPAIGN_20261007.brief);
  assert.equal(plan.cadsQuality.technicalStatus, 'PASS');
  assert.equal(assessCadsContentCampaign(plan.campaign).technicalStatus, 'PASS');
  assert.deepEqual([...CONTENT_ENGINE_UNIVERSE.palette], families);
  assert.deepEqual([...plan.visualIdentity.palette], families);
  assert.equal(plan.publication.publicPublishAllowed, false);
  const article = presentBlogArticle({
    title: 'FinTech verstehen', intro: 'Quelle und Methode erklären',
    sections: [{ title: 'Provenienz', body: 'Fakten aus nachvollziehbarer Quelle' }],
  });
  assert.equal(article.presentation.universeIdentity, 'CAPITAL_AI_UNIVERSE@1');
  assert.deepEqual([...article.presentation.sevenColorFamilies], families);
  assert.equal(article.presentation.illustrationRequired, true);
  assert.equal(tokens.publishReady, false);
});

test('video, podcast cover and tour templates remain draft-only and CADS review-required', () => {
  const projects = [
    createCapitalAiMediaStudioProject({ aspectRatio: '16:9' }),
    createCapitalAiLandingBlueprintVideoProject(),
    createCapitalAiMasterclassChapterIntroProject(1),
    createCapitalAiTourVideoProject(),
  ];
  for (const project of projects) {
    assert.equal(project.renderRecipe.publishReady, false);
    assert.equal(project.metadata.universeIdentity, 'CAPITAL_AI_UNIVERSE@1');
    assert.equal(project.metadata.visualRule, 'ALL_SEVEN_COLORS_PER_VISUAL');
    const cads = assessCadsMediaProject(project);
    assert.equal(cads.technicalStatus, 'PASS');
    assert.equal(cads.productionApproval, false);
    assert.equal(cads.actualAssetBytes, 'NOT_PROVEN');
  }
  const landing = projects[1];
  const scenes = landing.tracks.flatMap(track => track.layers).filter(layer => layer.kind === 'scene');
  assert.ok(scenes.some(scene => scene.kicker.includes('SEVEN-COLOR UNIVERSE')));
  assert.ok(scenes.some(scene => families.every(family => scene.body.toLowerCase().includes(family === 'rose' ? 'rosé' : family))));
  assert.equal(projects[2].metadata.podcastCoverRenderer, 'scripts/media/capital_ai_media.py:render_brand_card');
  assert.notEqual(projects[2].metadata.audioStatus, 'GENERATED_AND_APPROVED');
});

test('badge SVG assets show the spectrum but never grant approval or remote loading', () => {
  for (const variant of ['data', 'scoring', 'bundle']) {
    const svg = readFileSync(`public/branding/badges/screener-${variant}-blueprint.svg`, 'utf8');
    for (const family of families) {
      assert.ok(svg.includes(`fill="${tokens.color.universe[family].$value}"`), variant + ' lacks ' + family);
    }
    assert.doesNotMatch(svg, /<script|<foreignObject|<image\\b|(?:href|src)=["']https?:/i);
  }
});
