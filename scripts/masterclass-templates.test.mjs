import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CAPITAL_AI_MASTERCLASS_EPISODES,
  createCapitalAiMasterclassChapterIntroProject,
} from '../src/platform/SocialMediaEngine/Editing/MediaStudioTemplates.ts';
import { validateMediaProjectV2 } from '../src/platform/SocialMediaEngine/Contracts/MediaProjectValidation.ts';

test('all four Chartanalyse Masterclass intros use the same first-party Media Studio contract', () => {
  assert.equal(CAPITAL_AI_MASTERCLASS_EPISODES.length, 4);
  const ids = new Set();
  for (const chapter of [1, 2, 3, 4]) {
    const template = createCapitalAiMasterclassChapterIntroProject(chapter);
    const check = validateMediaProjectV2(template);
    assert.equal(check.ok, true, JSON.stringify(check.errors));
    assert.equal(template.canvas.width, 1920);
    assert.equal(template.canvas.height, 1080);
    assert.equal(template.durationFrames, 270);
    assert.equal(template.renderRecipe.templateId, 'capital-ai-masterclass-chapter-intro');
    assert.equal(template.renderRecipe.templateVersion, '2.0.0');
    assert.equal(template.renderRecipe.publishReady, false);
    assert.equal(template.renderRecipe.networkPolicy, 'offline');
    assert.equal(template.metadata.draftOnly, true);
    assert.equal(template.metadata.audioStatus, 'REVIEW_REQUIRED');
    assert.equal(template.metadata.website, 'https://capital-ai.online');
    assert.match(template.tracks[0].layers[0].body, /https:\/\/capital-ai\.online/);
    assert.match(template.tracks[0].layers[0].disclaimer, /Keine Anlageberatung/);
    ids.add(template.projectId);
  }
  assert.equal(ids.size, 4);
});

test('Masterclass chapter generation fails closed for unsupported chapters', () => {
  assert.throws(() => createCapitalAiMasterclassChapterIntroProject(5), /Invalid masterclass chapter/);
});
