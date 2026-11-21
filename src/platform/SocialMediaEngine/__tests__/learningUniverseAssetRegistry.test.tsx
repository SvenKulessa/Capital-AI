import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { NewsDesignCatalog } from '../../../features/pricing/NewsDesignCatalog';
import { BRAND_COLORS } from '../../../../shared/hub-branding.mjs';
import { importMediaKitV5Draft } from '../Editing/MediaKitV5Import';
import {
  LEARNING_UNIVERSE_ASSETS, LEARNING_UNIVERSE_ASSET_SCHEMA,
  canPreviewLearningUniverseAsset, catalogueLearningUniverseAssets,
  buildLearningUniverseMediaKitV5Manifest,
} from '../Branding/learningUniverseAssetRegistry.mjs';

test('ten first-party SVGs have byte-verified SHA-256 and canonical seven-color accents', () => {
  assert.equal(LEARNING_UNIVERSE_ASSET_SCHEMA, 'CAPITAL_AI_LEARNING_UNIVERSE_ASSETS@1');
  assert.equal(LEARNING_UNIVERSE_ASSETS.length, 10);
  assert.equal(new Set(LEARNING_UNIVERSE_ASSETS.map(asset => asset.id)).size, 10);
  assert.equal(new Set(LEARNING_UNIVERSE_ASSETS.map(asset => asset.sha256)).size, 10);
  assert.deepEqual(catalogueLearningUniverseAssets(), LEARNING_UNIVERSE_ASSETS);
  const palette = new Set<string>(Object.values(BRAND_COLORS));
  for (const asset of LEARNING_UNIVERSE_ASSETS) {
    const bytes = readFileSync(new URL('../../../../' + asset.repositoryPath, import.meta.url));
    const svg = bytes.toString('utf8');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, asset.id);
    assert.equal(bytes.byteLength, asset.bytes, asset.id);
    assert.ok(palette.has(asset.accent), asset.id);
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.ok((svg.match(/<path /g) ?? []).length >= 3, asset.id);
    assert.doesNotMatch(svg, /<script|<foreignObject|onload=|onerror=|https?:\/\/(?!www\.w3\.org)|<image\b|javascript:|data:|href=/i);
    assert.match(asset.publicUrl, /^\/branding\/learning-universe\/[a-z]+\.svg$/);
    assert.equal(asset.origin, 'GENERATED');
    assert.equal(asset.mediaKitReview, 'REVIEW_REQUIRED');
    assert.equal(asset.thirdPartyRedistribution, 'NOT_PROVEN');
    assert.equal(asset.publishApproval, false);
  }
});

test('untrusted, altered, license-spoofed and foreign assets never become catalogue previews', () => {
  const original = LEARNING_UNIVERSE_ASSETS[0];
  assert.equal(canPreviewLearningUniverseAsset(original), true);
  for (const spoofed of [
    { ...original, sha256: '0'.repeat(64) },
    { ...original, thirdPartyRedistribution: 'VERIFIED' },
    { ...original, cataloguePreview: 'APPROVED' },
    { ...original, publishApproval: true },
    { ...original, publicUrl: 'https://attacker.invalid/a.svg' },
    { ...original, id: 'foreign-illustration' },
    null,
  ]) assert.equal(canPreviewLearningUniverseAsset(spoofed), false);
});

test('MediaKit v5 receives only unapproved asset references, without publisher or license authority', () => {
  const manifest = buildLearningUniverseMediaKitV5Manifest();
  assert.equal(manifest.assets.length, 10);
  const draft = importMediaKitV5Draft(manifest);
  assert.equal(draft.publicationState, 'DRAFT_ONLY');
  assert.equal(draft.publicationApproval, false);
  assert.equal(draft.publicPublishAllowed, false);
  assert.deepEqual(draft.approvals, []);
  assert.deepEqual(draft.deliveries, []);
  assert.equal(draft.project.renderRecipe.publishReady, false);
  assert.equal(draft.project.renderRecipe.networkPolicy, 'offline');
  for (const a of draft.reviewAssets) {
    assert.equal(a.sourceRights.assessed, 'NOT_PROVEN');
    assert.equal(a.mediaRights.assessed, 'NOT_PROVEN');
    assert.equal(a.identityStatus, 'NOT_PROVEN');
    assert.equal(a.reviewStatus, 'REVIEW_REQUIRED');
  }
  const injected = structuredClone(manifest);
  Object.assign(injected.assets[0], { approvalRef: 'fake-owner-approval' });
  assert.throws(() => importMediaKitV5Draft(injected), /MEDIAKIT_V5_ASSET_FIELDS_INVALID/);
});

test('existing News Design Catalogue contains ten previews but offers no invented separate licenses', () => {
  const html = renderToStaticMarkup(<NewsDesignCatalog />);
  assert.match(html, /data-learning-universe-catalogue="first-party-preview"/);
  assert.equal((html.match(/data-learning-catalogue-asset=/g) ?? []).length, 10);
  for (const a of LEARNING_UNIVERSE_ASSETS) {
    assert.ok(html.includes(a.publicUrl), a.id);
    assert.ok(html.includes(a.sha256.slice(0, 16)), a.id);
  }
  assert.match(html, /Keine separate Verkaufs-, Weitergabe- oder Publishing-Lizenz/);
  assert.doesNotMatch(html, /price_[A-Za-z0-9]|\/api\/social\/publish|checkout-session/i);
});
