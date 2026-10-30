import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BRAND_GLOBE, brandGlobePose } from '../Visualization/BrandGlobeSpec';
import { createBrandGlobeGeometry } from '../Visualization/BrandGlobeRenderer';
import { BrandGlobe } from '../../../components/BrandGlobe';
import { createCapitalAiLandingBlueprintVideoProject } from '../Editing/MediaStudioTemplates';

test('sphere has real depth and valid branded UVs on both hemispheres', () => {
  const geometry = createBrandGlobeGeometry();
  const positions = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  let front = 0;
  let back = 0;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    assert.ok(Math.abs(Math.hypot(x, y, z) - 1) < 1e-6);
    assert.ok(uv.getX(i) >= 0 && uv.getX(i) <= 1);
    assert.ok(uv.getY(i) >= 0 && uv.getY(i) <= 1);
    if (z > .9) front++;
    if (z < -.9) back++;
  }
  assert.ok(front > 0 && back > 0, 'a flat image plane cannot satisfy this test');
  geometry.dispose();
});

test('a complete 90-second revolution is deterministic; invalid clocks fail', () => {
  assert.equal(brandGlobePose(0).earthY, 0);
  assert.equal(brandGlobePose(45).earthY, Math.PI);
  assert.equal(brandGlobePose(90).earthY, Math.PI * 2);
  assert.deepEqual(brandGlobePose(12), brandGlobePose(12));
  for (const invalid of [-1, NaN, Infinity]) assert.throws(() => brandGlobePose(invalid), RangeError);
});

test('SSR and no-JS keep the owner artwork visible and decorative', () => {
  const html = renderToStaticMarkup(<BrandGlobe paused={false} />);
  assert.match(html, /data-globe-state="poster"/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /opacity:1/);
  assert.ok(html.includes(BRAND_GLOBE.asset));
});

test('Social project and homepage share exact local artwork identity without publishing authority', () => {
  const project = createCapitalAiLandingBlueprintVideoProject();
  const asset = project.assets.find(asset => asset.id === 'landing-earth-reference');
  assert.equal(asset?.reference, `public${BRAND_GLOBE.asset}`);
  assert.equal(asset?.sha256, BRAND_GLOBE.assetSha256);
  const bytes = readFileSync(`public${BRAND_GLOBE.asset}`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), asset?.sha256);
  assert.equal(project.renderRecipe.publishReady, false);
  assert.equal(project.renderRecipe.networkPolicy, 'offline');
});
